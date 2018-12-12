describe("Hints testing", function(){
  var until = protractor.ExpectedConditions;
  it("surfing to hint",function(){
    var menu_button = element(by.id('ndm_menu_toggle'));
    var option = element(by.linkText('Wired'));
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(menu_button), 10000,"menu toggle button wasn't found");
      return menu_button;
    }).then(function(el){
      el.click();
    });
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(option), 10000,"option wasn't found");
      return option;
    }).then(function(el){
      el.click();
    });
  });
  it("checking hint without internet", function(){
    var toggleb = element(by.xpath('//label[@for="up__0toggle"]'));
    var hint = element.all(by.tagName('ndm-help')).get(1);
    var txt_on = element(by.cssContainingText('.ndm-toggle .toggle-text .toggle-description.help-text--success', 'Connected'));
    var txt_off = element(by.cssContainingText('.ndm-toggle .toggle-text .toggle-description', 'Disabled'));
    var links = element.all(by.repeater('note in vm.notes'));
    var loader = element(by.className('ndm-help-tooltip__loading ng-scope'));
    var error_msg = element(by.cssContainingText('.ndm-help-tooltip__error','There is no internet access'));
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(txt_on), 10000,"text confirming succesful connection wasn't found");
      return toggleb;
    }).then(function(el){
      el.click();
    }).then(function(){
      browser.wait(until.visibilityOf(txt_off), 10000,"text confirming abscence of connection wasn't found").then(function(){
      browser.driver.wait(function () {
        browser.wait(until.visibilityOf(hint), 10000, "hint wasn't found");
        return hint;
      }).then(function(el){
          browser.actions().mouseMove(el).perform();
          browser.wait(until.visibilityOf(loader), 10000, "loader is not visible");
          browser.wait(until.visibilityOf(error_msg), 10000, "error message was't displayed").then(function(){
          browser.wait(until.stalenessOf(links.get(0)), 10000,"links are not abscent");
        });
      });
    });
    }).then(function(){
      browser.driver.wait(function () {
        return toggleb;
      }).then(function(el){
        el.click();
        browser.wait(until.visibilityOf(txt_on), 10000,"text confirming succesful connection wasn't found");
      });
    }).then( function(){
    });
  });
  it("checking hint with internet connection",function(){
    var hint = element.all(by.tagName('ndm-help')).get(0);
    var links = element.all(by.repeater('note in vm.notes'));
    var loader = element(by.className('ndm-help-tooltip__loading ng-scope'));
    browser.refresh();
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(hint), 10000,"hint wasn't found");
      return hint;
    }).then(function(el){
      browser.actions().mouseMove(el).perform();
      browser.wait(until.visibilityOf(loader), 10000, "loader is not visible");
      browser.wait(until.visibilityOf(links.get(0)),10000,"links from database weren't found");
      expect(links.count()).not.toBeLessThan(1);
    });
  });
});
