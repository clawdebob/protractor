exports.config = {
//  seleniumAddress: 'http://localhost:4444/wd/hub',
  getPageTimeout: 30000,
  allScriptsTimeout: 30000,
  framework: 'jasmine2',
  jasmineNodeOpts: { defaultTimeoutInterval: 30000 },
  /*onPrepare: function() {
     // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
     jasmine.getEnv().addReporter(new HtmlReporter({
        baseDirectory: './reports/screenshots'
     }).getJasmine2Reporter());
  },*/
  rootElement: 'keenetic',
  capabilities: {
    browserName: 'chrome',
    chromeOptions: { args: [
      //"lang=en-EN",
      //"--headless",
      //"--disable-gpu",
      "--window-size=800,600",
      "--disable-browser-side-navigation"]
    }
  },
  specs: ['hints_test.js'],
  onPrepare: function(){
    browser.get('http://192.168.1.1');
    var until = protractor.ExpectedConditions;
    var login = element(by.xpath('//input[@name="loginLogin"]'));
    var password = element(by.xpath('//input[@name="loginPassword"]'));
    var submit = element(by.tagName('button'));
    var lang = element(by.xpath('//div[@id="sb-1"]/a'));
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
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(lang), 10000);
      return lang;
    }).then(function(el){
      el.click();
      element(by.linkText('English')).click()
    });
    submit.click();
    return browser.driver.wait(function() {
      return browser.driver.getCurrentUrl().then(function(url) {
        return /dashboard/.test(url);
      });
    }, 10000);
  }
};
