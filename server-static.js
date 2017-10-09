#!/usr/bin/env node
const express = require('express')
const morgan = require('morgan')
const datRoute = require('./dat-route')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'

let app = express()

app.use(morgan('dev'))

app.use('/exploder/', datRoute(
  'dat://d13556ea04ee14fd560e456b438153a8ed089efc997118d547f61179e7617448/'))

app.use('/conquest/', datRoute(
  'dat://b1fd8e1d7eb4f85ecf619a149d7105ae1dd27921c12d3049b932115b52f37d81/'))

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
        </ul>
      </body>
    </html>
  `)
})

app.listen({port, host}, function () {
  console.log(`Server listening on http://${host}${port === 80 ? '' : ':' + port}/`)
})
