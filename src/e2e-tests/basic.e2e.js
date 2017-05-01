var assert = require('assert');


describe("Basic Test", function(){
    it("Works", function(){
        browser.url('http://webdriver.io');
        var title = browser.getTitle();
        assert.equal(title, 'WebdriverIO - WebDriver bindings for Node.js');
    })
})