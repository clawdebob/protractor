let SpecReporter = require('jasmine-spec-reporter').SpecReporter;

exports.config = {
    specs: ['playground.js'],
    onPrepare: function () {
        jasmine.getEnv().addReporter(new SpecReporter({
            spec: {
                displayStacktrace: true
            }
        }));
    }
};
