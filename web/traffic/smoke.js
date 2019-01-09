require('os').networkInterfaces()
const macaddress = require('macaddress'),
rgbHex = require('rgb-hex'),
mac = macaddress.one((err, mac) => { return mac;}),
until = protractor.ExpectedConditions;

describe('traffic monitor smoke test',() => {
    it('checking empty page',() => {
        browser.get('/controlPanel/traffic-monitor');
        const graph_load = element(by.className('ndm-bar-chart ndm-bar-chart--loading')),
        register_link = element(by.linkText('Register devices'));

        browser.driver.wait(() => {
            browser.wait(until.visibilityOf(graph_load), 10000,'search input field wasn\'t found');
            browser.wait(until.visibilityOf(register_link), 10000,'link to Devices page wasn\'t found');

            return graph_load;
        });
    });

    describe('testing monitor with registered devices',() => {
        function request(type,uri){
            browser.executeAsyncScript(
                'let callback = arguments[arguments.length - 1],'+
                'xhr = new XMLHttpRequest();'+
                'xhr.open(arguments[0], arguments[1], true);'+
                'xhr.onreadystatechange = () => {if (xhr.readyState == 4) {callback(xhr.responseText);};'+
                '};'+
                'xhr.send("{}");',type,uri);
                /*.then((str) => {
                    console.log(str);
                });*/
        }

        beforeAll(() => {
            request('POST','rci/known/host?name=foo&mac=44:44:44:44:44:44');
            request('POST','rci/known/host?name=test&mac=22:22:22:22:22:22');
            request('POST','rci/known/host?name=admin&mac='+mac);
        });
        /*describe('consuming traffic',()=>{
            beforeAll(() => {
                browser.ignoreSynchronization=true;
            });
            it('going to youtube',()=>{
                browser.get('https://www.youtube.com');
                browser.sleep(2000);
            });
            it('going to google',() => {
                browser.get('https://www.google.com');
                browser.sleep(2000);
            });
            afterAll(() =>{
                browser.ignoreSynchronization=false;
            });
        });*/

        describe('checking visibility of graph\'s data',() => {
            let bars = null;
            const username = element(by.cssContainingText('.page-traffic-monitor__table__legend__host-list__item__title','admin'));

            it('checking visibility of graphs data for current device', () => {
                const userrect = element(by.css('.page-traffic-monitor__table__legend__host-list__item__rect'));

                browser.get('/controlPanel/traffic-monitor');

                browser.driver.wait(() => {
                    browser.wait(until.visibilityOf(username),10000,'username was\'t found');

                    return username;
                }).then(() => {
                    userrect.getCssValue('background-color').then((color) => {
                        const path = '//*[@fill=\'#'+rgbHex(color).slice(0,-2)+'\']';
                        bars = element.all(by.xpath(path));
                        browser.wait(until.visibilityOf(bars.get(0)),10000,'bars was\'t found');
                        expect(bars.count()).not.toBeLessThan(1);
                    });
                });
            });
            it('checking visibility of graphs data on all radio tabs',() => {
                const radio = element.all(by.repeater('(id, item) in model'));
                radio.each((el) => {
                    browser.driver.wait(() => {
                        browser.wait(until.visibilityOf(el),10000,'radio tab was\'t found');

                        return el;
                    }).then((el) => {
                        browser.sleep(500);
                        el.click();
                    }).then(() => {
                        browser.wait(until.visibilityOf(username),10000,'username was\'t found');
                        browser.wait(until.visibilityOf(bars.get(0)),10000,'bars was\'t found');
                        expect(bars.count()).not.toBeLessThan(1);
                    });
                }).then(() => {
                    browser.sleep(500);
                    radio.get(0).click();
                });
            });
        });

        describe('testing tabs',() => {
            const tab = element(by.cssContainingText('span','+')),
            device_admin = element(by.cssContainingText('.white-list__item','admin')),
            device_foo = element(by.cssContainingText('.white-list__item','foo')),
            device_test = element(by.cssContainingText('.white-list__item','test')),
            up = $('.d-header'),
            scroll = $$('.ss-scroll').get(1),
            submit = $('.page-traffic-monitor__track-device-button');

            beforeEach(() => {
                browser.driver.wait(() => {
                    browser.wait(until.visibilityOf(tab),10000,'tab is abscent');

                    return tab;
                }).then((tab) => {
                    browser.sleep(500);
                    tab.click();
                    browser.wait(until.visibilityOf(device_admin),10000,'device was\'t found');
                }).then(() => {
                    device_admin.click();
                }).then(() => {
                    submit.click();
                    browser.wait(until.visibilityOf(element(by.linkText('admin'))));
                }).then(() => {
                    browser.driver.wait(() => {
                        browser.wait(until.visibilityOf(tab),10000,'tab is abscent');
                        browser.driver.actions().dragAndDrop(scroll,up).mouseUp().perform();

                        return tab;
                    }).then((tab) => {

                        browser.sleep(500);
                        tab.click();
                        browser.wait(until.visibilityOf(device_foo),10000,'device was\'t found');
                    }).then(() => {
                        device_foo.click();
                    }).then(() => {
                        submit.click();
                        browser.wait(until.visibilityOf(element(by.linkText('foo'))));
                    }).then(() => {
                        browser.driver.wait(() => {
                            browser.wait(until.visibilityOf(tab),10000,'tab is abscent');
                            browser.driver.actions().dragAndDrop(scroll,up).mouseUp().perform();

                            return tab;
                        }).then((tab) => {

                            browser.sleep(500);
                            tab.click();
                            browser.wait(until.visibilityOf(device_test),10000,'device was\'t found');
                        }).then(() => {
                            device_test.click();
                        }).then(() => {
                            submit.click();
                            browser.wait(until.visibilityOf(element(by.linkText('test'))));
                        });
                    })
                });
            });
            it('closing current tab',() => {

            })
        });


        afterAll(() => {
            request('DELETE','rci/known/host?mac=44:44:44:44:44:44');
            request('DELETE','rci/known/host?mac=22:22:22:22:22:22');
            request('DELETE','rci/known/host?mac='+mac);
        });
    });
});
