describe("Wi-fi system log testing: ",function(){
  var until = protractor.ExpectedConditions;
  function waitForVisible(element,time){
    browser.driver.wait( function(){
      browser.wait(until.visibilityOf(element), time);
      return element;
    });
  }
  it("selecting wi-fi system option",function(){
    //browser.ignoreSynchronization = true;
    var menu_button = element(by.id('ndm_menu_toggle'));
    var option = element(by.linkText('Wi-Fi-система'));
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(menu_button), 10000);
      return menu_button;
    }).then(function(el){
      el.click();
    });
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(option), 10000);
      return option;
    }).then(function(el){
      el.click();
    });
    //browser.sleep(5000);
    var tab = element(by.linkText('Журнал переходов'));
    browser.driver.wait(function(){
      browser.wait(until.visibilityOf(tab), 10000);
      return tab;
    }).then(function(tab){
      browser.wait(function(){return tab.isDisplayed();})
      .then ( function () {
        browser.sleep(6000);
        tab.click();
      });
    });
  });
  it("testing filtration by device and by date, time",function(){
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
    //counter=0;
    devices.each(function(){
      console.log(cntr+": "+sorted[cntr++]);
    });
    browser.sleep(2000);

    //expect(devices.count().)
  //  devices.click();
  //  devices.count().then(function(count){console.log(count)});
  });
});
