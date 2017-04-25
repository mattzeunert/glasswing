var Compiler = require("./Compiler")

describe("Compiler / Babel Plugin", function(){
    it("Does stuff", function(){
        var code = `function fn(a,b){}`
        var compiledCode = new Compiler().compile(code, {
            scriptId: 1
        }).code
        expect(compiledCode).toContain("__jscbRV(1, 2, b)")
        expect(compiledCode).toContain("__jscbRV(1, 1, a)")
    })
    it("Does not call functions in member expressions twice", function(){
        var code = "var counter=0;var a = function(){counter++; return {b: 10}};a().b;counter"
        code = new Compiler().compile(code, {scriptId: 1}).code
        var aCalls = eval(`function __jscbRV(x,y, value){return value};function __jscbME(){};function __jscbFM(){};` + code)
        expect(aCalls).toBe(1)  
    })
    it("Correclty handles identifiers in member expressions", function(){
        var code = `a.b`
        var compiledCode = new Compiler().compile(code, {
            scriptId: 1
        }).code
        expect(compiledCode).toContain("__jscbME(1, 1, a, \"b\")")
    })
    it("Correctly handles calculated values in member expressions", function(){
        var code = `a[b]`
        var compiledCode = new Compiler().compile(code, {
            scriptId: 1
        }).code
        expect(compiledCode).toContain("__jscbME(1, 1, a, b)")
    })
    
})