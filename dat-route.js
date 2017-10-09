const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')
const ram = require('random-access-memory')

module.exports = datRoute

function datRoute (url, options) {
  let {storage} = options || {}

  // We can't serve a dat without knowing it's address!
  if (!url) throw new TypeError('options.url is a required field.')
  let match = url.match(/[0-9a-f]{64}/)
  if (!match) throw new TypeError('options.url needs to contain 64 hex chars.')

  let key = Buffer.from(match[0], 'hex')

  // Default to in-memory storage if none is given
  if (!storage) storage = name => ram()

  // Create a sparse hyperdrive instance.
  let archive = hyperdrive(storage, key, {sparse: true, sparseMetadata: true})

  // Connect to the DAT P2P network to find peers.
  archive.on('ready', () => {
    swarm(archive)
  })

  // Use the hyperdrive-http library for the bulk of http handling.
  return hyperdriveHttp(archive)
}
