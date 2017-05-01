var assert = require('assert');

describe("Basic Test", function(){
    it("Loads the basic demo page and sends values to server", function(){
        browser.url('http://localhost:7888/src/e2e-tests/basic-demo-page?auto-activate-glasswing')
        browser.waitUntil(function () {
            var a = browser.execute(function(){
                return window.a
            }).value
            return a == 25;
        }, 20000, 'expected a to be set to 25 by the page')
        browser.waitUntil(function () {
            var a = browser.execute(function(){
                return window.__jscb.recordedValueBuffer.length
            }).value
            console.log("length", a)
            return a == 0;
        }, 20000, 'expected values to be sent to server and value buffer to be reset');
    })
    it("Shows simple.js in the Glasswing file listing", function(){
        browser.url('http://localhost:9500')
        var fileLinksTable = $(".file-links")
        fileLinksTable.waitForExist(5000)
        var jsFilePath = "http://localhost:7888/src/e2e-tests/basic-demo-page/basic-demo.js"
        assert(fileLinksTable.getText().indexOf(jsFilePath) !== -1)
    })
    })
})