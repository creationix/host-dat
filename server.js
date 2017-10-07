const stack = require('stack')
const autoDat = require('./auto-dat')
const { createServer } = require('http')

const port = process.env.PORT || 8080
createServer(stack(autoDat)).listen(port)
console.log('Server listening on http://localhost:' + port)
