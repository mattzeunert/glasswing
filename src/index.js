var request = require('request');
var endsWith = require("ends-with")
const MagicString = require( 'magic-string' );

var connect = require('connect');
var http = require('http');
var bodyParser = require('body-parser')

var app = connect();

var Compiler = require("./Compiler")
var compiler = new Compiler()

function DataStore(options){
    this.values = {}
    this.locations = options.locations
    this.code = options.code
}
DataStore.prototype.reportValue = function(data){
    if (!this.values[data.valueId]){
        this.values[data.valueId] = []
    }
    this.values[data.valueId].push(data.value)
}

var urlToScriptId = {}

const dataStores = {}
function getDataStore(scriptId){
    return dataStores[scriptId]
}

var scriptIdCounter = 1

app.use( bodyParser.json({limit: "300mb"}) );
app.use(function(req, res){
    if (req.url.indexOf("__jscb/reportValues") !== -1) {
        req.body.forEach(function(data){
            var dataStore = getDataStore(data.scriptId)
            dataStore.reportValue(data)
        })
        res.end('{"status": "success"}')
    }

    request.get('http://localhost:7777' + req.url, function (error, response, body) {
        if (body.indexOf("doctype") !== -1) {
            res.end(`<script>
                function valueToString(value, depth) {
                    if (depth === undefined) {
                        depth = 0;
                    }
                    if (depth > 4) {
                        return "TOO DEEP"
                    }
                    var valueString = ""
                    if (typeof value == "symbol") {
                        valueString = "(Symbol)"
                    } 
                    else if (value && value instanceof HTMLElement) {
                        return value.outerHTML
                    }
                    else if (value && value.attributes && value.cid) {
                        //backbone model
                        return "(Backbone model)\\n" + valueToString(value.attributes, depth + 1)
                    }
                    else if (value && value.jquery && value.on) {
                        // jquery object
                        var inside = Array.prototype.map.call(value, v => valueToString(v, depth + 1)).map(s => "  " + s).join(", \\n")
                        return "[" + inside + "]"
                    }
                    else if (value && value.length && value.map == Array.prototype.map) {
                        if (depth < 2) {
                            valueString = "[" + Array.prototype.map.call(value, v => valueToString(v, depth + 1)).join(",\\n  ") + "]"
                        } else {
                            try {
                                valueString = value + ""
                            } catch (err){
                                valueString =  "coulntd serialize"
                            }
                        }
                        
                    }
                    else if (typeof value === "object" && value !== null) {
                            valueString = "{\\n"
                            Object.keys(value).slice(0, 5).forEach(function(key){
                                var str = ""
                                try {
                                    str = valueToString(value[key], depth + 1)
                                } catch(err){
                                    str = "Coudn't serialize"
                                }
                                valueString += "    " + key + ": " + str + "\\n"
                            })
                            valueString += ", ...}"
                        }
                    else {
                        try {
                            valueString =  value + ""
                        } catch(e) {
                            valueString = "Couldn't serialize value"
                            console.log("couldn't serialize", value)
                        }
                        
                        
                    }

                    if (valueString.length > 400) {
                        valueString = valueString.slice(0, 400) + "...(truncated)"
                    }
                    return valueString
                }

                var recordedValueBuffer = []
                var __jscb = {
                    recordValue: function(scriptId, valueId, value, memberExpressionParent){
                        recordedValueBuffer.push({scriptId, valueId, value: valueToString(value)})
                        return value
                    }
                }
                window.__jscbRV = function(scriptId, valueId, value, memberExpressionParent){
                    return __jscb.recordValue.apply(this, arguments)
                }
                setInterval(function(){
                    var body = JSON.stringify(recordedValueBuffer)
                    console.log("sending " + recordedValueBuffer.length + " values", "size: ", body.length / 1024 /1024, "MB")
                    fetch("/__jscb/reportValues", {
                        headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                        },
                        body: body,
                        method: "post"
                    })
                    recordedValueBuffer = []
                }, 1000)
            </script>` + body)
        } else if (endsWith(req.url, ".js")) {
            var scriptId = scriptIdCounter
            scriptIdCounter++
            urlToScriptId[req.url] = scriptId 
            var compiled = compiler.compile(body, {
                scriptId
            })

            dataStores[scriptId] = new DataStore({
                code: body,
                locations: compiled.locations
            })
            res.end(compiled.code)
        } else if (endsWith(req.url, ".js?browse")) {
            var info = getDataStore(urlToScriptId[req.url.replace("?browse", "")])
            res.end(renderInfo(info))
        } else {
            res.end(body)
        }
    });
    
});


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
        <br><br><br>
        <div>ERRORS: <br>${errors.join("<br>")}</div>
        <script>
            window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(info.values))}"))

            document.querySelectorAll("[data-value-id]").forEach(function(el){
                var valId = el.getAttribute("data-value-id")
                var vals = window.values[valId]

                if (!vals) {
                    vals = []
                }
                if (vals.length ===0) {
                    if (el.style.backgroundColor === "red") {
                        el.style.backgroundColor = "gray"
                    }
                    el.style.borderBottom ="1px solid lime"
                }
            })

            document.body.addEventListener("mouseover", function(e){
                var el = e.target
                console.log(el)
                var valId = el.getAttribute("data-value-id")
                if (!valId){return}
                var vals = window.values[valId]
                if (!vals) {
                    vals = []
                }

                var overlay = document.getElementById("overlay")
                overlay.style.display = "block"
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

            document.body.addEventListener("mouseout", function(e){
                var el = e.target
                console.log(el)
                var valId = el.getAttribute("data-value-id")
                var overlay = document.getElementById("overlay")
                overlay.style.display = "none"
            })

            
        </script>
        </body></body>`
}

// var cc = require("fs").readFileSync("./test.js").toString()
// console.log(module.exports.process("test.js", cc))



//create node.js http server and listen on port
http.createServer(app).listen(8000);
