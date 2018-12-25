require('os').networkInterfaces()
var macaddress = require('macaddress');
const mac = macaddress.one(function (err, mac) { return mac;});

describe('traffic monitor smoke test',() => {
    it('checking empty page',() => {
        browser.get('http://localhost:3000/controlPanel/traffic-monitor');
        let graph_load = element(by.className('ndm-bar-chart ndm-bar-chart--loading')),
        register_link = element(by.linkText('Register devices'));
        until = protractor.ExpectedConditions;
        browser.driver.wait(() => {
            browser.wait(until.visibilityOf(graph_load), 10000,'search input field wasn\'t found');
            browser.wait(until.visibilityOf(register_link), 10000,'link redirecting to Devices page wasn\'t found');

            return graph_load;
        });
    });

    describe('testing monitor with registered device',() => {
        function request(type,uri){
            browser.executeAsyncScript(
                'let callback = arguments[arguments.length - 1],'+
                'xhr = new XMLHttpRequest();'+
                'xhr.open(arguments[0], arguments[1], true);'+
                'xhr.onreadystatechange = () => {if (xhr.readyState == 4) {callback(xhr.responseText);};'+
                '};'+
                'xhr.send("{}");',type,uri).then((str) => {
                    console.log(str);
                });
        }
        beforeAll(() => {
            request('POST','rci/known/host?name=foo&mac=44:44:44:44:44:44');
            request('POST','rci/known/host?name=test&mac=22:22:22:22:22:22');
            request('POST','rci/known/host?name=admin&mac='+mac);
        });
        describe("consuming traffic",()=>{
            it('going to youtube',()=>{
                browser.get('https://www.youtube.com');
                browser.sleep(4000);
            });
            it('going to google',() => {
                browser.get('https://www.google.com');
                browser.sleep(4000);
            });
        });
        it('checking', () => {
            browser.get('http://localhost:3000/controlPanel/traffic-monitor');
            browser.sleep(10000);
        });
        afterAll(() => {
            request('DELETE','rci/known/host?mac=44:44:44:44:44:44');
            request('DELETE','rci/known/host?mac=22:22:22:22:22:22');
            request('DELETE','rci/known/host?mac='+mac);
        });
    });
});
