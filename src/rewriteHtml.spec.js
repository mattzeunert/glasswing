// don't think i'll need this file
// using chrome ext instead
// this approach is too flaky because the paths have to change
// maybe will look into this later, chrome ext isn't perfect either

// var rewriteHtml = require("./rewriteHtml")

// describe("rewriteHtml", function(){
//     var specs = [
//         {
//             name: "Rewrites absolute script src URLs",
//             html: `<script src="http://example.com/test.js"></script>`,
//             rewrittenContains: `<script src="http://localhost:6000/proxy/http/example.com/80/test.js"></script>`
//         },
//         {
//             name: "Injects base tag",
//             html: ``,
//             rewrittenContains: `<base href="http://localhost:6000/">`
//         }
//     ]

//     specs.forEach(function(spec){
//         it(spec.name, function(){
//             var rewritten = rewriteHtml(spec.html, "http://localhost:6000/proxy/http/localhost/5000/sth/")
//             expect(rewritten).toContain(spec.rewrittenContains)
//         })
//     })
// })