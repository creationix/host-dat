const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')
const ram = require('random-access-memory')
const { encode, decode } = require('base32')

const CACHE_LIFETIME = 1000 * 60
const CLEANUP_INTERVAL = 1000

let sites = {}

function getSite (key, callback) {
  console.log('getSite', {key})
  let site = sites[key]
  if (site) {
    site.atime = Date.now()
    return callback(null, site)
  }

  let archive = hyperdrive(name => ram(), decode(key), {
    sparse: true,
    sparseMetadata: true
  })
  console.log(`${key} NEW`)
  archive.on('ready', () => {
    console.log(`${key} READY`)
    let sw = swarm(archive)
    let handler = hyperdriveHttp(archive)
    let atime = Date.now()
    site = sites[key] = { archive, handler, sw, key, atime }
    callback(null, site)
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
    console.log(`${key} EXPIRE`)
  }
}, CLEANUP_INTERVAL)

module.exports = function (domain) {
  let domainPattern = new RegExp(`^([1-9A-HJ-NP-Za-km-z]{43,44}).${domain}$`)
  let pathPattern = new RegExp('^/(?:dat://)?([0-9a-f]{64})(/.*)?$')

  return function (req, res, next) {
    let host = req.headers.host
    let requestDomain = host.split(':')[0]

    // We only care about requests with domains.
    if (!host) return next()

    // If they put in a raw dat url at the main domain, redirect to subdomain
    // using base58 prefix.
    if (requestDomain === domain) {
      let match = req.url.match(pathPattern)
      if (match) {
        let key = encode(Buffer.from(match[1], 'hex'))
        res.writeHead(301, {
          Location: `http://${key}.${host}${match[2] || '/'}`
        })
        res.end('Redirecting to base58 subdomain...\n')
        return
      }
    }

    // If the request is in base58 mode, serve the site
    let match = requestDomain.match(domainPattern)
    if (!match) return next()
    getSite(match[1], (err, site) => {
      if (err) return next(err)
      site.handler(req, res)
    })
  }
}
