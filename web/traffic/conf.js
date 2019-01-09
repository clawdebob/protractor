exports.config = {
  getPageTimeout: 30000,
  allScriptsTimeout: 30000,
  framework: 'jasmine2',
  jasmineNodeOpts: { defaultTimeoutInterval: 30000 },
  rootElement: 'keenetic',
  baseUrl:'http://localhost:3000',
  capabilities: {
    browserName: 'chrome',
    chromeOptions: { args: [
      //"--headless",
      //"--disable-gpu",
      "--window-size=1280,720",
      //"--disable-browser-side-navigation"
    ]
    }
  },
  specs: ['smoke.js'],
};
