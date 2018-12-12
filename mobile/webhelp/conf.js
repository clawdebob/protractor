exports.config = {
  getPageTimeout: 30000,
  allScriptsTimeout: 30000,
  framework: 'jasmine2',
  jasmineNodeOpts: { defaultTimeoutInterval: 30000 },
  rootElement: 'keenetic',
  seleniumAddress: 'http://localhost:4723/wd/hub',
  capabilities: {
    browserName: 'chrome',
    platformName: 'Android',
    deviceName: 'Android Emulator',
  },
  /*capabilities: {
    browserName: 'chrome',
    platformName: 'Android',
    platformVersion: '7.0',
    deviceName: 'Android Emulator',
  },*/
//baseUrl: 'http://10.0.2.2:8000',
  specs: ['hints_test_mobile.js'],
  onPrepare: function(){
    browser.get('http://192.168.1.1');
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
    browser.driver.wait(function () {
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
    }, 10000);
  }
};
