const rgbHex = require('rgb-hex');

describe('Wi-fi system log testing: ', () => {
    var until = protractor.ExpectedConditions;
    var mock = require('protractor-http-mock');

    mock(['wifi_members.json','wifi_log.json','wifi_hotspot.json']);

    beforeAll(() => {
        browser.get('/controlPanel/wifiSystem');
    });

    it('selecting wi-fi system option', () => {
        const tab = $$('.tabs-list__item').get(1),
            trs = $$('.ndm-table__row').get(0);

        browser.driver.wait(() => {
            browser.wait(until.visibilityOf(tab), 10000);
            browser.actions()
                .mouseMove(tab, {x: 5, y: 5})
                .perform();

            return tab;
        }).then((el) => {
            browser.wait(() => {
                return el
                    .getCssValue('background-color')
                    .then((color) => rgbHex(color).slice(0, -2) === 'eff7ff');
            });
        }).then(() => {
            tab.click();
            browser.wait(until.visibilityOf(trs), 10000);
        }).then(() => {
            browser.actions()
                .mouseMove(trs, {x: 5, y: 5})
                .perform();
            browser.wait(() => {
                return trs
                    .getCssValue('background-color')
                    .then((color) => rgbHex(color).slice(0, -2) === 'd5eaf7');
            });
        });
    });

    describe('Filtering by event: ', () => {
        const input = $('input[name="logFilter_eventType"]'),
            optionC = $('li[data-ndm-option-value="connected"]'),
            optionL = $('li[data-ndm-option-value="left"]'),
            optionT = $('li[data-ndm-option-value="transition"]'),
            optionF = $('li[data-ndm-option-value="fast-transition"]'),
            optionP = $('li[data-ndm-option-value="pmk-cache-transition"]'),
            events = $$('span[class="mws-log-event__type"]'),
            trans = ['Transition', 'Fast transition', 'PMK cache transition'];

        it('selecting option: Connected', () => {
            input.click();
            browser.wait(until.visibilityOf(optionC), 10000)
                .then(() => {
                    optionC.click();
                });
            browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
        });

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('Connected');
            });
        });

        it('selecting option: Left', () => {
            input.clear().click();
            browser.wait(until.visibilityOf(optionL), 10000)
                .then(() => {
                    optionL.click();
                });
            browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
        });

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('Left');
            });
        });

        it('selecting option: PMK', () => {
            input.clear().click();
            browser.wait(until.visibilityOf(optionP), 10000)
                .then(() => {
                    optionP.click();
                });
            browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
        });

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('PMK cache transition');
            });
        });

        it('selecting option: Fast transition', () => {
            input.clear().click();
            browser.wait(until.visibilityOf(optionF), 10000)
                .then(() => {
                    optionF.click();
                });
            browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
        });

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('Fast transition');
            });
        });

        it('selecting option: Transition', () => {
            input.clear().click();
            browser.wait(until.visibilityOf(optionT), 10000)
                .then(() => {
                    optionT.click();
                });
            browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
        });

        it('checking filtered data', () => {
            events.each((el) => {
                el.getText()
                    .then((text) => {
                        expect(trans.indexOf(text)).not.toBe(-1);
                    });
            });
        });
    });

    afterEach(() => {
        mock.teardown();
    });


  /*it("testing filtration by device and by date, time",() => {
    var dates = element.all(by.xpath('//tr[@item-idx]/td[1]/div'));
    var devices = element.all(by.xpath('//tr[@item-idx]/td[2]/div'));
  //  var dev_sort = element.(by.xpath(''));
    var dlist=[];
    var sorted=[];
    var counter = 0;
    var cntr = 0;
    devices.each(function(el){
      el.getText().then((text) =>{
        dlist.push(text);
      }).then(function(){
        console.log(dlist[counter++]);
      });
    });
    sorted = dlist.sort(function (a, b) {
      if (a > b) return -1;
      else if (a < b) return 1;
      return 0;
    });
    devices.each(function(){
      console.log(cntr+": "+sorted[cntr++]);
    });
    browser.sleep(2000);

    //expect(devices.count().)
  //  devices.click();
  //  devices.count().then(function(count){console.log(count)});
});*/
});
