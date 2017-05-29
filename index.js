const express = require('express')
const app = express()
const IGDriver = require('./IGDriver').default

const example = new IGDriver('momo.ootd', 'alexedison')
example.login()
example.scanMerchants()
