describe("Hints testing", function(){
  var until = protractor.ExpectedConditions;
  it("surfing to hint",function(){
    var menu_button = element(by.id('ndm_menu_toggle'));
    var option = element(by.linkText('Wi-Fi system'));
    //var option = element(by.linkText('Wi-Fi-система'));
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
    var hint = element(by.tagName('ndm-help'))
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(hint), 10000);
      return hint;
    }).then(function(el){
        browser.actions().mouseMove(el).perform();
    });
    //browser.actions().mouseMove(element(by.id('sb-1'))).perform();
    browser.sleep(4000);
  });
});
