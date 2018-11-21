describe('angularjs playground testing', function() {
  beforeEach(function(){
    browser.get('http://localhost:3000');
    expect(browser.getTitle()).toEqual('angular-ndw playground');
  })
  function error_check(element, ex){
    element.getAttribute('ng-show').then(function (attr_val){
          element.evaluate(attr_val).then(function (res) {
              console.log(res);
              expect(res===null).toBe(!ex);
            }
          );
      }
    );
  }
  it('ndm-input test', function() {
    var until = protractor.ExpectedConditions;
    var ASCII_input = element(by.xpath('//div[@validation="ascii"]//input'));
    var ASCII_error = element(by.xpath('//div[@validation="ascii"]//label[@data-translate]'));
    var disabled_input = element(by.xpath('//input[@disabled="disabled"]'));
    var password_input = element(by.xpath('//div[@validation="password"]//input'));
    var password_error = element(by.xpath('//div[@validation="password"]//label[@data-translate]'));
    var req_field1 = element(by.xpath('//div[@validation="required"][1]//input'));
    var error1 = element(by.xpath('//div[@validation="required"][1]//label[@data-translate]'));
    var req_field2 = element(by.xpath('//div[@validation="required"][2]//input'));
    var error2 = element(by.xpath('//div[@validation="required"][2]//label[@data-translate]'));
    expect(disabled_input.getAttribute('disabled')).toEqual('true');
    //ASCII_input
    browser.driver.wait(function () {
    browser.wait(until.visibilityOf(ASCII_input), 10000);
    return ASCII_input;
    });
    ASCII_input.clear().then(function(){
          ASCII_input.sendKeys('Неправильный текст');
    });
    error_check(ASCII_error,true);
    ASCII_input.clear().then(function(){
          ASCII_input.sendKeys('Right text');
    });
    error_check(ASCII_error,false);
    //password_input
    password_input.clear().then(function(){
          password_input.sendKeys('Неправильный текст');
    });
    error_check(password_error,true);
    password_input.clear().then(function(){
          password_input.sendKeys('password');
    });
    error_check(password_error,false);
    expect(password_input.getAttribute('type')).toEqual('password');
    element(by.xpath('//div[@validation="password"]//a')).click();
    expect(password_input.getAttribute('type')).toEqual('text');
    //field1,2
    req_field1.sendKeys('text').then(function(){
          error_check(error1, false);
    });

    req_field2.clear().then(function(){
          req_field2.sendKeys('text');
    });
    error_check(error2, false);
  });
});
