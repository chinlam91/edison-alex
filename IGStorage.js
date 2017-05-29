const fs = require('fs')
const _ = require('lodash')
const logger = require('log4js').getLogger()
const settings = require('./settings.json')

module.exports.default = class IGStorage {
  constructor(merchantFile, followersFile) {
    this.merchantFile = merchantFile
    this.followersFile = followersFile
    this.merchantData = fs.readFileSync(merchantFile, 'utf8').split(/\r?\n/)
  }

  getMerchants() {
    return this.merchantData
  }

  saveFollowers(data) {
    data = _.compact(data)
    if ( ! data.length) {
      return false
    }
    logger.debug(`Saving ${data.length} follower records.`)
    fs.appendFileSync(this.followersFile, data.join('\r\n')+'\r\n')
  }
}