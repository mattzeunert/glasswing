const transform = require('babel-core').transform
const t = require("babel-types")


function Compiler(){
    
}
Compiler.prototype.compile = function(code, options){
    var plugin = getPlugin(options.scriptId, code)
    var babelResult = transform(code, {
        plugins: [plugin.plugin]
    })
    return {
        code: babelResult.code,
        locations: plugin.locations
    }
}

function getPlugin(scriptId, js){
    var valueIdCounter = 1;

    function getValueId(loc){
        const id = valueIdCounter
        pp.locations[id] = loc
        valueIdCounter++;
        return id
    }

    function hasParent(type, path) {
        var parentPath = path
        while (parentPath = path.parentPath) {
            if (parentPath.node.type === type) {
                return true
            }
        }
        return false
    }

    var pp = {
        plugin: plugin,
        locations: {}
    }
    return pp;

    function plugin(){
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
            t.identifier("__jscbRV"),
            args
        )
        call.ignore = true
        return call
    }
}


module.exports = Compiler