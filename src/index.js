var request = require('request');
var endsWith = require("ends-with")
var escape = require('escape-html');
var getType = require("./analysis")
const MagicString = require( 'magic-string' );
var fs = require("fs")
var beautify = require("js-beautify")
var _ = require("lodash")

// not used anymore, using chrome extension to intercept request
var rewriteHtml = require("./rewriteHtml")


var connect = require('connect');
var http = require('http');
var bodyParser = require('body-parser')
var url = require("url")

var program = require('commander');
 
program
  .version('1.0.0')
  .option('-p, --port [port]', 'Glasswing port - not supported yet', 9500)
  .parse(process.argv);

var port = program.port

var app = connect();

var Compiler = require("./Compiler")
var compiler = new Compiler()

function beautifyJS(code){
    return beautify.js_beautify(code, {indent_size: 2})
}

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
DataStore.prototype.serialize = function(){
    return {
        values: this.values,
        url: this.url,
        locations: this.locations,
        code: this.code
    }
}
DataStore.deserialize =  function(data){
    var store = new DataStore(data)
    store.values = data.values
    return store
}

var urlToScriptId = {}

var dataStores = {}
function getDataStore(scriptId){
    return dataStores[scriptId]
}

var scriptIdCounter = 1

const resById = {}

var saveTo = "/tmp/data.json"

if (saveTo) {
    try {
        var data = JSON.parse(fs.readFileSync(saveTo).toString())
    } catch (err) {}
    
    if (data) {
        scriptIdCounter = data.scriptIdCounter
        urlToScriptId = data.urlToScriptId
        dataStores = _.mapValues(data.stores, s => {
            return DataStore.deserialize(s)
        })
    }
}

app.use( bodyParser.json({limit: "300mb"}) );
app.use(function(req, res){
    if (req.url.indexOf("/node_modules/") !== -1) {
        res.end(fs.readFileSync("./" + req.url.replace(/\.\./g, "")).toString())
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
            res.end("No data for this file has been collected. Load a web page that loads this file")
        } else {
            res.end(renderInfo(info))
        }
        
    }

    if (req.url.indexOf("/__jscb/fetchFunctionCode") !== -1) {
        var parts = req.url.split("/")
        var locationId = parseFloat(parts.pop())
        var scriptId = parseFloat(parts.pop())
        var store = dataStores[scriptId]
        var loc = store.locations[locationId]
        var json = {
            text: store.code.slice(loc.start, loc.end),
            url: "/browse?" + encodeURIComponent(store.url) + "#" + loc.loc.start.line
        }
        res.end(JSON.stringify(json))
        return
    }

    if (req.url.indexOf("/request") !== -1) {
        var id = req.url.split("/")[2]
        console.log("request started", id)
        
        resById[id] = res
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

                response = beautifyJS(response)

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

            var pre = fs.readFileSync("src/browser.js").toString().replace("{{port}}", port) + "\n\n"
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
        var html = fs.readFileSync(__dirname + "/ui/home.html").toString()
        var scriptDataCollected = Object.keys(urlToScriptId).length  > 0
        var fileLinks
        if(scriptDataCollected) {
            fileLinks = Object.keys(urlToScriptId).map(url => {
                var scriptId = urlToScriptId[url]
                var store = dataStores[scriptId]
                var values = Object.keys(store.values).length
                var locations = Object.keys(store.locations).length
                // rough percentage b/c funcitonlocations are also locations
                var roughPercentage = Math.round(values / locations * 100 * 10) /10
                return `<tr>
                    <td>
                        <a href="/browse?${encodeURIComponent(url)}">${escape(url)}</a>
                    </td>
                    <td>
                        ~${roughPercentage}%
                    </td>
                `
            }).join("")
            fileLinks = "<table class=\"file-links\">"  +
                `<thead><th>File</th><th>Locations with values</th></thead>`
                + fileLinks + "</table>"
        } else {
            fileLinks = "<div>No data collected. Load a website and then click the Glassdoor Chrome extension button in the top right of your browser.</div>"
        }
        
        res.end(html.replace("{{fileLinks}}", fileLinks))
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

        var data = {
            stores: _.mapValues(dataStores, s => s.serialize()),
            scriptIdCounter: scriptIdCounter,
            urlToScriptId: urlToScriptId
        }

        fs.writeFileSync(saveTo, JSON.stringify(data, null, 4))
        
        res.end('{"status": "success"}')
    }



    
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
                examples: values
            }
        }
    })

    fileName = _.last(info.url.split("/"))
    
    var valueEmbeds = `
        window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(res))}"));
        window.code = decodeURI("${encodeURI(info.code)}");
        window.locations = JSON.parse(decodeURI("${encodeURI(JSON.stringify(info.locations))}"));
    `

    return fs.readFileSync(__dirname + "/ui/file.html").toString()
        .replace("{{valueEmbeds}}", valueEmbeds)
        .replace("{{fileName}}", fileName)
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
http.createServer(app).listen(port);
console.log("Listening on http://localhost:" + port)
