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
    console.log("REQUEST", req.url)
    if (req.url.indexOf("__jscb/reportValues") !== -1) {
        console.log("Received " + req.body.length + " values")
        req.body.forEach(function(data){
            var dataStore = getDataStore(data.scriptId)
            dataStore.reportValue(data)
        })
        res.end('{"status": "success"}')
    }

    request.get('http://localhost:7777' + req.url, function (error, response, body) {
        if (body.indexOf("doctype") !== -1) {
            res.end(`<script>
                ${require("fs").readFileSync("./src/browser.js").toString()}
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
            ${require("fs").readFileSync("src/ui/ui.js").toString()}

            
        </script>
        </body></body>`
}

// var cc = require("fs").readFileSync("./test.js").toString()
// console.log(module.exports.process("test.js", cc))



//create node.js http server and listen on port
http.createServer(app).listen(8000);
