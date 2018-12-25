exports.config = {
  getPageTimeout: 30000,
  allScriptsTimeout: 30000,
  framework: 'jasmine2',
  jasmineNodeOpts: { defaultTimeoutInterval: 30000 },
  rootElement: 'keenetic',
  capabilities: {
    browserName: 'chrome',
    chromeOptions: { args: [
      //"--headless",
      //"--disable-gpu",
      "--window-size=800,600",
      //"--disable-browser-side-navigation"
    ]
    }
  },
  specs: ['smoke.js'],
  onPrepare: function(){
    /*browser.get('http://localhost:3000');
    browser.driver.manage().deleteAllCookies();
    var until = protractor.ExpectedConditions;
    var login = element(by.xpath('//input[@name="loginLogin"]'));
    var password = element(by.xpath('//input[@name="loginPassword"]'));
    var submit = element(by.tagName('button'));
    var lang = element(by.xpath('//div[@id="sb-1"]/a'));
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(login), 10000,"login input field wasn't found");
      return login;
    }).then(function(){
      login.clear().sendKeys('admin');
    });
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(password), 10000,"password input field wasn't found");
      return password;
    }).then(function(){
      password.clear().sendKeys('1');
    });
    /*browser.driver.wait(function () {
      browser.wait(until.visibilityOf(lang), 10000, "language select menu wasn't found");
      return lang;
    }).then(function(el){
      el.click();
      element(by.linkText('Русский')).click()
    });
    submit.click();
    return browser.driver.wait(function() {
      return browser.driver.getCurrentUrl().then(function(url) {
        return /dashboard/.test(url);
      });
  }, 10000);*/
  }
};
