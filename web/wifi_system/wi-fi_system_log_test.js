const rgbHex = require('rgb-hex');

describe('Wi-fi system log testing: ', () => {
    let until = protractor.ExpectedConditions;
    let mock = require('protractor-http-mock');

    const events = $$('span[class="mws-log-event__type"]'),
            cancel = $('ndm-button[icon="cancel"] button');

    mock(['wifi_log.json','wifi_hotspot.json']);
    //['wifi_members.json',

    let selectOption = (input, el) => {
        input.clear().click();
        browser.wait(until.visibilityOf(el), 10000)
            .then(() => {
                el.click();
            });
        browser.wait(until.visibilityOf(events.get(0)), 10000, 'no data found');
    }

    let selectOptionByText = (input_name, text) => {
        const el = $$('ndm-input-autocomplete[name="' + input_name + '"] li').get(0);
        $('input[name="' + input_name + '"]').clear().sendKeys(text);
        browser.wait(until.visibilityOf(el), 10000)
            .then(() => {
                el.click();
            });
    }


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

    describe('Sorting by date', () => {
        const dates = $$('.table__col-0 div'),
            filter = $$('.ndm-table thead th.sortable').get(0);

        let devArray = [],
            sorted = [];

        it('getting dates list', () => {
            let date = null,
                time = null;

            dates.each((el) => {
                el.getText()
                    .then((text) => {
                        if(text !== 'Timestamp' && text !== ''){
                            date = text.split('\n')[1].split('.');
                            time = text.split('\n')[0];
                            sorted.push(date[1] + '/'+ date[0]+ '/' + date[2] + ' ' + time);
                        }
                    });
            })
            .then(() => {
                expect(sorted.length).toBe(100);
            })
        });

        it('sorting by DESC: ', () => {
            let date = null,
                time = null;
            filter
                .click()
                .then(() => {
                    sorted = sorted.sort(function(a, b){
                            return new Date(a) - new Date(b);
                    });
                })
                .then(() => {
                    dates
                        .each((el) => {
                            el.getText()
                                .then((text) => {
                                    if(text !== 'Timestamp' && text !== '') {
                                        date = text.split('\n')[1].split('.');
                                        time = text.split('\n')[0];
                                        devArray.push(date[1] + '/'+ date[0]+ '/' + date[2] + ' ' + time);
                                    }
                                });
                        });
                })
                .then(() => {
                    expect(devArray.length).toBe(100);
                });
        });

        it('checking sorted data', () => {
            for (c = 0; c < devArray.length; c++){
                expect(devArray[c]).toBe(sorted[c]);
            }
        });

        it('sorting by ASC: ', () => {
            let date = null,
                time = null;

            filter
                .click()
                .then(() => {
                    sorted = sorted.sort(function(a, b){
                            return new Date(b) - new Date(a);
                    });
                    devArray = [];
                })
                .then(() => {
                    dates
                        .each((el) => {
                            el.getText()
                                .then((text) => {
                                    if(text !== 'Timestamp' && text !== '') {
                                        date = text.split('\n')[1].split('.');
                                        time = text.split('\n')[0];
                                        devArray.push(date[1] + '/'+ date[0]+ '/' + date[2] + ' ' + time);
                                    }
                                });
                        });
                })
                .then(() => {
                    expect(devArray.length).toBe(100);
                });
        });

        it('checking sorted data', () => {
            for (c = 0; c < devArray.length; c++){
                expect(devArray[c]).toBe(sorted[c]);
            }
        });
    });


    describe('Filtering by hosts device ', () => {
        const input = $('input[name="logFilter_from"]'),
            devices = $$('.table__col-1 div'),
            filter = $$('.ndm-table thead th.sortable').get(1);

        let devArray = [],
            sorted = [];

        it('selecting device "Apple II Computer" ', () => {
            selectOptionByText('logFilter_client', 'Apple');
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
            selectOptionByText('logFilter_client', 'Iphone');
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
                            sorted.push(text);
                        }
                    });
            })
            .then(() => {
                expect(sorted.length).toBe(100);
            //    browser.sleep(60000);
            })
        });

        it('sorting by DESC: ', () => {
            filter
                .click()
                .then(() => {
                    sorted = sorted.sort((a, b) => {
                        if (a > b) return -1;
                        else if (a < b) return 1;
                        return 0;
                    });
                })
                .then(() => {
                    devices
                        .each((el) => {
                            el.getText()
                                .then((text) => {
                                    if(text !== 'Device') {
                                        devArray.push(text);
                                    }
                                });
                        });
                })
                .then(() => {
                    expect(devArray.length).toBe(100);
                });
        });

        it('checking sorted data', () => {
            for (c = 0; c < devArray.length; c++){
                expect(devArray[c]).toBe(sorted[c]);
                //console.log('compare: '  + devArray[c] + ' to: ' + sorted[c] + '\n')
            }
        });


        it('sorting by ASC', () => {
            filter
                .click()
                .then(() => {
                    devArray = [];
                    sorted = sorted.sort((a, b) => {
                        if (a < b) return -1;
                        else if (a > b) return 1;
                        return 0;
                    });
                })
                .then(() => {
                    devices
                        .each((el) => {
                            el.getText()
                                .then((text) => {
                                    if(text !== 'Device') {
                                        devArray.push(text);
                                    }
                                });
                        });
                })
                .then(() => {
                    expect(devArray.length).toBe(100);
                });
        });

        it('checking sorted data', () => {
            for (c = 0; c < devArray.length; c++) {
                expect(devArray[c]).toBe(sorted[c]);
                //console.log('compare: '  + devArray[c] + ' to: ' + sorted[c] + '\n')
            }
        });
    });

    /*describe('Filtering by "From" and "To" devices ', () => {
        const devices = $$('.table__col-2 div'),
            devicesTo = $$('.table__col-4 div');

        it('selecting device "Keenetic Air" from "From" ', () => {
            selectOptionByText('logFilter_from', 'Keenetic A');
        });

        it('checking filtered data', () => {
            devices.each((el) => {
                el.getText()
                    .then((text) => {
                        if(text !== 'From'){
                            expect(text.split('\n')[0]).toBe('Keenetic Air');
                        }
                    });
            })
            .then(() => {cancel.click();});
        });

        it('selecting device "Keenetic Ultra" from "To": ', () => {
            selectOptionByText('logFilter_to', 'Keenetic ULTRA');
            //browser.sleep(50000);
        });

        it('checking filtered data', () => {
            devicesTo.each((el) => {
                el.getText()
                    .then((text) => {
                        if(text !== 'To'){
                            expect(text.split('\n')[0]).toBe('Keenetic Ultra');
                        }
                    });
            })
            .then(() => {cancel.click();});
        });
    });*/

    describe('Filtering by event ', () => {
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

        it('selecting option: Transition', () => { selectOption(input, optionT);});

        it('checking filtered data', () => {
            events.each((el) => {
                el.getText()
                    .then((text) => {
                        expect(trans.indexOf(text)).not.toBe(-1);
                    });
            }).then(() => {cancel.click()})
        });
    });





    afterEach(() => {
        mock.teardown();
    });
});
