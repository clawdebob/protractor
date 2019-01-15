let SpecReporter = require('jasmine-spec-reporter').SpecReporter;

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
            "--window-size=800,600"
            //"--disable-browser-side-navigation"
        ]
        }
    },
    specs: ['search_test.js'],
    onPrepare: function () {
        jasmine.getEnv().addReporter(new SpecReporter({
            spec: {
                displayStacktrace: true
            }
        }));
    }
};
