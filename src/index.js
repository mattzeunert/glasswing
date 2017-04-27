var request = require('request');
var endsWith = require("ends-with")
var escape = require('escape-html');
var getType = require("./analysis")
var fs = require("fs")
var _ = require("lodash")
const path = require('path');
var mkdirp = require('mkdirp')

// not used anymore, using chrome extension to intercept request
var rewriteHtml = require("./rewriteHtml")


var connect = require('connect');
var http = require('http');
var bodyParser = require('body-parser')
var url = require("url")

var program = require('commander');

process.title = "Glasswing Server"

program
  .version('1.0.0')
  .option('-p, --port [port]', 'Glasswing port - not supported yet', 9500)
  .option('-p, --save [path]', 'Directory to save data in')
  .parse(process.argv);

var port = program.port

var app = connect();

var Compiler = require("./Compiler")
var compiler = new Compiler()

var level = require('level')

function KeyValueStore(storeIn){
    console.log("creating lvel db", storeIn)
    this.db = level(storeIn)
}
KeyValueStore.prototype.put = function(key, value, callback){
    this.db.put(key, value, function (err) {
        if (err) {
            console.log("LevelDB put err", err)
        }
        callback()
    })
}
KeyValueStore.prototype.get = function(key, callback){
    this.db.get(key, function (err, value) {
        if (err) {
            
        }
        callback(value)
    })
}

function beautifyJS(code){
    const prettier = require("prettier");
    const options= {
    // Indent lines with tabs
    useTabs: false,

    // Fit code within this line limit
    printWidth: 80,

    // Number of spaces it should use per tab
    tabWidth: 2,

    // If true, will use single instead of double quotes
    singleQuote: false,

    // Controls the printing of trailing commas wherever possible. Valid options:
    // "none" - No trailing commas
    // "es5"  - Trailing commas where valid in ES5 (objects, arrays, etc)
    // "all"  - Trailing commas wherever possible (function arguments)
    //
    // NOTE: Above is only available in 0.19.0 and above. Previously this was
    // a boolean argument.
    trailingComma: "none",

    // Controls the printing of spaces inside object literals
    bracketSpacing: true,

    // If true, puts the `>` of a multi-line jsx element at the end of
    // the last line instead of being alone on the next line
    jsxBracketSameLine: false,

    // Which parser to use. Valid options are "flow" and "babylon"
    parser: "babylon",

    // Whether to add a semicolon at the end of every line (semi: true),
    // or only at the beginning of lines that may introduce ASI failures (semi: false)
    semi: true
        }

    try {
        return prettier.format(code, options);
    } catch(err) {
        console.log("Prettier error:", err)
        return code
    }
}

var async = require("async")

var perf = {}
function logPerfStart(label){
    perf[label] = new Date()
}
function logPerfEnd(label){
    console.log(label, "took", new Date().valueOf() - perf[label].valueOf(), "ms")
}

function DataStore(options){
    console.log("new datastore with", options.url)
    // random b/c sometiems we have multipel stroes with same id.. shoudl really be same store
    if (!options.dbFileName) {
        this.dbFileName = encodeURIComponent(options.url).slice(-100)
    } else {
        this.dbFileName = options.dbFileName
    }
    this.values = new KeyValueStore(saveToDir + "/" + this.dbFileName) 

    this.url = options.url
    this.locations = options.locations
    this.code = options.code
}
DataStore.prototype.reportValue = function(data, callback){
    this.getValues(data.valueId, (values) => {
        values.push(data.value)
        this.values.put(data.valueId.toString(), JSON.stringify(values), callback)
    })
}
DataStore.prototype.getValues = function(valueId, callback){
    this.values.get(valueId, (values) => {
        if (values) {
            values = JSON.parse(values)
        } else {
            values = []
        }
        callback(values)
    })
}
DataStore.prototype.serialize = function(){
    return {
        dbFileName: this.dbFileName,
        url: this.url,
        locations: this.locations,
        code: this.code
    }
}
DataStore.deserialize =  function(data){
    var store = new DataStore(data)
    return store
}

