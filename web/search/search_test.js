describe("search test",function(){
  var until = protractor.ExpectedConditions;
  var search = element(by.xpath("//input[@type='search']"));
  var no_results = element(by.cssContainingText('.ng-scope',"Sorry, we didn't find anything"));
  it("cheking serch with no results",function(){
    browser.driver.wait(function () {
      browser.wait(until.visibilityOf(search), 10000,"search input field wasn't found");
      return search;
    }).then(function(){
      search.clear().sendKeys('no results');
    }).then(function(){
      browser.wait(until.visibilityOf(no_results), 10000,"message indicating abscence of results wasn't found");
    });
  });
});
