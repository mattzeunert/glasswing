const transform = require('babel-core').transform
const t = require("babel-types")
const StackFrame = require("stackframe")
const StackTraceGPS = require("stacktrace-gps")
const requestPromise = require("request-promise-native")
const async = require("async")

function Compiler(){

}
Compiler.prototype.compile = function(code, options){
    var plugin = getPlugin(options.scriptId, code)
    var babelResult = transform(code, {
        plugins: [plugin.plugin]
    })
    return new Promise(function(resolve, reject){
        applySourcemapsToLocations(plugin.locations, options.filePath).then(function(){
            const sourceFiles = []
            Object.keys(plugin.locations).forEach(function(locKey){
                const loc = plugin.locations[locKey]
                const fileName = loc.sourceMappedLocation.fileName
                if (sourceFiles.indexOf(fileName) === -1) {
                    sourceFiles.push(fileName)
                }
            })
            resolve({
                code: babelResult.code,
                sourceFiles: sourceFiles,
                locations: plugin.locations
            })
        })
    })
}


function applySourcemapsToLocations(locations, filePath){
    return new Promise(function(resolve, reject){
        var gps = new StackTraceGPS({
            ajax: function(url){
                console.log("stacktrace gps requesting", url)
                return requestPromise(url)
            }
        });
    
        async.each(Object.keys(locations), function(locationKey, callback) {
            const loc = locations[locationKey]
            var stackframeStart = new StackFrame({
                fileName: filePath, 
                lineNumber: loc.loc.start.line,
                columnNumber: loc.loc.start.column
            });
            var stackframeEnd = new StackFrame({
                fileName: filePath, 
                lineNumber: loc.loc.end.line,
                columnNumber: loc.loc.end.column
            });
            
            // console.log("location", locationKey)
            gps.pinpoint(stackframeStart).then(function(sourceMappedStackFrameStart){
                gps.pinpoint(stackframeEnd).then(function(sourceMappedStackFrameEnd){
                    console.log("done resolve", locationKey)
                    if (sourceMappedStackFrameStart.fileName === "/Users/mattzeunert/projects/js-code-browser/example/src/App.js" && sourceMappedStackFrameStart.lineNumber> 50) {
                        debugger
                    }
                    loc.sourceMappedLocation = {
                        fileName: sourceMappedStackFrameStart.fileName,
                        loc: {
                            start: {
                                line: sourceMappedStackFrameStart.lineNumber + 1,
                                column: sourceMappedStackFrameStart.columnNumber
                            },
                            end: {

                                // TODO: use end, but for some reason it's not source mapping correclty 
                                line: sourceMappedStackFrameEnd.lineNumber + 1,
                                column: sourceMappedStackFrameEnd.columnNumber
                            }
                        }
                    }
                    callback()
                })
            }, function(){
                console.log("failure", arguments, stackframe)
            })
        }, function complete(){
            console.log("complete")
            resolve()
        })
    })
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
                // Not sure how to show this in UI yet
                // CallExpression: function(path){
                //     if (path.node.ignore) {return}
                //     path.node.ignore = true
                //     path.replaceWith(makeRecordValueCall(
                //         path.node.callee,
                //         path.node,
                //         null,
                //         "call"
                //     ))

                // },
                AssignmentExpression: function(path){
                    var call = makeRecordValueCall(
                        path.node.left,
                        path.node.right
                    )
                    path.node.right = call
                },
                VariableDeclarator: function(path){
                    if (!path.node.init) {return}
                    var call = makeRecordValueCall(
                        path.node.id,
                        path.node.init
                    )
                    path.node.init = call
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

                    var prop = path.node.property
                    if (prop.type === "Identifier" && !path.node.computed) {
                        prop = t.stringLiteral(prop.name)
                    }
                    path.replaceWith(
                        makeMemberExpressionCall(
                            path.node.property,
                            path.node.object,
                            prop
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
        path.node.body.body.unshift(
            t.expressionStatement(makeFunctionMarkerCall(path.node))
        )
    }
    function makeFunctionMarkerCall(node){
         var args = [
            t.NumericLiteral(scriptId),
            t.NumericLiteral(getValueId({
                start: node.start,
                end: node.end,
                loc: node.loc,
                type: "functionLocation"
            }))
        ]
        var call = t.callExpression(
            t.identifier("__jscbFM")
            ,
            args
        )
        call.ignore = true
        return call
    }
    function makeRecordValueCall(node, value, ____removed, type){
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
    

        var call =t.callExpression(
            t.identifier("__jscbRV"),
            args
        )
        call.ignore = true
        return call
    }
    function makeMemberExpressionCall(node, object, property, type){
        var args = [
                t.NumericLiteral(scriptId),
                t.NumericLiteral(getValueId({
                    start: node.start,
                    end: node.end,
                    loc: node.loc,
                    type
                })),
                object,
                property
            ]
    

        var call =t.callExpression(
            t.identifier("__jscbME"),
            args
        )
        call.ignore = true
        return call
    }
}


module.exports = Compiler