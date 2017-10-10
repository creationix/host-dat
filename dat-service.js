const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')

var dats = []

// Add a dat, routed by host and/or prefix
// resolves when the metadata is synced.
exports.addDat = addDat
async function addDat ({url, host, prefix, storage}) {
  if (!url) throw new TypeError('url is required')
  let match = url.match(/[0-9a-f]{64}/)
  if (!match) throw new TypeError('url needs to contain 64 hex chars')
  let key = match[0]

  if (!storage) storage = process.env.HOME + '/.dat-route/' + key
  if (host) host = host.toLowerCase().split(':')[0]
  if (prefix) prefix = '/' + prefix.split('/').filter(Boolean).join('/') + '/'

  let archive = hyperdrive(storage, key, { sparse: true })

  await new Promise((resolve, reject) => {
    archive.once('error', reject)
    archive.once('ready', resolve)
  })

  let handler = hyperdriveHttp(archive, {
    exposeHeaders: true,
    live: true,
    footer: `<a href="dat://${key}/">Also available over DAT protocol</a>`
  })

  let sw = swarm(archive, { live: true })

  await new Promise(resolve => {
    archive.metadata.on('sync', resolve)
  })

  let dat = {host, prefix, archive, handler, sw}
  dats.push(dat)
  return {host, prefix, key}
}

exports.handleDats = handleDats
function handleDats (req, res, next) {
  let reqHost = req.headers.host
  reqHost = reqHost && reqHost.toLowerCase().split(':')[0]
  for (let {host, prefix, handler} of dats) {
    if (host && reqHost !== host) continue
    if (prefix) {
      if (!req.url.startsWith(prefix)) continue
      req.url = req.url.substr(prefix.length - 1)
    }
    return handler(req, res)
  }
  return next()
}
