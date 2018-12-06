describe('ndm-menu test', function(){
  var options = element.all(by.repeater('(key, point) in section.points'));
  var until = protractor.ExpectedConditions
  beforeEach(function(){
    browser.get('192.168.1.1');
  })
  it("cheking options transitions", ){

  }
});
