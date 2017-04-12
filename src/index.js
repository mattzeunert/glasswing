var request = require('request');
var endsWith = require("ends-with")
var escape = require('escape-html');
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
                    locations: compiled.locations
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
        html += Object.keys(urlToScriptId).map(url => `<a href="/browse?${encodeURIComponent(url)}">${escape(url)}</a>`).join("<br>")
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
    return `<html><body><pre>${m.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/OPENTAG/g, "<").replace(/CLOSETAG/g, ">")}</pre>
        <div id="overlay"></div>
        <br><br><br>
        <div>ERRORS: <br>${errors.join("<br>")}</div>
        <script>
            window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(info.values))}"))
            ${require("fs").readFileSync("src/ui/ui.js").toString()}

            
        </script>
        </body></body>`
}

// var cc = require("fs").readFileSync("./test.js").toString()
// console.log(module.exports.process("test.js", cc))



//create node.js http server and listen on port
http.createServer(app).listen(8000);
