const logger = require('log4js').getLogger()
const webdriver = require('selenium-webdriver')
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
   */
  constructor(username, password, browser = 'firefox') {
    this.driver = new webdriver.Builder().forBrowser(browser).build()
    this.storage = new IGStorage('./data-list.txt', `${username}_tofollow.txt`)
    this.username = username
    this.password = password
    this.merchants = this.storage.getMerchants()
  }

  login() {
    this.driver.get('http://www.instagram.com/')
    const loginButton = this.driver.wait(until.elementLocated(By.css(elements.loginButton)), 10000)
    loginButton.click()
    const usernameInput = this.driver.wait(until.elementLocated(By.name('username')), 2000)
    usernameInput.sendKeys(this.username)
    this.driver.findElement(By.name('password')).sendKeys(this.password)
    logger.trace(`Logging in as ${this.username}`)
    this.driver.findElement(By.css(elements.loginSubmit)).click()
    return this.driver.wait(until.elementLocated(By.css(elements.afterLogin)), 10000)
  }

  scanMerchants(mercIndex = 0) {
    const merchant = this.merchants[mercIndex]

    if ( ! merchant) {
      // End of merchant list
      logger.info('Merchant list is empty.')
      return false
    }

    this.driver.get(`http://www.instagram.com/${merchant}`)
    
    this.driver.findElement(By.css(`${elements.followersLink}[href="/${merchant}/followers/"]`)).then(webElement => {
      logger.info(`Merchant ${merchant} found, continuing...`)
      webElement.click()
      this.driver.wait(until.elementLocated(By.css(elements.followerRow)), 10000).catch(err => {
        logger.error('No Popup is displayed within timeout limit.')
      })
      this.scanFollowers(mercIndex)
    }, err => {
      // Merchant not found, empty profile
      logger.warn(`Merchant ${merchant} not found!`)
      this.scanMerchants(mercIndex+1)
    })
  }

  scanFollowers(mercIndex, followerIndex = 5) {
    logger.debug(`Follower index at ${followerIndex}`)

    if (followerIndex <= 0) {
      this.scanMerchants(mercIndex+1)
      return false
    }
    this.driver.executeAsyncScript(function() {
      const followerDialog = document.getElementsByClassName(arguments[1]).item(0)
      const callback = arguments[arguments.length - 1]
      const curIdx = arguments[0]
      const folLine = arguments[2],
        folName = arguments[3],
        folBtn = arguments[4]
      const prevHeight = followerDialog.scrollHeight
      setTimeout(function() {
        followerDialog.scrollTo(0, followerDialog.scrollHeight)
        setTimeout(function() {
          const nextHeight = followerDialog.scrollHeight
          const folnames = Array.from(document.getElementsByClassName(folLine)).map(el => {
            if (el.getElementsByClassName(folBtn).length) {
              return el.getElementsByClassName(folName).item(0).innerHTML
            }
            return null
          })
          if (prevHeight < nextHeight && (curIdx-1)) {
            return callback(`${curIdx-1}`)
          }
          folnames.push(0)
          return callback(folnames.join(','))
        }, 1000)
      }, 500)
    }, followerIndex,
      elements.followersDialog,
      elements.followerLine,
      elements.followerName,
      elements.followButtonWindow).then(folNames => {
      folNames = folNames.split(',')
      const fIdx = folNames[folNames.length - 1]
      if (fIdx == 0) {
        this.storage.saveFollowers(folNames.slice(0, folNames.length-1))
      }
      return this.scanFollowers(mercIndex, fIdx)
    })
  }
}