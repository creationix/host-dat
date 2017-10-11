#!/usr/bin/env node
const express = require('express')
const morgan = require('morgan')
const autoDat = require('./auto-dat')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'

let app = express()

app.use(morgan('dev'))

app.use(autoDat(host))

app.get('/', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <title>Dat Gateway</title>
      </head>
      <body>
        <h1>Dat Gateway</h1>
        <form>
          <label>Enter Dat URL or hex
            <input type="url" name="dat">
          </label>
          <input type="submit">
        </form>
        <script>
          navigator.registerProtocolHandler(
            'dat',
            'http://${host}:${port}/?dat=%s',
            'Date Gateway Handler'
          )
        </script>
      </body>
    </html>
  `)
})

app.listen({port, host}, function () {
  console.log(`Server listening on http://${host}${port === 80 ? '' : ':' + port}/`)
})
