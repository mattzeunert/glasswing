var request = require('request');
var endsWith = require("ends-with")

var connect = require('connect');
var http = require('http');
var processJS = require("./process-js")
var bodyParser = require('body-parser')

var app = connect();

app.use( bodyParser.json({limit: "300mb"}) );
app.use(function(req, res){
    if (req.url.indexOf("__jscb/reportValues") !== -1) {
        req.body.forEach(function(value){
            processJS.reportValue(value)
        })
        res.end('{"status": "success"}')
    }

    request.get('http://localhost:7777' + req.url, function (error, response, body) {
        if (body.indexOf("doctype") !== -1) {
            res.end(`<script>
                var recordedValueBuffer = []
                window.__jscbRecordValue = function(scriptId, valueId, value, memberExpressionParent){
                    var valueString = ""
                    if (typeof value == "symbol") {
                        valueString = "(Symbol)"
                    } 
                    else {
                        try {
                            valueString =  value + ""
                        } catch(e) {
                            valueString = "Couldn't serialize value"
                        }
                        
                        if (typeof value === "object" && value !== null) {
                            valueString += "{\\n"
                            // Object.keys(value).slice(0, 10).forEach(function(key){
                            //     var str = ""
                            //     try {
                            //         str = (value[key] + "")
                            //     } catch(err){
                            //         str = "Coudn't serialize"
                            //     }
                            //     valueString += "    " + key + ": " + str + "\\n"
                            // })
                            valueString += ", ...}"
                        }
                    }

                    if (valueString.length > 100) {
                        valueString = valueString.slice(0, 100) + "...(truncated)"
                    }
                    recordedValueBuffer.push({scriptId, valueId, value: valueString})
                    
                    return value
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
            res.end(processJS.process(req.url, body))
        } else if (endsWith(req.url, ".js?browse")) {
            res.end(processJS.browse(req.url.replace("?browse", "")))
        } else {
            res.end(body)
        }
    });
    
});



//create node.js http server and listen on port
http.createServer(app).listen(8000);
