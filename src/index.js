var request = require('request');
var endsWith = require("ends-with")
var escape = require('escape-html');
var getType = require("./analysis")
var fs = require("fs")
var _ = require("lodash")
const path = require('path');
var mkdirp = require('mkdirp')
var prettifyJS = require("./prettifyJS")

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
  .option('-v, --verbose', false)
  .option('-p, --save [path]', 'Directory to save data in')
  .parse(process.argv);

var port = program.port

var app = connect();

var Compiler = require("./Compiler")
var compiler = new Compiler()

var level = require('level')

function KeyValueStore(storeIn){
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



var async = require("async")



var logger = require("./logger")
logger.setConfig(program.verbose)




function DataStore(options){
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
    this.locations[data.valueId].hasValue = true
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
    }
}

function pathFromRoot(p){
    return path.join(__dirname + "/../", p)
}

function getAllValues(scriptId, cb){
    var store = getDataStore(scriptId)

    var allValues = {}
    async.eachSeries( Object.keys(store.locations), function iteratee(valueId, callback) {
        store.getValues(valueId, function(values){
            allValues[valueId] = values
            callback()
        })
    }, function(){
        cb(allValues)
    });
}

app.use( bodyParser.json({limit: "300mb"}) );
app.use(function(req, res){
    logger.logRequest(req.method, req.url)
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

        var scriptId = urlToScriptId[url]
        var info = getDataStore(scriptId)
        if (!info){
            res.end("No data for this file has been collected. Load a web page that loads this file")
        } else {
            var isDemo = false;
            renderInfo(info, scriptId, isDemo, text => res.end(text))
            
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
        
        resById[id] = res
        return
    }
    if (url.indexOf("/response") !== -1) {
        var id = url.split("/")[2]

        var response = req.body.response
        if (endsWith(req.body.url, ".js") || req.body.requestType === "script") {
            var scriptId = urlToScriptId[req.body.url]
            if (!scriptId){
                scriptId = scriptIdCounter
                scriptIdCounter++
                urlToScriptId[req.body.url] = scriptId
            }
            
            logger.logPerfStart("Prettify " + req.body.url)
            response = prettifyJS(response)
            logger.logPerfEnd("Prettify " + req.body.url)

            logger.logPerfStart("Compile " + req.body.url)
            var compiled = compiler.compile(response, {
                scriptId
            })
            logger.logPerfEnd("Compile " + req.body.url)

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
                    var locs = Object.keys(store.locations).filter(function(valueId){
                        type = store.locations[valueId].type
                        return type !== "functionLocation"
                    })
                    var locations = locs.length
                    var locationsWithValues = locs.filter(function(valueId){
                        return store.locations[valueId].hasValue
                    }).length
                    // rough percentage b/c funcitonlocations are also locations
                    var roughPercentage = Math.round(locationsWithValues / locations * 100 * 10) /10
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
        logger.logReceivedValues(req.body)

        logger.logPerfStart("Save " + req.body.length + " values")
        async.eachSeries(req.body, function iteratee(data, callback) {
            var dataStore = getDataStore(data.scriptId)
            dataStore.reportValue(data, callback) 
        }, function(){
            logger.logPerfEnd("Save " + req.body.length + " values")
            if (saveTo) {
                var data = {
                    stores: _.mapValues(dataStores, s => s.serialize()),
                    scriptIdCounter: scriptIdCounter,
                    urlToScriptId: urlToScriptId
                }

                var stringifiedData = JSON.stringify(data, null, 4)
                var mb = Math.round(stringifiedData.length / 1024 / 1024)
                logger.debug("Saving data to " + saveTo + ": " + mb + "MB")
                fs.writeFileSync(saveTo, stringifiedData)
            }
            
            
            res.end('{"status": "success"}')
        });

        
    }
});

function exportDemo(scriptId){
    var store = getDataStore(scriptId)

    var demoName = "simple"

    var parentDir= "docs/demos"
    var outDir = parentDir + "/" + demoName
    mkdirp.sync(outDir)

    getAllValues(scriptId, function(allValues){
        fs.writeFileSync(outDir + "/values.json", JSON.stringify(allValues, null, 4))
        
        fs.writeFileSync(outDir + "/locations.json", JSON.stringify(store.locations, null, 4))

        var code = JSON.stringify(store.code)
        fs.writeFileSync(outDir + "/code.js", store.code)

        var html = renderInfo(store, scriptId, true, function(html){
            fs.writeFileSync(outDir + "/index.html", html)

            var ncp = require('ncp').ncp;

            ncp(pathFromRoot("node_modules/monaco-editor"), parentDir + "/monaco-editor", function(){
                var bundle = fs.readFileSync(pathFromRoot("src/ui/dist/bundle.js")).toString()
                fs.writeFileSync(parentDir + "/bundle.js", bundle)
                console.log("DONE")
            })
        })
    })
}

// exportDemo(urlToScriptId["http://localhost:7777/demos/simple.js"])

function renderInfo(info,scriptId, isDemo, cb){
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
    fileName = _.last(info.url.split("/"))

        // window.values = JSON.parse(decodeURI("${encodeURI(JSON.stringify(res))}"));
    var valueEmbeds = `
        window.scriptId =${scriptId};
        window.isDemo = ${isDemo ? "true" : "false"}
    `

    

 
    var scriptEmbeds = ""
    if (isDemo){
        scriptEmbeds = `
        <script>
            fetch("locations.json")
            .then(r => r.json())
            .then(locations => {
                window.locations = locations

                fetch("code.js")
                .then(r => r.text())
                .then(code => {
                    window.code = code

                    fetch("values.json")
                    .then(r => r.json())
                    .then(function(values){
                        window.valueCache = values
                        launch()
                    })
                })
            })
        </script>
        `
    }

    if (isDemo){
        scriptEmbeds += `
        <script src="../monaco-editor/min/vs/loader.js"></script>
            <script>
                window.monacoVsRoot = '../monaco-editor/min/vs'
            </script>
            <script src="../bundle.js"></script>
            
        `
    } else {
        scriptEmbeds += `
        <script src="../node_modules/monaco-editor/min/vs/loader.js"></script>
            <script>
                window.monacoVsRoot = '/node_modules/monaco-editor/min/vs'
            </script>
            <script src="/__jscb/bundle.js"></script>
            
        `
    }


    cb(fs.readFileSync(__dirname + "/ui/file.html").toString()
    .replace("{{valueEmbeds}}", valueEmbeds)
    .replace("{{scriptEmbeds}}", scriptEmbeds)
    .replace("{{fileName}}", fileName))
    


    
    
}




//create node.js http server and listen on port
http.createServer(app).listen(port);
console.log("Listening on http://localhost:" + port)
