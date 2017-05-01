var assert = require('assert');

describe("Basic Test", function(){
    it("Loads the basic demo page and sends values to server", function(){
        browser.url('http://localhost:7888/src/e2e-tests/basic-demo-page?auto-activate-glasswing')
        browser.waitUntil(function () {
            var a = browser.execute(function(){
                return window.a
            }).value
            return a == 25;
        }, 30000, 'expected a to be set to 25 by the page')
        browser.waitUntil(function () {
            var a = browser.execute(function(){
                return window.__jscb.recordedValueBuffer.length
            }).value
            console.log("length", a)
            return a == 0;
        }, 30000, 'expected values to be sent to server and value buffer to be reset');
    })
})