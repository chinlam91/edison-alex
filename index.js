const express = require('express')
const app = express()
const fs = require('fs')
const _ = require('lodash')
const settings = require('./settings.json')
const eldict = settings.elements
const logger = require('log4js').getLogger()
const webdriver = require('selenium-webdriver')
const By = webdriver.By
const until = webdriver.until
const driver = new webdriver.Builder().forBrowser('firefox').build()

logger.setLevel(settings.loglevel)

const merchants = fs.readFileSync(settings.merchantData.file, 'utf8').split(new RegExp(settings.merchantData.separator, 'i'))

function login(username, password) {
  driver.get('http://www.instagram.com/')
  const loginButton = driver.wait(until.elementLocated(By.css(eldict.loginButton)), 10000)
  loginButton.click()
  const usernameInput = driver.wait(until.elementLocated(By.name('username')), 2000)
  usernameInput.sendKeys(username)
  driver.findElement(By.name('password')).sendKeys(password)
  logger.trace(`Logging in as ${username}`)
  driver.findElement(By.css(eldict.loginSubmit)).click()
  driver.wait(until.elementLocated(By.css(eldict.afterLogin)), 10000)
}

function saveFollowers(data) {
  data = _.compact(data)
  if ( ! data.length) {
    return false
  }
  logger.debug(`Saving ${data.length} follower records.`)
  fs.appendFileSync(settings.followerData.file, data.join(settings.followerData.separator))
  fs.appendFileSync(settings.followerData.file, settings.followerData.separator)
}

function scanFollowers(mercIndex, followerIndex = 5) {
  logger.debug(`Follower index at ${followerIndex}`)

  if (followerIndex <= 0) {
    scanMerchants(mercIndex+1)
    return false
  }
  driver.executeAsyncScript(function() {
    const followerDialog = document.getElementsByClassName(arguments[1]).item(0)
    const callback = arguments[arguments.length - 1]
    const curIdx = arguments[0]
    const folLine = arguments[2], folName = arguments[3], folBtn = arguments[4]
    const prevHeight = followerDialog.scrollHeight
    setTimeout(function() {
      followerDialog.scrollTo(0, followerDialog.scrollHeight)
      setTimeout(function() {
        const nextHeight = followerDialog.scrollHeight
        const folnames = Array.from(document.getElementsByClassName(folLine)).map(el => {
          if (el.getElementsByClassName(folBtn).length) {
            return el.getElementsByClassName(folName).item(0).innerHTML
          }
          return false
        })
        if (prevHeight < nextHeight && (curIdx-1)) {
          return callback(`${curIdx-1}`)
        }
        folnames.push(0)
        return callback(folnames.join(','))
      }, 1000)
    }, 1000)
  }, followerIndex, 
    eldict.followersDialog,
    eldict.followerLine, 
    eldict.followerName,
    eldict.followButton).then(folNames => {
    folNames = folNames.split(',')
    const fIdx = folNames[folNames.length - 1]
    if (fIdx == 0) {
      saveFollowers(folNames.slice(0, folNames.length-1))
    }
    return scanFollowers(mercIndex, fIdx)
  })
}

function scanMerchants(mercIndex = 0) {
  const merchant = merchants[mercIndex]

  if ( ! merchant) {
    // End of merchant list
    logger.info('Merchant list is empty.')
    return false
  }

  driver.get(`http://www.instagram.com/${merchant}`)
  
  driver.findElement(By.css(`${eldict.followersLink}[href="/${merchant}/followers/"]`)).then(webElement => {
    logger.info(`Merchant ${merchant} found, continuing...`)
    webElement.click()
    let dialog = driver.wait(until.elementLocated(By.css(eldict.followerRow)), 10000)
    scanFollowers(mercIndex)
  }, err => {
    // Merchant not found, empty profile
    logger.warn(`Merchant ${merchant} not found!`)
    scanMerchants(mercIndex+1)
  })
}

login(settings.account.username, settings.account.password)
scanMerchants()
