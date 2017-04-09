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
    Object.keys(info.locations).forEach(function(id){
        var loc = info.locations[id]
        m.overwrite(loc.start, loc.end, "<span data-value-id='" + id + "' style='background: red'>" + 
            info.code.slice(loc.start, loc.end)
         + "</span>")
    })
    return `<html><body><pre>${m.toString()}</pre>
        <div id="overlay"></div>
        <script>
            window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(info.values))}"))
            document.body.addEventListener("mouseover", function(e){
                var el = e.target
                console.log(el)
                valId = el.getAttribute("data-value-id")
                if (!valId){return}
                var vals = window.values[valId]

                window.overlay = document.getElementById("overlay")
                overlay.setAttribute("style",
                    "top: " + (el.getBoundingClientRect().top + 20 + window.scrollY) +
                    "px; left: " + (el.getBoundingClientRect().left + 20) + "px"
                    + ";position: absolute; background: white; padding: 4px; border: 1px solid #ddd;"
                )
                if (vals.length > 0) {
                    overlay.innerText = JSON.stringify(vals)
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
    return function plugin(){
        return {
            visitor: {
                FunctionExpression: handleFn,
                FunctionDeclaration: handleFn,
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
                    if (path.parent.type === "CallExpression") {
                        return;
                    }
                    if (path.node.ignore) {return}
                    path.node.ignore = true
                    path.replaceWith(
                        makeRecordValueCall(
                            path.node,
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
                makeRecordValueCall(param, t.identifier(param.name))
            )
        })
    }
    function makeRecordValueCall(node, value, memberExpressionParent){
        var args = [
                t.NumericLiteral(scriptId),
                t.NumericLiteral(getValueId({
                    start: node.start,
                    end: node.end,
                    loc: node.loc
                })),
                value
            ]
    
        if (memberExpressionParent) {
            args.push(memberExpressionParent)
        }

        return t.callExpression(
            t.identifier("__jscbRecordValue"),
            args
        )
    }
}
