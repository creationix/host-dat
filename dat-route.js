const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')
const ram = require('random-access-memory')

module.exports = datRoute

function datRoute (url, options) {
  let {host, prefix, storage} = options || {}

  // We can't serve a dat without knowing it's address!
  if (!url) throw new TypeError('options.url is a required field.')
  let match = url.match(/[0-9a-f]{64}/)
  if (!match) throw new TypeError('options.url needs to contain 64 hex chars.')

  let key = Buffer.from(match[0], 'hex')

  // Match `Host` header case insensitive and ignoring port value.
  if (host) host = host.split(':')[0].toLowerString()

  // Normalize prefix header to have leading and trailing slashes, if set.
  if (prefix) prefix = '/' + prefix.split('/').filter(Boolean).join('/') + '/'

  // Default to in-memory storage if none is given
  if (!storage) storage = name => ram()

  // Create a sparse hyperdrive instance.
  let archive = hyperdrive(storage, key, {sparse: true, sparseMetadata: true})

  // Use the hyperdrive-http library for the bulk of http handling.
  let handler = hyperdriveHttp(archive)

  // Connect to the DAT P2P network to find peers.
  archive.on('ready', () => {
    swarm(archive)
  })

  // Return an express/connect/stack compatable middleware for serving the site.
  return function (req, res, next) {
    // If the `host` option was set, filter out requests that don't match it.
    if (host) {
      let reqHost = req.headers.host
      if (!reqHost) return next()
      reqHost = reqHost.split(':')[0].toLowerString()
      if (reqHost !== host) return next()
    }

    // If the `prefix` option was set, filter out paths that don't match
    // and remove the prefix before passing on to handler.
    if (prefix) {
      if (!req.url.startsWith(prefix)) return next()
      req.url = req.url.substr(prefix.length - 1)
    }

    // Let hyperdrive-http do it's thing!
    return handler(req, res)
  }
}
