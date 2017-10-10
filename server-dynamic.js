#!/usr/bin/env node
const express = require('express')
const morgan = require('morgan')
const auth = require('basic-auth')
const { addDat, handleDats } = require('./dat-service')

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'
const username = process.env.USERNAME || 'admin'
const password = process.env.PASSWORD || 'daplierocks'

let app = express()

app.use(morgan('dev'))

app.post('/', requireLogin, express.json(), (req, res, next) => {
  addDat(req.body).catch(next).then(result => {
    res.json(result)
  })
})

app.use(handleDats)

app.listen({port, host}, function () {
  console.log(`Server listening on http://${host}${port === 80 ? '' : ':' + port}/`)
})

function requireLogin (req, res, next) {
  let credentials = auth(req)
  console.log(credentials, {username, password})
  if (credentials && credentials.name === username && credentials.pass === password) {
    return next()
  }
  res.statusCode = 401
  res.setHeader('WWW-Authenticate', 'Basic realm="Dat Admin Panel"')
  res.end('Access denied')
}
