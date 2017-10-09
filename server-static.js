#!/usr/bin/env node
const express = require('express')
const morgan = require('morgan')
const auth = require('basic-auth')
const datRoute = require('./dat-route')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'
const username = process.env.USERNAME || 'admin'
const password = process.env.PASSWORD || 'daplierocks'

let app = express()

app.use(morgan('dev'))

app.use('/exploder/', datRoute(
  'dat://d13556ea04ee14fd560e456b438153a8ed089efc997118d547f61179e7617448'))

app.use('/conquest/', datRoute(
  'dat://b1fd8e1d7eb4f85ecf619a149d7105ae1dd27921c12d3049b932115b52f37d81'))

app.use('/isos/', datRoute(
  'dat://1eb828a5eddfd6f84fb0d40cd217071798c5ff8a92ce9606b0551d312a31aa1e'))

app.use('/music/', requireLogin, datRoute(
  'dat://***'))

app.use('/movies/', requireLogin, datRoute(
  'dat://***'))

app.get('/', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Dat Test</title>
      </head>
      <body>
        <h1>Dat Test</h1>
        <p>Click on one of the following urls to load a mounted dat site:</p>
        <ul>
          <li><a href="/exploder/">Exploder</a></li>
          <li><a href="/conquest/">Conquest</a></li>
          <li><a href="/isos/">ISOs</a></li>
          <li><a href="/music/">Music*</a></li>
          <li><a href="/movies/">Movies*</a></li>
        </ul>
        <p>* Requires authentication</p>
      </body>
    </html>
  `)
})

app.listen({port, host}, function () {
  console.log(`Server listening on http://${host}${port === 80 ? '' : ':' + port}/`)
})

function requireLogin (req, res, next) {
  let credentials = auth(req)
  if (credentials && credentials.name === username && credentials.pass === password) {
    return next()
  }
  res.statusCode = 401
  res.setHeader('WWW-Authenticate', 'Basic realm="media files"')
  res.end('Access denied')
}
