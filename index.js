const express = require('express')
const app = express()
const fs = require('fs')
const webdriver = require('selenium-webdriver')
const By = webdriver.By
const until = webdriver.until
const driver = new webdriver.Builder().forBrowser('firefox').build()

// Merchant list
const merchantData = {
  file: './data-list.txt',
  splitBy: /\r?\n/
}

// User account
const credentials = {
  username: 'momo.ootd',
  password: new Buffer('YWxleGVkaXNvbg==', 'base64').toString('ascii')
}

const merchants = fs.readFileSync(merchantData.file, 'utf8').split(merchantData.splitBy)

function login() {
  driver.get('http://www.instagram.com/')
  const loginButton = driver.wait(until.elementLocated(By.css('._fcn8k')), 10000)
  loginButton.click()
  const usernameInput = driver.wait(until.elementLocated(By.name('username')), 2000)
  usernameInput.sendKeys(credentials.username)
  driver.findElement(By.name('password')).sendKeys(credentials.password)
  driver.findElement(By.css('._ah57t._84y62')).click()
  driver.wait(until.elementLocated(By.css('._9x5sw')), 10000)
}

let counter = 5
function scanFollowers() {
  
  driver.executeScript(function() {
    let prevHeight = document.getElementsByClassName('_4gt3b')[0].scrollHeight
    setTimeout(function() {
      document.getElementsByClassName('_4gt3b')[0].scrollTo(0, document.getElementsByClassName('_4gt3b')[0].scrollHeight)
      let nextHeight = document.getElementsByClassName('_4gt3b')[0].scrollHeight
      if (prevHeight < nextHeight && counter) {
        counter--
        scanFollowers()
      }
    }, 1000)
  })
}

function scanMerchants() {
  for (let i in merchants) {
    let merchant = merchants[i]
    driver.get('http://www.instagram.com/'+merchant)
    driver.findElement(By.css('a._s53mj[href="/'+merchant+'/followers/"]')).click()
    let dialog = driver.wait(until.elementLocated(By.css('._cx1ua')), 10000)
    scanFollowers()
  }
}

login()
scanMerchants()
