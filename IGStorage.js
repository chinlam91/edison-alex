const fs = require('fs')
const _ = require('lodash')
const logger = require('log4js').getLogger()
const settings = require('./settings.json')

module.exports.default = class IGStorage {
  constructor(merchantFile, followersFile) {
    this.merchantFile = merchantFile
    if ( ! fs.existsSync('./followers/')) {
      fs.mkdirSync('./followers/')
    }
    this.followersFile = `./followers/${followersFile}`
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
    return fs.appendFileSync(this.followersFile, data.join('\r\n')+'\r\n')
  }

  uniqFollowers() {
    const data = _.uniq(fs.readFileSync(this.followersFile).split(/\r?\n/))
    return fs.writeFileSync(this.followersFile, data.join('\r\n'))
  }

  cleanFollowers() {
    return fs.writeFileSync(this.followersFile, '')
  }
}