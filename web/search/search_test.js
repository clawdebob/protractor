describe('search test',function() {
   let until = protractor.ExpectedConditions,
   kn_base = element.all(by.cssContainingText('.ng-scope','Knowledge base')).get(0);
   search = element(by.xpath("//input[@type='search']"));

   it('checking search with no results',() => {
       browser.get('http://localhost:3000');
       let no_results = element.all(by.cssContainingText('.ng-scope','Sorry, we couldn\'t find anything')).get(0);
       browser.driver.wait(() => {
           browser.wait(until.visibilityOf(search), 10000,'search input field wasn\'t found');
           return search;
       }).then(() => {
           search.clear().sendKeys('no results');
       }).then(() => {
           browser.wait(until.visibilityOf(no_results), 10000,'message indicating abscence of results wasn\'t found');
       });
   });

   it('checking first result',() => {
       let result = element(by.cssContainingText('.search__suggest','Wired connections'));
       browser.driver.wait(() => {
           browser.wait(until.visibilityOf(search), 10000,'search input field wasn\'t found');
           return search;
       }).then(() => {
           search.clear().sendKeys('wired');
       }).then(() => {
           browser.wait(until.visibilityOf(result), 10000,'search result wasn\'t found');
           browser.wait(until.visibilityOf(kn_base), 10000,'knowledge base wasn\'t found');
           return result;
       }).then((el) => {
           el.click();
       }).then(() => {
           browser.driver.wait(() => {
               return browser.driver.getCurrentUrl().then((url) => {
                   return /wired/.test(url);
               });
           }, 10000);
       });
   });

   it('checking search with no internet',() => {
       let toggleb = element(by.xpath('//label[@for="up__0toggle"]')),
       hint = element.all(by.tagName('ndm-help')).get(1),
       txt_on = element(by.cssContainingText('.ndm-toggle .toggle-text .toggle-description.help-text--success', 'Connected')),
       txt_off = element(by.cssContainingText('.ndm-toggle .toggle-text .toggle-description', 'Disabled')),
       result = element(by.cssContainingText('.search__suggest','Device list'));
       browser.driver.wait(() => {
           browser.wait(until.visibilityOf(txt_on), 10000, 'text confirming succesful connection wasn\'t found');
           return toggleb;
       }).then((el) => {
           el.click();
       }).then(() => {
           browser.wait(until.visibilityOf(txt_off), 10000, 'text confirming abscence of connection wasn\'t found');
       }).then(() => {
           browser.driver.wait(() => {
               browser.wait(until.visibilityOf(search), 10000,'search input field wasn\'t found');
               return search;
           }).then(() => {
               search.clear().sendKeys('DEVICE LIST');
           }).then(() => {
               browser.wait(until.visibilityOf(result), 10000,'search result wasn\'t found');
              // browser.wait(until.stalenessOf(kn_base), 10000,'knowledge base title is visible');
               return result;
           }).then((el) => {
               el.click();
           }).then(() => {
               browser.driver.wait(() => {
                   return browser.driver.getCurrentUrl().then((url) => {
                       return /devicesList/.test(url);
                   });
               }, 10000);
           });
       }).then(() => {
           browser.navigate().back();
           browser.driver.wait(() => {
               browser.wait(until.visibilityOf(txt_off), 10000, 'text confirming unsuccesful connection wasn\'t found');
               return toggleb;
           }).then((el) => {
               el.click();
               browser.wait(until.visibilityOf(txt_on), 10000, 'text confirming succesful connection wasn\'t found');
           });
       });
   });

   it('testing knowledge base results',() => {
       //let result = element(by.cssContainingText('.search__results .knowledge-base-link__text','GRE'));
       let result = element(by.xpath('(//a[@class="knowledge-base-link"]/span)[1]'));
       browser.driver.wait(() => {
           browser.wait(until.visibilityOf(search), 10000,'search input field wasn\'t found');
           return search;
       }).then(() => {
           search.clear().sendKeys('ip');
       }).then(() => {
           browser.wait(until.visibilityOf(result), 10000,'search result wasn\'t found');
           browser.wait(until.visibilityOf(kn_base), 10000,'knowledge base wasn\'t found');
           return result;
       }).then((el) => {
           result.click();
       }).then(() => {
           result.click().then(() => {
               expect(browser.getCurrentUrl()).toMatch(/\/wired/);
               browser.getAllWindowHandles().then((handles) => {
               newWindowHandle = handles[0];
               browser.switchTo().window(newWindowHandle).then(() => {

               });
           });
       });
       });
   });


});
