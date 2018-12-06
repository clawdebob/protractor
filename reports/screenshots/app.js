var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "6eaeaf979ef3b15a8f0848e58cd0ddf0",
        "instanceId": 13854,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:45:10\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543495462360,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495463702,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495464263,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495466235,
                "type": ""
            }
        ],
        "screenShotFile": "00b800f7-007d-003d-00fb-00fd00cf00d5.png",
        "timestamp": 1543495459428,
        "duration": 10850
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "d61a0f7ff62725aa1e0e28fc842b5aba",
        "instanceId": 14633,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:44:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543495891740,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495892659,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495893016,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495894976,
                "type": ""
            }
        ],
        "screenShotFile": "0032009b-0004-00ae-0080-0003004b0007.png",
        "timestamp": 1543495887607,
        "duration": 9781
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8a85ec5f67ba7f75c05c7a3f9f76a644",
        "instanceId": 15161,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "WebDriverError: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:44:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Timeout.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4283:11)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543495951242,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543495951432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543495981577,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543495983798,
                "type": ""
            }
        ],
        "screenShotFile": "008a0019-00d9-0031-0075-00e300f4008b.png",
        "timestamp": 1543495948294,
        "duration": 40348
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "62724b19a173415dec5e65dc5e75eff1",
        "instanceId": 15698,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: until is not defined",
            "Failed: until is not defined"
        ],
        "trace": [
            "ReferenceError: until is not defined\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:20\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "ReferenceError: until is not defined\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:18)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543496726590,
                "type": ""
            }
        ],
        "screenShotFile": "00af000e-00df-0031-00bd-003e00390038.png",
        "timestamp": 1543496718872,
        "duration": 8174
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "0249b4bd0cf520aafb15687554d62509",
        "instanceId": 15994,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)",
            "Failed: Wait timed out after 10037ms"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "ScriptTimeoutError: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(xpath, //input[@name=\"loginLogin\"])\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "TimeoutError: Wait timed out after 10037ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Timeout.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4283:11)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543496775324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543496805587,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543496806984,
                "type": ""
            }
        ],
        "screenShotFile": "001f0015-0053-0097-0089-00e8001400bb.png",
        "timestamp": 1543496773253,
        "duration": 40056
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "ddcc8df3c0852f69c82177eef4017da4",
        "instanceId": 16260,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)",
            "Failed: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "ScriptTimeoutError: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, *[id=\"ndm_menu_toggle\"])\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:27:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:26:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "ScriptTimeoutError: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(link text, Log)\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Timeout.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4283:11)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543496830498,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543496831002,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543496831554,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543496833796,
                "type": ""
            }
        ],
        "screenShotFile": "00ed007e-001e-0006-0092-00d700560050.png",
        "timestamp": 1543496826035,
        "duration": 67539
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "3e46db02add15da12389fa5447d96578",
        "instanceId": 16661,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:44:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497019241,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497020666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497021134,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497023184,
                "type": ""
            }
        ],
        "screenShotFile": "00ea0021-002f-00fc-00c6-00b900a7000a.png",
        "timestamp": 1543497014528,
        "duration": 12151
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "56745566a42f7e2870f0260987dff675",
        "instanceId": 16939,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "ScriptTimeoutError: script timeout: result was not received in 30 seconds\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(link text, Log)\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/usr/local/lib/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/usr/local/lib/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:39:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497074071,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497075292,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497076071,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497078002,
                "type": ""
            }
        ],
        "screenShotFile": "002e006d-008b-0043-0045-007400b0005a.png",
        "timestamp": 1543497071847,
        "duration": 40819
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "44eb66e66921ad41c3fbe0928331264d",
        "instanceId": 17218,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: invalid element state: Failed to execute 'replace' on 'Location': 'url' is not a valid URL.\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)",
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "InvalidElementStateError: invalid element state: Failed to execute 'replace' on 'Location': 'url' is not a valid URL.\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Protractor.get(url) - reset url\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeScriptWithDescription (/usr/local/lib/node_modules/protractor/built/browser.js:404:28)\n    at driver.controlFlow.execute.then.then.then (/usr/local/lib/node_modules/protractor/built/browser.js:679:25)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (/usr/local/lib/node_modules/protractor/built/browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:43:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:40:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497179981,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497181343,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497181731,
                "type": ""
            }
        ],
        "screenShotFile": "001e00df-00e0-0089-00b9-00b1000000fe.png",
        "timestamp": 1543497177054,
        "duration": 6630
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "7dc0b78c7949eba3232b20f5cd9324f3",
        "instanceId": 17494,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: invalid element state: Failed to execute 'replace' on 'Location': 'url' is not a valid URL.\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)",
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "InvalidElementStateError: invalid element state: Failed to execute 'replace' on 'Location': 'url' is not a valid URL.\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Protractor.get(url) - reset url\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeScriptWithDescription (/usr/local/lib/node_modules/protractor/built/browser.js:404:28)\n    at driver.controlFlow.execute.then.then.then (/usr/local/lib/node_modules/protractor/built/browser.js:679:25)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (/usr/local/lib/node_modules/protractor/built/browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:43:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:40:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497218934,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543497241935,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543497241935,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543497241936,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497242532,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543497242744,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497243908,
                "type": ""
            }
        ],
        "screenShotFile": "00a90068-0048-0035-0014-000300c1004a.png",
        "timestamp": 1543497215361,
        "duration": 29926
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8a2d51c36242efe7129e0e6f6f9f4b2e",
        "instanceId": 17974,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: unhandled inspector error: {\"code\":-32000,\"message\":\"Cannot navigate to invalid URL\"}\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)",
            "Failed: Wait timed out after 10024ms"
        ],
        "trace": [
            "WebDriverError: unknown error: unhandled inspector error: {\"code\":-32000,\"message\":\"Cannot navigate to invalid URL\"}\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebDriver.navigate().to(url)\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at Navigation.to (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:1133:25)\n    at thenableWebDriverProxy.get (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:988:28)\n    at ProtractorBrowser.get (/usr/local/lib/node_modules/protractor/built/browser.js:655:32)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:27:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "TimeoutError: Wait timed out after 10024ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:47:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:43:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497660965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497662241,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497662762,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497664977,
                "type": ""
            }
        ],
        "screenShotFile": "00b5003f-00ba-00b6-0087-008c0000009a.png",
        "timestamp": 1543497657288,
        "duration": 18482
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8be603b75ac00601d87fcb6998b0e234",
        "instanceId": 18264,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:49:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:43:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497738996,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497740129,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497746125,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497748262,
                "type": ""
            }
        ],
        "screenShotFile": "00280006-0048-00ee-006a-007900ab0031.png",
        "timestamp": 1543497736075,
        "duration": 14827
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "3e092e4d0ec3af6055f7d15ce1d191f4",
        "instanceId": 18550,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a class=\"tabs-list__link ng-binding\">...</a> is not clickable at point (181, 277). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:48:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497814558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497816322,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497817078,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497819115,
                "type": ""
            }
        ],
        "screenShotFile": "00770095-00fd-00bf-0053-00c30001002a.png",
        "timestamp": 1543497810478,
        "duration": 14645
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "68e790dc8213eb4cc1d0699cb77880e5",
        "instanceId": 18825,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10012ms",
            "Failed: Wait timed out after 10008ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10012ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "TimeoutError: Wait timed out after 10008ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:46:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497851110,
                "type": ""
            }
        ],
        "screenShotFile": "00c90011-007b-003a-0089-00520095004d.png",
        "timestamp": 1543497846548,
        "duration": 28743
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8cdcee45aa021b03040edb1edd3b6cf3",
        "instanceId": 19100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10000ms",
            "Failed: Wait timed out after 10013ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10000ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)",
            "TimeoutError: Wait timed out after 10013ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:46:13)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:42:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497895998,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543497910195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543497910195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543497910195,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497910195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543497910196,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543497910196,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543497910196,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497910196,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543497910291,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543497910746,
                "type": ""
            }
        ],
        "screenShotFile": "00020091-00c9-00ef-00fd-006600b900bd.png",
        "timestamp": 1543497892318,
        "duration": 27891
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "a529864dc268fcee49d4036ec8a76784",
        "instanceId": 19396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543497969839,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497972100,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497972564,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543497974726,
                "type": ""
            }
        ],
        "screenShotFile": "00d80020-00e1-0047-00d5-008800a0003e.png",
        "timestamp": 1543497966401,
        "duration": 16674
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "79ffa299cf8929318ee05e8136c1b9f5",
        "instanceId": 19863,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498226036,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498226927,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498227290,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498229697,
                "type": ""
            }
        ],
        "screenShotFile": "00060044-0091-00e7-00a4-00c40035000e.png",
        "timestamp": 1543498219297,
        "duration": 16084
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "2ccd4afbfdc23b909d8823784c7887ef",
        "instanceId": 20138,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10580ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10580ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498279475,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498289422,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543498289424,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498289424,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498290056,
                "type": ""
            }
        ],
        "screenShotFile": "00d1006e-00ba-0010-0055-004600e8007a.png",
        "timestamp": 1543498277103,
        "duration": 13439
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "454bced1edc43ec1f199cd9c0f71d3a1",
        "instanceId": 20406,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10016ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10016ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:30:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:29:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498305462,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543498305654,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543498305848,
                "type": ""
            }
        ],
        "screenShotFile": "006700e4-009f-0091-001e-00a6002200bb.png",
        "timestamp": 1543498301235,
        "duration": 17015
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "c0fc81da0f7f528b9511b6f1b7df31c4",
        "instanceId": 20675,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498329755,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543498329959,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498342560,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543498372860,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498374657,
                "type": ""
            }
        ],
        "screenShotFile": "00ca00a8-00c0-0097-00e6-00e000dd0026.png",
        "timestamp": 1543498327962,
        "duration": 54643
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "c14b27cc7329b35f3f7ba37ef3647444",
        "instanceId": 20955,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10010ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10010ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:30:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:29:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498399511,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498399913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498400305,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498402547,
                "type": ""
            }
        ],
        "screenShotFile": "00770098-008a-0038-00c6-00fb0070008e.png",
        "timestamp": 1543498395343,
        "duration": 17217
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "97ed9d6635b9dffb09a64588c5def73c",
        "instanceId": 21221,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10009ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10009ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498423814,
                "type": ""
            }
        ],
        "screenShotFile": "007e00ac-007a-00d5-001f-001d009500b8.png",
        "timestamp": 1543498420210,
        "duration": 13763
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "cf1baebf7d0841d4090ba1be0821185c",
        "instanceId": 21484,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10012ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10012ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498440622,
                "type": ""
            }
        ],
        "screenShotFile": "0002008c-00a2-0009-00a5-009d006500ea.png",
        "timestamp": 1543498438693,
        "duration": 12094
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "aaff75d45adc1bac09ef058f53ce161c",
        "instanceId": 21748,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10010ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10010ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498457306,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498461997,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543498461999,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498461999,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498462477,
                "type": ""
            }
        ],
        "screenShotFile": "00760085-0052-001f-0019-00da00be0082.png",
        "timestamp": 1543498455498,
        "duration": 12195
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "2236a979b133c704eaf83bc9571f9e0a",
        "instanceId": 22012,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10008ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10008ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:30:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:29:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498478239,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498481107,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543498481109,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498481109,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498481732,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543498481856,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543498482072,
                "type": ""
            }
        ],
        "screenShotFile": "00f500c2-0059-00f6-0015-001b00c700bb.png",
        "timestamp": 1543498474985,
        "duration": 19560
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "ef9e753a30b9b66691691a629a9ff54f",
        "instanceId": 22283,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498508008,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498508824,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498509204,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498511395,
                "type": ""
            }
        ],
        "screenShotFile": "00340066-000a-007a-0095-00c2009f00a2.png",
        "timestamp": 1543498504019,
        "duration": 13193
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8e202fed742d4b115680fa9f28785c20",
        "instanceId": 22566,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10005ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10005ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498530869,
                "type": ""
            }
        ],
        "screenShotFile": "00e30023-004c-004f-000d-0031009b0096.png",
        "timestamp": 1543498528791,
        "duration": 12251
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "865ee601a0ab86d82dc8ff9deafe89f1",
        "instanceId": 22827,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10002ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10002ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498551040,
                "type": ""
            }
        ],
        "screenShotFile": "001a002b-00aa-0086-00c6-005c00190054.png",
        "timestamp": 1543498547595,
        "duration": 13599
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "6d18c918ff98060522f7efe86ae6f955",
        "instanceId": 23087,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10011ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10011ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498567965,
                "type": ""
            }
        ],
        "screenShotFile": "0098002b-0056-006e-0041-003c00c400a8.png",
        "timestamp": 1543498565829,
        "duration": 12312
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "5c405f68dd3b5a04ad8d7f9ac2e57b43",
        "instanceId": 23358,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10008ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10008ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498590997,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498594214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543498594216,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543498594216,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498594686,
                "type": ""
            }
        ],
        "screenShotFile": "007400f3-00fa-004e-00ef-00d400a2009c.png",
        "timestamp": 1543498588791,
        "duration": 12404
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "d582f89a730beba018023a29e9199106",
        "instanceId": 23622,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10004ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10004ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498616263,
                "type": ""
            }
        ],
        "screenShotFile": "00ed00c1-0017-0037-00d9-0014008700ac.png",
        "timestamp": 1543498612022,
        "duration": 14398
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "e9be5729703f1eca7ea56bd5fe9fafee",
        "instanceId": 23884,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10004ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10004ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498638024,
                "type": ""
            }
        ],
        "screenShotFile": "00710089-004c-0066-00a1-002000ea003f.png",
        "timestamp": 1543498633775,
        "duration": 14396
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "3dbcba371da375b697e6bc0622892cf0",
        "instanceId": 24154,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543498669853,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498671053,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498671584,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543498673696,
                "type": ""
            }
        ],
        "screenShotFile": "00a600f6-00e6-00f0-002f-00e700930002.png",
        "timestamp": 1543498665711,
        "duration": 16204
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "2061272016b33cae42992c0617506f45",
        "instanceId": 25514,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543501210482,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543501211172,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543501212070,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543501214990,
                "type": ""
            }
        ],
        "screenShotFile": "009400b0-000c-0088-00a4-005700e6001b.png",
        "timestamp": 1543501195758,
        "duration": 27820
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "bc9f1ce0cad8dca71667233e630252b7",
        "instanceId": 25841,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543501408454,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543501409654,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543501413184,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543501417202,
                "type": ""
            }
        ],
        "screenShotFile": "006c00e3-0028-00c6-0013-00020073007c.png",
        "timestamp": 1543501395285,
        "duration": 31839
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "e04ea0c3fa4e1c15ae23aa785e95a8fc",
        "instanceId": 30272,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:46:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503155776,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503157002,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503157503,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503159896,
                "type": ""
            }
        ],
        "screenShotFile": "00e700d5-00c0-00c5-0038-00f5004b0019.png",
        "timestamp": 1543503152529,
        "duration": 11227
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "83ca00ff9378f2834de88e8bddc68dfe",
        "instanceId": 30560,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:46:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503227366,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503228261,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503228600,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503230780,
                "type": ""
            }
        ],
        "screenShotFile": "00f800b3-00b8-006b-00d3-00a2008e00ce.png",
        "timestamp": 1543503225212,
        "duration": 8225
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "27bf2913de26aa542e93d97ff435ae51",
        "instanceId": 30825,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10014ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10014ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503276713,
                "type": ""
            }
        ],
        "screenShotFile": "0008002a-001b-00f8-00a8-00b700600032.png",
        "timestamp": 1543503274696,
        "duration": 12179
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "e082b2fa62dbdf8ad9b28bf0707f4373",
        "instanceId": 31086,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10020ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10020ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503294751,
                "type": ""
            }
        ],
        "screenShotFile": "00e9001c-00fe-0085-00ce-009d003d000a.png",
        "timestamp": 1543503292803,
        "duration": 12120
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "07c2d3fe0e1b422a62a17a2fd7479e67",
        "instanceId": 31370,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10003ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10003ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:30:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:29:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503323302,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543503323499,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543503323774,
                "type": ""
            }
        ],
        "screenShotFile": "0047002b-0099-00f1-004f-002f00bb00bf.png",
        "timestamp": 1543503320814,
        "duration": 15249
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "3d6ac675b8b09684400871a33e32dfe6",
        "instanceId": 31632,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10010ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10010ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503343304,
                "type": ""
            }
        ],
        "screenShotFile": "008500a0-0026-0082-008f-003a004e0048.png",
        "timestamp": 1543503341284,
        "duration": 12182
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "31a1765d4758401e72b45324d879adf0",
        "instanceId": 31901,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:46:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503361832,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503362729,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503363039,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503365221,
                "type": ""
            }
        ],
        "screenShotFile": "00f8004e-005f-0021-0075-005600100055.png",
        "timestamp": 1543503358568,
        "duration": 9110
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "a1e28a7472290dd012258bc3d924e2d1",
        "instanceId": 32174,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content ndm-page__content--loading\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:47:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503420616,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503421477,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503421795,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503423986,
                "type": ""
            }
        ],
        "screenShotFile": "00e60030-00ff-0082-003f-00a1000200bd.png",
        "timestamp": 1543503418663,
        "duration": 7682
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "ce2ebfe8be6a48d944f5a5a064e349f1",
        "instanceId": 32445,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503460548,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503461416,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503461803,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503463950,
                "type": ""
            }
        ],
        "screenShotFile": "005c004b-002d-00ab-00f3-00ce0005009d.png",
        "timestamp": 1543503458589,
        "duration": 11367
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "ef5e106936bc2ea6027b3a41e7c7d36a",
        "instanceId": 32748,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10002ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10002ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503513748,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular/angular.js 14198:23 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543503522459,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6902:28 \"Transition Rejection($id: 1 type: 6, message: The transition errored, detail: Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=)\"",
                "timestamp": 1543503522461,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/bower_components/angular-ui-router/release/angular-ui-router.js 6904:32 \"Error: [$compile:tpload] Failed to load template: app/page/login/login.html (HTTP status: -1 )\\nhttp://errors.angularjs.org/1.5.11/$compile/tpload?p0=app%2Fpage%2Flogin%2Flogin.html&p1=-1&p2=\\n    at http://localhost:3000/bower_components/angular/angular.js:68:12\\n    at handleError (http://localhost:3000/bower_components/angular/angular.js:19761:17)\\n    at processQueue (http://localhost:3000/bower_components/angular/angular.js:16696:28)\\n    at http://localhost:3000/bower_components/angular/angular.js:16712:27\\n    at Scope.$eval (http://localhost:3000/bower_components/angular/angular.js:17994:28)\\n    at Scope.$digest (http://localhost:3000/bower_components/angular/angular.js:17808:31)\\n    at Scope.$apply (http://localhost:3000/bower_components/angular/angular.js:18102:24)\\n    at done (http://localhost:3000/bower_components/angular/angular.js:12082:47)\\n    at completeRequest (http://localhost:3000/bower_components/angular/angular.js:12291:7)\\n    at XMLHttpRequest.requestError (http://localhost:3000/bower_components/angular/angular.js:12229:9)\"",
                "timestamp": 1543503522461,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503522921,
                "type": ""
            }
        ],
        "screenShotFile": "0068000e-00be-006f-000a-004e00ae00b4.png",
        "timestamp": 1543503511545,
        "duration": 12353
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "2b7c25920314c956812933a5a2a17979",
        "instanceId": 814,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503567237,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
                "timestamp": 1543503567450,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503568342,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503572821,
                "type": ""
            }
        ],
        "screenShotFile": "0070001c-00ec-00e6-00bb-008a003f009f.png",
        "timestamp": 1543503565150,
        "duration": 13952
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "cbfccf7a589c6443652593fc24b8db62",
        "instanceId": 1149,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543503786833,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503788029,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503788499,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543503790611,
                "type": ""
            }
        ],
        "screenShotFile": "00d40008-00fc-006c-001d-000f00e9004f.png",
        "timestamp": 1543503784898,
        "duration": 12939
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "68373c9aa1d7f1f3e2c717e7278fc6ed",
        "instanceId": 12521,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: el_array.lenght is not a function"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "TypeError: el_array.lenght is not a function\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:54:24)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"testing filtration by device and by date, time\") in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Timeout.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4283:11)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:50:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543581921275,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543581923388,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543581927873,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543581930528,
                "type": ""
            }
        ],
        "screenShotFile": "00be0002-00f0-004c-0068-00ee00d70040.png",
        "timestamp": 1543581904131,
        "duration": 35662
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "b20b18f677ca9259de6d2367d64b2fc3",
        "instanceId": 12891,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:482:11)\n    at tryOnTimeout (timers.js:317:5)\n    at Timer.listOnTimeout (timers.js:277:5)",
            "WebDriverError: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:47:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582090881,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582091508,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582096809,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582100444,
                "type": ""
            }
        ],
        "screenShotFile": "000c0021-008e-0029-0021-007900610019.png",
        "timestamp": 1543582074794,
        "duration": 33215
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "43976f88a8d896cb2ab95bf7d0a8e8c2",
        "instanceId": 13173,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582230645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582231309,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582233067,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582235399,
                "type": ""
            }
        ],
        "screenShotFile": "005f008e-0006-009a-0098-004300fd001b.png",
        "timestamp": 1543582224487,
        "duration": 20298
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "d07e557131b138593e0bdec32630c441",
        "instanceId": 13525,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582423703,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582424211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582425195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582427324,
                "type": ""
            }
        ],
        "screenShotFile": "003400f3-0026-0090-007e-0019005e0018.png",
        "timestamp": 1543582419397,
        "duration": 16721
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "367e5e2e895ec2237a6e1536bf8a063c",
        "instanceId": 13654,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10002ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10002ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:5:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at waitForVisible (/home/andrey/git/protractor/wi-fi_system_log.js:4:20)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:14:5)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582448698,
                "type": ""
            }
        ],
        "screenShotFile": "004800f4-0072-0067-009a-003c00f600be.png",
        "timestamp": 1543582447556,
        "duration": 11323
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "edd9ab47ee58578a6bd882e9ea3f4f79",
        "instanceId": 13778,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: Wait timed out after 10011ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 10011ms\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/usr/local/lib/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/usr/local/lib/node_modules/protractor/built/browser.js:67:16)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:30:15\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:938:14\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2974:25)\nFrom: Task: <anonymous>\n    at pollCondition (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2195:19)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2191:7\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2190:22\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: <anonymous wait>\n    at scheduleWait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at thenableWebDriverProxy.wait (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at UserContext.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:29:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582471568,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582472082,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582472630,
                "type": ""
            }
        ],
        "screenShotFile": "007d00fc-0022-006a-0015-00f700e80081.png",
        "timestamp": 1543582470488,
        "duration": 14164
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "83a835c37031edfa5e54cb1f4b96ae45",
        "instanceId": 13936,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": [
            "Failed: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: headless chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <li ng-if=\"vm.tabsToShow > 1\" ng-repeat=\"(idx, tab) in vm.visibleTabs\" ng-attr-title=\"{{tab[vm.labelProp]}}\" class=\"tabs-list__item ng-scope\" ng-class=\"{\n                    'tabs-list__item--active': idx === vm.activeTabIdx - vm.viewStartIdx,\n                    'tabs-list__item--modified': tab.isModified,\n                    'tabs-list__item--new': tab.isNew,\n                    'tabs-list__item--disabled': vm.isDisabled\n                }\" ng-click=\"!vm.isDisabled &amp;&amp; vm.onTabClick(idx + vm.viewStartIdx, tab)\" title=\"Log\">...</li> is not clickable at point (181, 276). Other element would receive the click: <div class=\"ndm-page__content\" ng-class=\"{\n                'ndm-page__content--loading' : isLoad,\n                'ndm-page__content--nodescription' : !description\n            }\">...</div>\n  (Session info: headless chrome=70.0.3538.110)\n  (Driver info: chromedriver=2.44.609551 (5d576e9a44fe4c5b6a07e568f1ebc753f1214634),platform=Linux 4.15.0-39-generic x86_64)\n    at Object.checkLegacyResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/usr/local/lib/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/usr/local/lib/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/usr/local/lib/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/usr/local/lib/node_modules/protractor/built/element.js:831:22)\n    at /home/andrey/git/protractor/wi-fi_system_log.js:47:11\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /usr/local/lib/node_modules/protractor/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:9:3)\n    at addSpecsToSuite (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/usr/local/lib/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/andrey/git/protractor/wi-fi_system_log.js:1:63)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582558460,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582559844,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582560196,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582562314,
                "type": ""
            }
        ],
        "screenShotFile": "00810069-00f1-008f-008e-0035007000c1.png",
        "timestamp": 1543582557135,
        "duration": 11015
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "305f2ff5afb883b3d6be3c5bf340a0e6",
        "instanceId": 14065,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582573856,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582574235,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582574667,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582576728,
                "type": ""
            }
        ],
        "screenShotFile": "00da00b2-00e1-0031-005f-00eb00ab00bb.png",
        "timestamp": 1543582572801,
        "duration": 9960
    },
    {
        "description": "testing filtration by device and by date, time|Wi-fi system log testing: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "75123627544505e768132c055433d184",
        "instanceId": 14196,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.110"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:3000/app/lang.debug.js 18:20 \"LanguageProvider replace from lang.debug.js\"",
                "timestamp": 1543582608170,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582608504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582608821,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://localhost:3000/auth - Failed to load resource: the server responded with a status of 401 (Unauthorized)",
                "timestamp": 1543582611023,
                "type": ""
            }
        ],
        "screenShotFile": "00210018-006b-0024-0021-0095004200d8.png",
        "timestamp": 1543582606962,
        "duration": 10092
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

