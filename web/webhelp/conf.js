let SpecReporter = require('jasmine-spec-reporter').SpecReporter;
exports.config = {
    getPageTimeout: 30000,
    allScriptsTimeout: 30000,
    framework: 'jasmine2',
    jasmineNodeOpts: {defaultTimeoutInterval: 30000},
    rootElement: 'keenetic',
    capabilities: {
        browserName: 'chrome',
        chromeOptions: { args: [
            '--headless',
            '--disable-gpu',
            '--window-size=800,600',
            '--disable-browser-side-navigation'
            ]
        }
    },
    specs: ['hints_test.js'],
    onPrepare: () => {
        jasmine.getEnv().addReporter(new SpecReporter({
            spec: {
                displayStacktrace: true
            }
        }));
        browser.get('http://localhost:3000');
        browser.driver.manage().deleteAllCookies();
        let until = protractor.ExpectedConditions,
        login = element(by.xpath('//input[@name="loginLogin"]')),
        password = element(by.xpath('//input[@name="loginPassword"]')),
        submit = element(by.tagName('button')),
        lang = element(by.xpath('//div[@id="sb-1"]/a'));
        browser.driver.wait(() => {
              browser.wait(until.visibilityOf(login), 10000,'login input field wasn\'t found');
              return login;
        }).then(() => {
            login.clear().sendKeys('admin');
        });
        browser.driver.wait(() => {
            browser.wait(until.visibilityOf(password), 10000,'password input field wasn\'t found');
            return password;
        }).then(() => {
            password.clear().sendKeys('1');
        });
        /*browser.driver.wait(function () {
            browser.wait(until.visibilityOf(lang), 10000, "language select menu wasn't found");
            return lang;
        }).then(function(el){
            el.click();
            element(by.linkText('Русский')).click()
        });*/
        submit.click();
        return browser.driver.wait(() => {
            return browser.driver.getCurrentUrl().then((url) => {
                return /dashboard/.test(url);
            });
        }, 10000);
    }
};
