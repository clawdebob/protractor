describe('Wi-fi system log testing: ', () => {
    var until = protractor.ExpectedConditions;
    var mock = require('protractor-http-mock');

    mock(['wifi_members.json']);

    function request(type,uri){
        browser.executeAsyncScript(
            'let callback = arguments[arguments.length - 1],'+
            'xhr = new XMLHttpRequest();'+
            'xhr.open(arguments[0], arguments[1], true);'+
            'xhr.onreadystatechange = () => {if (xhr.readyState == 4) {callback(xhr.responseText);};'+
            '};'+
            'xhr.send("{}");', type, uri).then((answ) => {
                console.log(answ);
            });
    }

    beforeAll(() => {
        browser.get('/controlPanel/wifiSystem');
        //request('GET', 'rci/show/mws/log');
    });
    it('selecting wi-fi system option', () => {
        var menu_button = element(by.id('ndm_menu_toggle'));
        //var option = element(by.linkText('Wi-Fi system'));
        var tab = element(by.linkText('Log'));
        /*browser.driver.wait(() => {
            browser.wait(until.visibilityOf(tab), 10000);

            return tab;
        }).then((tab) => {
            browser.wait(() => tab.isDisplayed())
            .then ( () => {
                browser.sleep(5000);
                tab.click();
            });
        });*/
        browser.sleep(120000);
    });

    afterEach(function(){
        mock.requestsMade().then((req) => {console.log(req);})
        //request('POST', 'rci/show/mws/log');
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
