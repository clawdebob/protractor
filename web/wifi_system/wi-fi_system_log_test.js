const rgbHex = require('rgb-hex');

describe('Wi-fi system log testing: ', () => {
    let until = protractor.ExpectedConditions;
    let mock = require('protractor-http-mock');

    const events = $$('span[class="mws-log-event__type"]');

    let selectOption = (input, el) => {
        input.clear().click();
        browser.wait(until.visibilityOf(el), 10000)
            .then(() => {
                el.click();
            });
        browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
    }


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

    describe('filtering by device', () => {
        const input = $('input[name="logFilter_client"]'),
            option = $$('ndm-input-autocomplete[name="logFilter_client"] li').get(0),
            devices = $$('.table__col-1 div'),
            filter = $$('.ndm-table thead th.sortable').get(1),
            cancel = $('ndm-button[icon="cancel"] button')
        let devArray = [],
            sorted = [];

        it('selecting device "Apple II Computer" ', () => {
            input.clear().sendKeys('Apple');
            browser.wait(until.visibilityOf(option), 10000)
                .then(() => {
                    option.click();
                });
        });

        it('checking filtered data', () => {
            devices.each((el) => {
                el.getText()
                    .then((text) => {
                        if(text !== 'Device'){
                            expect(text.split('\n')[0]).toBe('Apple II computer');
                        }
                    });
            })
            .then(() => {input.clear()});
        });

        it('selecting device "iPhone XR"', () => {
            input.clear().sendKeys('iPHONE');
            browser.wait(until.visibilityOf(option), 10000)
                .then(() => {
                    option.click();
                });
        });

        it('checking filtered data', () => {
            devices.each((el) => {
                el.getText()
                    .then((text) => {
                        if(text !== 'Device'){
                            expect(text.split('\n')[0]).toBe('iPhone-XR');
                        }
                    });
            })
            .then(() => {cancel.click();});
        });

        it('getting device data', () => {
            devices.each((el) => {
                el.getText()
                    .then((text) => {
                        if(text !== 'Device'){
                            devArray.push(text);
                        }
                    });
            });
        });

        it('sorting by ASC: ', () => {
            filter
                .click()
                .then(() => {
                    sorted = devArray.sort((a, b) => {
                        if (a > b) return -1;
                        else if (a < b) return 1;
                        return 0;
                    });
                }).then(() => {
                    devices.each((el) => {
                        el.getText()
                            .then((text) => {
                                if(text !== 'Device'){
                                    devArray.push(text);
                                }
                            });
                    });
                });
        });

        it('array sort', () => {
        for (c = 0; c < devArray.length; c++){
            expect(devArray[c]).toBe(sorted[c]);
            //console.log('compare: '  + devArray[c] + ' to: ' + sorted[c] + '\n')
        }
            //console.log(sorted);
            //browser.sleep(120000);
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

        it('selecting option: Connected', () => {selectOption(input, optionC);});

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('Connected');
            });
        });

        it('selecting option: Left', () => {selectOption(input, optionL);});

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('Left');
            });
        });

        it('selecting option: PMK', () => {selectOption(input, optionP);});

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('PMK cache transition');
            });
        });

        it('selecting option: Fast transition', () => {selectOption(input, optionF);});

        it('checking filtered data', () => {
            events.each((el) => {
                expect(el.getText()).toBe('Fast transition');
            });
        });

        it('selecting option: Transition', () => {selectOption(input, optionT);});

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
        //browser.pause(50000);
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
