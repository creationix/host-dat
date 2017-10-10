const hyperdrive = require('hyperdrive')
const swarm = require('hyperdiscovery')
const hyperdriveHttp = require('hyperdrive-http')
const ram = require('random-access-memory')
const { encode, decode } = require('base32')
const { E, M } = require('promisey')

const CACHE_LIFETIME = 1000 * 10
const CLEANUP_INTERVAL = 1000

let sites = {}

let ramStorage = name => ram()

async function getSite (key) {
  let site = sites[key]
  if (!site) {
    let binKey = Buffer.from(decode(key), 'binary')
    let archive = hyperdrive(ramStorage, binKey, {
      sparse: true,
      sparseMetadata: true
    })
    await E(archive, 'ready')
    let sw = swarm(archive, { live: true })
    await M(archive.metadata, 'update')
    let handler = hyperdriveHttp(archive, {
      exposeHeaders: true,
      live: true,
      footer: `<a href="dat://${binKey.toString('hex')}/">Also available over DAT protocol</a>`
    })
    site = sites[key] = { archive, handler, sw, key }
    console.log(key, 'NEW')
  }
  site.atime = Date.now()
  return site
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
    console.log(key, 'OLD')
  }
}, CLEANUP_INTERVAL)

module.exports = function (domain) {
  let domainPattern = new RegExp(`^([0-9a-z]{52}).${domain}$`)
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
    getSite(match[1]).then(site => {
      site.handler(req, res)
    }).catch(next)
  }
}
