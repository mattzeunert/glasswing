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
    browse: browse
};

function browse(url){
    console.log(url, "aaaa")
    const id = urlToId[url]
    return renderInfo(scriptInfo[id])
}

function ScriptInfo() {
    this.locations = {}
}

function renderInfo(info){
    var m = new MagicString(info.code)
    Object.keys(info.locations).forEach(function(id){
        var loc = info.locations[id]
        m.insertLeft(loc.start, "<span style='background: red'>x</span>")
    })
    return `<html><body><pre>${m.toString()}</pre></body></body>`
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
        valueIdCounter++;
        return id
    }
    scriptIdCounter++;
    return function plugin(){
        return {
            visitor: {
                FunctionExpression: handleFn,
                FunctionDeclaration: handleFn
            }
        }
    }

    function handleFn(path){
        path.node.params.forEach(function(param){
            path.node.body.body.unshift(
                t.callExpression(
                    t.identifier("__jscbRecordValue"),
                    [
                        t.NumericLiteral(scriptId),
                        t.NumericLiteral(getValueId({
                            start: param.start,
                            end: param.end,
                            loc: param.loc
                        })),
                        t.identifier(param.name)
                    ]
                )
            )
        })
    }

}
