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
})