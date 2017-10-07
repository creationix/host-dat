const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')
const ram = require('random-access-memory')

const CACHE_LIFETIME = 1000 * 60
const CLEANUP_INTERVAL = 1000

let sites = {}

function getSite (key, callback) {
  let site = sites[key]
  if (site) {
    site.atime = Date.now()
    return callback(null, site)
  }

  let archive = hyperdrive(name => ram(), Buffer.from(key, 'hex'), {
    sparse: true,
    sparseMetadata: true
  })
  console.log(`dat://${key}/ NEW`)
  archive.on('ready', () => {
    console.log(`dat://${key}/ READY`)
    let sw = swarm(archive)
    // archive.metadata.on('sync', () => {
      // console.log(`dat://${key}/ SYNC`)
    let handler = hyperdriveHttp(archive)
    let atime = Date.now()
    site = sites[key] = { archive, handler, sw, key, atime }
    callback(null, site)
    // })
  })
}

// Cleanup sites that have been expired
setInterval(() => {
  let cutoff = Date.now() - CACHE_LIFETIME
  for (let key of Object.keys(sites)) {
    let site = sites[key]
    if (site.atime > cutoff) continue
    delete sites[key]
    site.sw.close()
    site.archive.close()
    console.log(`dat://${key}/ EXPIRE`)
  }
}, CLEANUP_INTERVAL)

module.exports = function (req, res, next) {
  // Try to match on subdomain prefix first
  let host = req.headers.host
  let match = host && host.match(/^([0-9a-f]{62})\.([0-9a-f]{2})\./)
  if (match) {
    match = [null, match[1] + match[2]]
  } else {
    // If that doesn't work, try to match on path prefix
    match = req.url.match(/^\/([0-9a-f]{64})\//)
    if (!match) return next()
    // And remove the prefix before passing on.
    req.url = req.url.replace('/' + match[1], '')
  }
  getSite(match[1], (err, site) => {
    if (err) throw err
    site.handler(req, res)
  })
}
