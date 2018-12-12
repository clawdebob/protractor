describe('Hints testing', () => {
    let until = protractor.ExpectedConditions;

    it('surfing to hint',() => {
      let menu_button = element(by.id('ndm_menu_toggle')),
      option = element(by.linkText('Wired'));
      browser.driver.wait((el) => {
        browser.wait(until.visibilityOf(menu_button), 10000, 'menu toggle button wasn\'t found');
        return menu_button;
      }).then((el) => {
       el.click();
      });
      browser.driver.wait(() => {
        browser.wait(until.visibilityOf(option), 10000, 'option wasn\'t found');
        return option;
      }).then((el) => {
        el.click();
      });
    });

    it("checking hint without internet", () => {
      let toggleb = element(by.xpath('//label[@for="up__0toggle"]')),
      hint = element.all(by.tagName('ndm-help')).get(1),
      txt_on = element(by.cssContainingText('.ndm-toggle .toggle-text .toggle-description.help-text--success', 'Connected')),
      txt_off = element(by.cssContainingText('.ndm-toggle .toggle-text .toggle-description', 'Disabled')),
      links = element.all(by.repeater('note in vm.notes')),
      loader = element(by.className('ndm-help-tooltip__loading ng-scope')),
      error_msg = element(by.cssContainingText('.ndm-help-tooltip__error', 'There is no internet access'));
      browser.driver.wait(() => {
          browser.wait(until.visibilityOf(txt_on), 10000, 'text confirming succesful connection wasn\'t found');
          return toggleb;
      }).then((el) => {
          el.click();
      }).then(() => {
        browser.wait(until.visibilityOf(txt_off), 10000, 'text confirming abscence of connection wasn\'t found').then(() => {
        browser.driver.wait(() => {
            browser.wait(until.visibilityOf(hint), 10000, 'hint wasn\'t found');
            return hint;
      }).then((el) => {
          browser.actions().mouseMove(el).perform();
          browser.wait(until.visibilityOf(loader), 10000, 'loader is not visible');
          browser.wait(until.visibilityOf(error_msg), 10000, 'error message was\'t displayed').then(() => {
          browser.wait(until.stalenessOf(links.get(0)), 10000, 'links are not abscent');
        });
      });
    });
    }).then(() => {
        browser.driver.wait(() => {
            return toggleb;
        }).then((el) => {
            el.click();
            browser.wait(until.visibilityOf(txt_on), 10000, 'text confirming succesful connection wasn\'t found');
      });
    });
  });

  it('checking hint with internet connection', () => {
    let hint = element.all(by.tagName('ndm-help')).get(0),
    links = element.all(by.repeater('note in vm.notes')),
    loader = element(by.className('ndm-help-tooltip__loading ng-scope'));
    browser.refresh();
    browser.driver.wait(() => {
        browser.wait(until.visibilityOf(hint), 10000, 'hint wasn\'t found');
        return hint;
    }).then((el) => {
        browser.actions().mouseMove(el).perform();
        browser.wait(until.visibilityOf(loader), 10000, 'loader is not visible');
        browser.wait(until.visibilityOf(links.get(0)),10000, 'links from database weren\'t found');
        expect(links.count()).not.toBeLessThan(1);
    });
  });
});
