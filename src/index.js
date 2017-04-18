var request = require('request');
var endsWith = require("ends-with")
var escape = require('escape-html');
var getType = require("./analysis")
const MagicString = require( 'magic-string' );
var fs = require("fs")

var rewriteHtml = require("./rewriteHtml")

var connect = require('connect');
var http = require('http');
var bodyParser = require('body-parser')
var url = require("url")

var app = connect();

var Compiler = require("./Compiler")
var compiler = new Compiler()

function DataStore(options){
    this.values = {}
    this.url = options.url
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

var currentBaseUrl = null

const resById = {}

app.use( bodyParser.json({limit: "300mb"}) );
app.use(function(req, res){
    console.log(req.url)

    if (req.url.indexOf("/node_modules/monaco-editor") !== -1) {
        res.end(fs.readFileSync("./" + req.url.replace(/\.\./g, "")).toString())
        console.log("MM")
        return
    }
    if (req.url === "/__jscb/bundle.js") {
        res.end(fs.readFileSync("src/ui/dist/bundle.js").toString())
        return
    }

    if (req.url.indexOf("/browse") !== -1) {
        var url = decodeURIComponent(req.url).replace("/browse?", "")

        var info = getDataStore(urlToScriptId[url])
        if (!info){
            console.log(Object.keys(urlToScriptId))
            res.end("No data for this file has been collected. Load a web page that loads this file")
        } else {
            res.end(renderInfo(info))
        }
        
    }

    if (req.url.indexOf("/__jscb/fetchFunctionCode") !== -1) {
        var parts = req.url.split("/")
        console.log(parts)
        var locationId = parseFloat(parts.pop())
        var scriptId = parseFloat(parts.pop())
        console.log("scriptId", scriptId, "locId", locationId)
        var store = dataStores[scriptId]
        var loc = store.locations[locationId]
        var json = {
            text: store.code.slice(loc.start, loc.end),
            url: "/browse?" + encodeURIComponent(store.url) + "#" + loc.loc.start.line
        }
        res.end(JSON.stringify(json))
        return
    }

    // console.log("REQUEST", req.url)
    if (req.url.indexOf("/request") !== -1) {
        var id = req.url.split("/")[2]
        console.log("request started", id)
        
        resById[id] = res
        // console.log(Object.keys(resById))
        return
    }
    if (req.url.indexOf("/response") !== -1) {
        console.log("response", req.url.split("/")[2])
        setTimeout(function(){
            
            var response = req.body.response
            console.log("url", req.body.url)
            if (endsWith(req.body.url, ".js")) {
                var scriptId = scriptIdCounter
                scriptIdCounter++
                urlToScriptId[req.body.url] = scriptId 
                var compiled = compiler.compile(response, {
                    scriptId
                })

                dataStores[scriptId] = new DataStore({
                    code: response,
                    locations: compiled.locations,
                    url: req.body.url
                })

                response = compiled.code
            }
            



            var id = req.url.split("/")[2]
            console.log("resposne", id)

            var pre = fs.readFileSync("src/browser.js") + "\n\n"
            response = pre + response

            if (!req.body.returnProcessedContent) {
                var interval = setInterval(function(){
                    if (resById[id]) {
                        
                        resById[id].end(pre + response)
                        clearInterval(interval)
                    } else {
                        console.log("no request yet for" + id, "waiting...")
                    }
                    
                }, 100)
                res.end("OK")
            } else {
                res.end(response)
            }
                

            
            
            
            
        }, 1000)
        
        return
    }
    

    if (req.url === "/") {
        var html = ""
        html += "<h1>JS Code Browser</h1>"
        html += "<a href=\"?not-jscb\">Load through proxy </a><br>"
        html += `Enter web page to proxy: <form onSubmit="return onS(event)"><input type="text" id="url"></input>
            <button type="submit">Load</button></form>
            <script>
                window.onS = function(e){
                    e.preventDefault()
                    var url = document.querySelector("#url").value
                    var a = document.createElement("a")
                    a.href = url
                    location.href = "/" + encodeURIComponent(a.protocol + "//" + a.hostname) +
                     ( a.port ? (encodeURIComponent(":") + a.port) : "" ) +
                        a.pathname
                }
            </script>

            todo: security, collected data should not be available to any site
        `
        html += "Browse these JS files: (TODO: coverge numbers)<br>"
        html += Object.keys(urlToScriptId).map(url => {
            var scriptId = urlToScriptId[url]
            var store = dataStores[scriptId]
            var values = Object.keys(store.values).length
            var locations = Object.keys(store.locations).length
            // rough percentage b/c funcitonlocations are also locations
            var roughPercentage = Math.round(values / locations * 100 * 10) /10
            return `<a href="/browse?${encodeURIComponent(url)}">${escape(url)}</a> (${roughPercentage}%)`
        }).join("<br>")
        res.end(`<html><body>${html}</body></html>`)
        return
    }

    if (req.url.indexOf("__jscb/reportValues") !== -1) {
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
        if (!req.body.length) {
            res.end()
            return
        }
        console.log("Received " + req.body.length + " values")
        // console.log(req.body)
        req.body.forEach(function(data){
            var dataStore = getDataStore(data.scriptId)
            dataStore.reportValue(data)
        })
        res.end('{"status": "success"}')
    }


    
    // var forwardTo = null
    // var urlParts = req.url.split("/")
    // if (urlParts[1] === "proxy") {
        
    //     urlParts.shift()
    //     urlParts.shift()
    //     var protocol = urlParts.shift()
    //     var hostname = urlParts.shift()
    //     var port = urlParts.shift()
    //     var pathname = urlParts.join("/")
    //     forwardTo = protocol + "://" + hostname + ":" + port + "/" + pathname
    //     currentBaseUrl = protocol + "://" + hostname + ":" + port + "/" + pathname
    // } else {
    //     forwardTo = currentBaseUrl + req.url
    // }
    
    // console.log("forwardTo", forwardTo)
    // request.get(forwardTo, function (error, response, body) {
    //     if (error){
    //         console.log("ERROR", error)
    //     }
    //     // console.log(arguments)
    //     if (body.indexOf("doctype") !== -1 || body.indexOf("DOCTYPE") !== -1) {
    //         var updatedBody = rewriteHtml(body, currentBaseUrl)
            
    //         res.end(`<script>
    //             ${require("fs").readFileSync("./src/browser.js").toString()}
    //         </script>` + updatedBody
    //         )
    //     } else if (endsWith(req.url, ".js")) {
    //         var scriptId = scriptIdCounter
    //         scriptIdCounter++
    //         urlToScriptId[req.url] = scriptId 
    //         var compiled = compiler.compile(body, {
    //             scriptId
    //         })

    //         dataStores[scriptId] = new DataStore({
    //             code: body,
    //             locations: compiled.locations
    //         })
    //         res.end(compiled.code)
    //     } else if (endsWith(req.url, ".js?browse")) {
    //         var info = getDataStore(urlToScriptId[req.url.replace("?browse", "")])
    //         if (!info){
    //             res.end("No data for this file has been collected. Load a web page that loads this file")
    //         } else {
    //             res.end(renderInfo(info))
    //         }
    //     } else {
    //         res.end(body)
    //     }
    // });
    
});

function renderInfo(info){
    var res = {}
    Object.keys(info.values).forEach(function(key){
        var values = info.values[key]
        if (values.length === 0) {
            res[key] = null
        } else {
            res[key] = {
                type: null, // types are out of scope for now
                examples: values.slice(0, 1)
            }
        }
    })

     return `<html><body>
    <meta charset="utf-8" />    
        <div id="code-container" style="height: 100%">
            <style>
                body {
                    margin: 0;
                }
                .value {
                    border-bottom: 1px solid red;
                    cursor: pointer;
                }
                .value--no-data {
                    border-bottom: 1px solid gray;
                }
                .monaco-editor-hover {
                    display: none; // hide monaco type annotations
                }
            </style>
        </div>
        <div id="overlay"></div>
        <br><br><br>
        

         

        <script>
            
            window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(res))}"));
            window.code = decodeURI("${encodeURI(info.code)}");
            window.locations = JSON.parse(decodeURI("${encodeURI(JSON.stringify(info.locations))}"));

            ${require("fs").readFileSync("src/ui/lodash.js").toString()}
        </script>
        <script src="/__jscb/bundle.js"></script>

           <script src="../node_modules/monaco-editor/min/vs/loader.js"></script>
<script>
	require.config({ paths: { 'vs': '/node_modules/monaco-editor/min/vs' }});
	require(['vs/editor/editor.main'], function() {
        start()
		
	});
</script>
        </body></body>`
}


function renderInfoOldUnused(info){
    var m = new MagicString(info.code)
    var errors = []
    Object.keys(info.locations).forEach(function(id){
        var loc = info.locations[id]
        try {
            if (loc.type === "call") {
                m.insertLeft(loc.end, "OPENTAGspan data-value-id='" + id + "' style='background: red; color: white;border-radius: 4px;padding: 2;font-size: 12px'CLOSETAG" + 
                    "RET"
                + "OPENTAG/spanCLOSETAG")
            }
            else {
                var end = loc.end
                if (loc.type === "returnStatement") {
                    end = loc.start + "return".length
                }
                m.overwrite(loc.start, end, "OPENTAGspan data-value-id='" + id + "' style='border-bottom: 1px solid red'CLOSETAG" + 
                    (loc.type === "returnStatement" ? "return" : info.code.slice(loc.start, loc.end) )
                    
                + "OPENTAG/spanCLOSETAG")
            }
        } catch (err) {
            errors.push(err)
        }
    })

    var res = {}
    Object.keys(info.values).forEach(function(key){
        var values = info.values[key]
        if (values.length === 0) {
            res[key] = null
        } else {
            res[key] = {
                type: null, // types are out of scope for now
                examples: values.slice(0, 1)
            }
        }
    })

    return `<html><body>
    <meta charset="utf-8" /> 
    <pre>${m.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/OPENTAG/g, "<").replace(/CLOSETAG/g, ">")}</pre>
        <div id="overlay"></div>
        <br><br><br>
        <div>ERRORS: <br>${errors.join("<br>")}</div>
        <script>
            window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(res))}"));
            ${require("fs").readFileSync("src/ui/lodash.js").toString()}
            ${require("fs").readFileSync("src/ui/dist/bundle.js").toString()}            
        </script>
        </body></body>`
}

// var cc = require("fs").readFileSync("./test.js").toString()
// console.log(module.exports.process("test.js", cc))



//create node.js http server and listen on port
http.createServer(app).listen(8000);
