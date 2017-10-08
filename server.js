const stack = require('stack')
const autoDat = require('./auto-dat')
const { createServer } = require('http')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'

createServer(stack(autoDat(host))).listen(port)
console.log(`Server listening on http://${host}${port === 80 ? '' : ':' + port}/`)
