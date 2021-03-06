let SpecReporter = require('jasmine-spec-reporter').SpecReporter;

exports.config = {
  getPageTimeout: 30000,
  allScriptsTimeout: 30000,
  framework: 'jasmine2',
  jasmineNodeOpts: { defaultTimeoutInterval: 120000 },
  rootElement: 'keenetic',
  capabilities: {
    browserName: 'chrome',
    chromeOptions: { args: [
      //"--headless",
      //"--disable-gpu",
      "--window-size=800,600",
      "--disable-browser-side-navigation"]
    }
  },
  baseUrl:'http://localhost:3000',
  specs: ['wi-fi_system_log_test.js'],
  onPrepare: () => {
    jasmine.getEnv().addReporter(new SpecReporter({
      spec: {
        displayStacktrace: true
      }
    }));
    require("protractor-http-mock").config = {
        protractorConfig: "conf.js",
    };
},
mocks: { 
	dir: '../../mock_generator/mocks' // default value: 'mocks'
},
  /*onPrepare: function(){
    browser.get('http://192.168.1.1');
    var until = protractor.ExpectedConditions;
    var login = element(by.xpath('//input[@name="loginLogin"]'));
    var password = element(by.xpath('//input[@name="loginPassword"]'));
    var submit = element(by.tagName('button'));
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(login), 10000);
      return login;
    }).then(function(){
      login.clear().sendKeys('admin');
    });
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(password), 10000);
      return password;
    }).then(function(){
      password.clear().sendKeys('1');
    });
    submit.click();
    return browser.driver.wait(function() {
      return browser.driver.getCurrentUrl().then(function(url) {
        return /dashboard/.test(url);
      });
    }, 10000);
}*/
};
