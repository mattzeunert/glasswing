const transform = require('babel-core').transform
const t = require("babel-types")
const MagicString = require( 'magic-string' );

var scriptIdCounter = 1;
var scriptInfo = {}
var urlToId = {}

module.exports = {
    process: function processJS(url, js){
        return transform(js, {
            plugins: [getPlugin(url, js)]
        }).code
    },
    browse: browse,
    reportValue: reportValue
};

function reportValue(data){
    var info = scriptInfo[data.scriptId]
    info.values[data.valueId].push(data.value)
}

function browse(url){
    console.log(url, "aaaa")
    const id = urlToId[url]
    return renderInfo(scriptInfo[id])
}

function ScriptInfo() {
    this.locations = {}
    this.values = {}
}

function renderInfo(info){
    var m = new MagicString(info.code)
    var errors = []
    Object.keys(info.locations).forEach(function(id){
        var loc = info.locations[id]
        try {
            if (loc.type === "call") {
                m.insertLeft(loc.end, "<span data-value-id='" + id + "' style='background: red; color: white;border-radius: 4px;padding: 2;font-size: 12px'>" + 
                    "RET"
                + "</span>")
            }
            else {
                var end = loc.end
                if (loc.type === "returnStatement") {
                    end = loc.start + "return".length
                }
                m.overwrite(loc.start, end, "<span data-value-id='" + id + "' style='border-bottom: 1px solid red'>" + 
                    (loc.type === "returnStatement" ? "return" : info.code.slice(loc.start, loc.end) )
                    
                + "</span>")
            }
        } catch (err) {
            errors.push(err)
        }
    })
    return `<html><body><pre>${m.toString().replace(/<script/g, "&lt;script")}</pre>
        <div id="overlay"></div>
        <div>ERRORS: <br>${errors.join("<br>")}</div>
        <script>
            window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(info.values))}"))

            document.querySelectorAll("[data-value-id]").forEach(function(el){
                var valId = el.getAttribute("data-value-id")
                var vals = window.values[valId]

                if (vals.length ===0) {
                    el.style.borderBottom ="1px solid lime"
                }
            })

            document.body.addEventListener("mouseover", function(e){
                var el = e.target
                console.log(el)
                var valId = el.getAttribute("data-value-id")
                if (!valId){return}
                var vals = window.values[valId]

                window.overlay = document.getElementById("overlay")
                overlay.setAttribute("style",
                    "top: " + (el.getBoundingClientRect().top + 20 + window.scrollY) +
                    "px; left: " + (el.getBoundingClientRect().left + 20) + "px"
                    + ";position: absolute; background: white; padding: 4px; border: 1px solid #ddd;"
                )
                if (vals.length > 0) {
                    overlay.innerHTML = "<pre>" + vals[0].replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>"
                } else {
                    overlay.innerText = "No values captured. This code didn't run."
                }
                
                console.log(vals)
            })

            
        </script>
        </body></body>`
}

var cc = require("fs").readFileSync("./test.js").toString()
console.log(module.exports.process("test.js", cc))

function getPlugin(url, js){
    var scriptId = scriptIdCounter
    urlToId[url] = scriptId
    console.log(urlToId)
    var info = new ScriptInfo()
    info.code = js
    scriptInfo[scriptId] = info

    var valueIdCounter = 1;

    function getValueId(loc){
        const id = valueIdCounter
        info.locations[id] = loc
        info.values[id] = []
        valueIdCounter++;
        return id
    }
    scriptIdCounter++;

    function hasParent(type, path) {
        var parentPath = path
        while (parentPath = path.parentPath) {
            if (parentPath.node.type === type) {
                return true
            }
        }
        return false
    }

    return function plugin(){
        return {
            visitor: {
                ReturnStatement: function(path){
                    if (path.node.ignore) {return}
                    if (!path.node.argument) {return}
                    path.node.ignore = true
                    path.node.argument = makeRecordValueCall(
                        path.node,
                        path.node.argument,
                        null,
                        "returnStatement"
                    )
                },
                FunctionExpression: handleFn,
                FunctionDeclaration: handleFn,
                CallExpression: function(path){
                    if (path.node.ignore) {return}
                    path.node.ignore = true
                    path.replaceWith(makeRecordValueCall(
                        path.node.callee,
                        path.node,
                        null,
                        "call"
                    ))

                },
                MemberExpression: function(path){
                    if (path.parent.type === "MemberExpression") {
                        return;
                    }
                    if (path.parent.type === "AssignmentExpression") {
                        return;
                    }
                    if (path.parent.type === "UpdateExpression") {
                        return;
                    }
                    if (path.parent.type === "CallExpression" && path.node === path.parent.callee) {
                        return;
                    }
                    if (path.node.ignore) {return}
                    path.node.ignore = true
                    path.replaceWith(
                        makeRecordValueCall(
                            path.node.property,
                            path.node,
                            path.node.object
                        )
                    )
                    
                    // console.log(path.node)
                }
            }
        }
    }

    function handleFn(path){
        path.node.params.forEach(function(param){
            path.node.body.body.unshift(
                t.expressionStatement(makeRecordValueCall(param, t.identifier(param.name)))
            )
        })
    }
    function makeRecordValueCall(node, value, memberExpressionParent, type){
        var args = [
                t.NumericLiteral(scriptId),
                t.NumericLiteral(getValueId({
                    start: node.start,
                    end: node.end,
                    loc: node.loc,
                    type
                })),
                value
            ]
    
        if (memberExpressionParent) {
            args.push(memberExpressionParent)
        }

        var call =t.callExpression(
            t.identifier("__jscbRecordValue"),
            args
        )
        call.ignore = true
        return call
    }
}
