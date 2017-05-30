const Promise = require('bluebird')
const logger = require('log4js').getLogger()
const webdriver = require('selenium-webdriver')
const {NoSuchElementError, TimeoutError} = webdriver.error
const By = webdriver.By
const until = webdriver.until
const {app: {loglevel: loglevel}, elements} = require('./settings.json')

const IGStorage = require('./IGStorage').default

logger.setLevel(loglevel)

module.exports.default = class IGDriver {

  /**
   * IGDriver Constructor
   * @param {string} username Account username
   * @param {string} password Account password
   * @param {string} browser Defaults to "firefox"
   * @param {boolean} clean Whether to clean previous follower data. Defaults to false.
   */
  constructor(username, password, browser = 'firefox', clean = false) {
    this.driver = new webdriver.Builder().forBrowser(browser).build()
    this.storage = new IGStorage('./data-list.txt', `${username}_tofollow.txt`)
    if (clean) this.storage.cleanFollowers()
    this.username = username
    this.password = password
    this.merchants = this.storage.getMerchants()
  }

  login() {
    return this.driver.get('http://www.instagram.com/')
      .then(() => this.driver.wait(until.elementLocated(By.css(elements.loginButton)), 10000))
      .then(loginButton => loginButton.click())
      .then(() => this.driver.wait(until.elementLocated(By.name('username')), 2000))
      .then(usernameInput => usernameInput.sendKeys(this.username))
      .then(() => this.driver.findElement(By.name('password')))
      .then(passwordInput => passwordInput.sendKeys(this.password))
      .then(() => this.driver.findElement(By.css(elements.loginSubmit)).click())
      .then(() => {
        logger.trace(`Logging in as ${this.username}`)
        return this.driver.wait(until.elementLocated(By.css(elements.afterLogin)), 10000)
      })
      .catch(err => {
        logger.error(`Login as ${this.username} failed. Aborting...`)
      })
  }

  scanMerchant(merchant) {
    const that = this
    return Promise.try(function() {
      if ( ! merchant) {
        // End of merchant list
        logger.info('Merchant list is empty.')
        return false
      }

      return that.driver.get(`http://www.instagram.com/${merchant}`)
        .then(() => that.driver.findElement(By.css(`${elements.followersLink}[href="/${merchant}/followers/"]`)))
        .then(webElement => {
          logger.info(`Merchant ${merchant} found, continuing...`)
          return webElement.click()
        })
        .catch(err => {
          throw err.name == 'NoSuchElementError' ? new NoSuchElementError(`Merchant ${merchant} not found!`) : err
        })
        .then(() => that.driver.wait(until.elementLocated(By.css(elements.followerRow)), 10000))
        .then(() => that.driver.findElement(By.css(`${elements.followersLink}[href="/${merchant}/followers/"] > .${elements.followerNumber}`)).getText())
        .then(folcount => that.scanFollowers(merchant, folcount))
        .catch(err => {
          throw err.name == 'TimeoutError' ? new TimeoutError('No Popup displayed within timeout limit.') : err
        })
    })
    .then(() => true)
    .catch(err => {
      logger.warn(err.message)
      return false
    })
  }

  scanFollowers(merchant, folcount) {
    return this.driver.executeAsyncScript(function() {
      const followerDialog = document.getElementsByClassName(arguments[0]).item(0)
      const callback = arguments[arguments.length - 1]
      const folLine = arguments[1],
        folName = arguments[2],
        folBtn = arguments[3]
      const prevHeight = followerDialog.scrollHeight

      // Scrolling down
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          followerDialog.scrollTo(0, followerDialog.scrollHeight)
          return resolve()
        }, 400)
      })
      .then(function() {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            const nextHeight = followerDialog.scrollHeight
            if (prevHeight < nextHeight) {
              return reject('Not Finished!')
            }
            return resolve()
          }, 500)
      })})
      .then(() => {
        const folnames = Array.from(document.getElementsByClassName(folLine)).map(el => {
          if (el.getElementsByClassName(folBtn).length) {
            return el.getElementsByClassName(folName).item(0).innerHTML
          }
          return null
        })
        return callback(folnames.join(','))
      })
      .catch(err => {
        const folnames = Array.from(document.getElementsByClassName(folLine)).reduce((acc, el) => {
          return ++acc
        }, 0)
        return callback(folnames)
      })
    },elements.followersDialog,
      elements.followerLine,
      elements.followerName,
      elements.followButtonWindow)
    .then(folNames => {
      if (typeof folNames == 'string') {
        folNames = folNames.split(',')
        this.storage.saveFollowers(folNames)
        return true
      }
      logger.trace(`Scrolling Down.. Found ${folNames}/${folcount} records.`)
      return this.scanFollowers(merchant, folcount)
    })
    .catch(err => {
      logger.error('Scanning Followers encountered an error.')
      console.error(err)
      return false
    })
  }

  scanMerchants() {
    const that = this
    return Promise.each(this.merchants.map(el => that.scanMerchant(el)), function(val, idx, len) {
      if (val) {
        logger.info('Finished scanning followers.')
      } else {
        logger.info('Aborting followers scan.')
      }
    }).then(() => that.storage.uniqFollowers())
  }
}