var urlToScriptId = {}

var dataStores = {}
function getDataStore(scriptId){
    return dataStores[scriptId]
}

var scriptIdCounter = 1

const resById = {}

var saveToDir = null
var saveTo = null
if (program.save) {
    saveToDir = program.save
    mkdirp.sync(program.save)
    saveTo = program.save + "/data.json"
} else {
    console.error("--save option is required, pass in a directory like /tmp/glasswing1")
    process.exit()
}

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
        console.log("loaded urlToScriptId", urlToScriptId)
    }
}

function pathFromRoot(p){
    return path.join(__dirname + "/../", p)
}

app.use( bodyParser.json({limit: "300mb"}) );
app.use(function(req, res){
    var url = req.url.split("?")[0]

    if (url.indexOf("/node_modules/") !== -1) {
        var filePath = pathFromRoot(url.replace(/\.\./g, ""))
        var fileContent = fs.readFileSync(path.join(__dirname + "/../", url.replace(/\.\./g, "")))
        res.end(fileContent).toString()
        return
    }

    if (url === "/__jscb/bundle.js") {
        res.end(fs.readFileSync(pathFromRoot("src/ui/dist/bundle.js")).toString())
        return
    }

    if (url.indexOf("/__jscb/getValues") !== -1) {
        var parts = url.replace("/__jscb/getValues/", "").split("/").map(parseFloat)
        var scriptId = parts[0]
        var valueId = parts[1]

        var info = getDataStore(scriptId)
        info.getValues(valueId, function(values){
            res.end(JSON.stringify(values))
        })


        return
    }

    if (url.indexOf("/__jscb/getLocations") !== -1) {
        var scriptId = parseFloat(url.replace("/__jscb/getLocations/", ""))

        var info = getDataStore(scriptId)
        res.end(JSON.stringify(info.locations))


        return
    }

    if (url.indexOf("/__jscb/getCode") !== -1) {
        var scriptId = parseFloat(url.replace("/__jscb/getCode/", ""))

        var info = getDataStore(scriptId)
        res.end(info.code)


        return
    }


    if (req.url.indexOf("/browse") !== -1) {
        var url = decodeURIComponent(req.url).replace("/browse?", "")

        console.log("Url", url)
        console.log(urlToScriptId)
        var scriptId = urlToScriptId[url]
        var info = getDataStore(scriptId)
        if (!info){
            res.end("No data for this file has been collected. Load a web page that loads this file")
        } else {
            renderInfo(info, scriptId, text => res.end(text))
            
        }
        
    }

    if (url.indexOf("/__jscb/fetchFunctionCode") !== -1) {
        var parts = url.split("/")
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

    if (url.indexOf("/request") !== -1) {
        var id = url.split("/")[2]
        console.log("request started", id, decodeURIComponent(req.url.split("?")[1]))
        
        resById[id] = res
        return
    }
    if (url.indexOf("/response") !== -1) {
        var id = url.split("/")[2]
        console.log("Response", id, req.body.url)

        var response = req.body.response
        if (endsWith(req.body.url, ".js") || req.body.requestType === "script") {
            var scriptId = urlToScriptId[req.body.url]
            if (!scriptId){
                scriptId = scriptIdCounter
                scriptIdCounter++
                urlToScriptId[req.body.url] = scriptId
            }
            
            logPerfStart("Prettify " + req.body.url)
            response = beautifyJS(response)
            logPerfEnd("Prettify " + req.body.url)

            logPerfStart("Compile " + req.body.url)
            var compiled = compiler.compile(response, {
                scriptId
            })
            logPerfEnd("Compile " + req.body.url)

            if (!dataStores[scriptId]) {
                dataStores[scriptId] = new DataStore({
                    code: response,
                    locations: compiled.locations,
                    url: req.body.url
                })
            } else {
                if (dataStores[scriptId].code !== response) {
                    console.warn("It looks like the code for this file changed, you need to restart the server and save to a different location!", req.body.url)
                }
                console.log("re-using datastore for url", req.body.url)
            }
            

            response = compiled.code
        }
        
        var pre = fs.readFileSync(pathFromRoot("src/browser.js")).toString().replace("{{port}}", port) + "\n\n"
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
        
        
        return
    }
    

    if (url === "/") {
        var html = fs.readFileSync(__dirname + "/ui/home.html").toString()
        var scriptDataCollected = Object.keys(urlToScriptId).length  > 0
        var fileLinks
        if(scriptDataCollected) {
            fileLinks = Object.keys(urlToScriptId).map(url => {
                var scriptId = urlToScriptId[url]
                var store = dataStores[scriptId]
                var content = ""
                if (store === undefined) {
                    content = "No value store found"
                } else {
                    var values = Object.keys(store.values).length
                    var locations = Object.keys(store.locations).length
                    // rough percentage b/c funcitonlocations are also locations
                    var roughPercentage = Math.round(values / locations * 100 * 10) /10
                    content = `~${roughPercentage}%`
                }
                
                return `<tr>
                    <td>
                        <a href="/browse?${encodeURIComponent(url)}">${escape(url)}</a>
                    </td>
                    <td>
                        ${content}
                    </td>
                `
            }).join("")
            fileLinks = "<table class=\"file-links\">"  +
                `<thead><th>File</th><th style="min-width: 150px">Locations with values</th></thead>`
                + fileLinks + "</table>"
        } else {
            fileLinks = "<div>No data collected. Load a website and then click the Glassdoor Chrome extension button in the top right of your browser.</div>"
        }
        
        res.end(html.replace("{{fileLinks}}", fileLinks))
        return
    }

    if (url.indexOf("__jscb/reportValues") !== -1) {
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
        if (!req.body.length) {
            res.end()
            return
        }
        console.log("Received " + req.body.length + " values")

        logPerfStart("Save " + req.body.length + "values")
        async.eachSeries(req.body, function iteratee(data, callback) {
            var dataStore = getDataStore(data.scriptId)
            dataStore.reportValue(data, callback) 
        }, function(){
            logPerfEnd("Save " + req.body.length + "values")
            if (saveTo) {
                var data = {
                    stores: _.mapValues(dataStores, s => s.serialize()),
                    scriptIdCounter: scriptIdCounter,
                    urlToScriptId: urlToScriptId
                }

                var stringifiedData = JSON.stringify(data, null, 4)
                var mb = Math.round(stringifiedData.length / 1024 / 1024)
                console.log("Saving data to " + saveTo + ": " + mb + "MB")
                fs.writeFileSync(saveTo, stringifiedData)
            }
            
            
            res.end('{"status": "success"}')
        });

        
    }
});

function renderInfo(info,scriptId, cb){
    var res = {}

    var valueIds = Object.keys(info.locations)
    // async.eachSeries(valueIds, function iteratee(valueId, callback) {
    //     info.getValues(valueId, function(values){
    //         res[valueId] = {
    //             type: null, // types are out of scope for now
    //             examples: values
    //         }
    //         callback()
    //     })
    // }, function(){
        // });
    console.log("DONE")
        fileName = _.last(info.url.split("/"))

        // window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(res))}"));
    var valueEmbeds = `
        window.scriptId =${scriptId}
        
        
    `

    cb(fs.readFileSync(__dirname + "/ui/file.html").toString()
        .replace("{{valueEmbeds}}", valueEmbeds)
        .replace("{{fileName}}", fileName))
    
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
            ${require("fs").readFileSync(pathFromRoot("src/ui/lodash.js")).toString()}
            ${require("fs").readFileSync(pathFromRoot("src/ui/dist/bundle.js")).toString()}            
        </script>
        </body></body>`
}



//create node.js http server and listen on port
http.createServer(app).listen(port);
console.log("Listening on http://localhost:" + port)
