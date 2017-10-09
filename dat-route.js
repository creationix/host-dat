const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')

module.exports = datRoute

function datRoute (url, options) {
  let {storage} = options || {}

  // We can't serve a dat without knowing it's address!
  if (!url) throw new TypeError('url is required')
  let match = url.match(/[0-9a-f]{64}/)
  if (!match) throw new TypeError('url needs to contain 64 hex chars')
  let hex = match[0]

  let key = Buffer.from(hex, 'hex')

  // Default to in-memory storage if none is given
  if (!storage) storage = process.env.HOME + '/.dat-route/' + match[0]

  // Create a sparse hyperdrive instance.
  let archive = hyperdrive(storage, key, { sparse: true, sparseMetadata: true })

  archive.on('ready', () => {
    // Connect to the DAT P2P network to find peers.
    let sw = swarm(archive, { live: true })

    // Make sure we watch for updates, even in full-sparse mode
    onUpdate()
    function onUpdate () { archive.metadata.update(onUpdate) }

    // Log some interesting events for basic diagnostics
    archive.metadata.on('sync', () => { console.log(url, 'META-SYNC') })
    archive.metadata.on('append', () => { console.log(url, 'META-APPEND') })
    sw.once('peer', () => { console.log(url, 'PEER') })
  })

  // Use the hyperdrive-http library for the bulk of http handling.
  return hyperdriveHttp(archive, {
    exposeHeaders: true,
    live: true,
    footer: `<a href="dat://${hex}/">Also available over DAT protocol</a>`
  })
}
