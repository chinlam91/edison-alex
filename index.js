let express = require('express')
let app = express()
let webdriver = require('selenium-webdriver')
let By = webdriver.By
let until = webdriver.until

let credentials = {
  username: 'arkyria',
  password: new Buffer('ZGFya3NsYXllcg==', 'base64').toString('ascii')
}

let merchants = ['arkyria']

let driver = new webdriver.Builder().forBrowser('firefox').build()
function login() {
  driver.get('http://www.instagram.com/')
  let loginButton = driver.wait(until.elementLocated(By.css('._fcn8k')), 10000)
  loginButton.click()
  let usernameInput = driver.wait(until.elementLocated(By.name('username')), 2000)
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
    }, 500)
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
