var request = require('request');
var endsWith = require("ends-with")

var connect = require('connect');
var http = require('http');
var processJS = require("./process-js")
var bodyParser = require('body-parser')

var app = connect();

app.use( bodyParser.json({limit: "100mb"}) );
app.use(function(req, res){
    if (req.url.indexOf("__jscb/reportValues") !== -1) {
        req.body.forEach(function(value){
            processJS.reportValue(value)
        })
        res.end('{"status": "success"}')
    }

    request.get('http://todomvc.com' + req.url, function (error, response, body) {
        if (body.indexOf("doctype") !== -1) {
            res.end(`<script>
                var recordedValueBuffer = []
                window.__jscbRecordValue = function(scriptId, valueId, value){
                    recordedValueBuffer.push({scriptId, valueId, value: value + ""})
                }
                setInterval(function(){
                    fetch("/__jscb/reportValues", {
                        headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(recordedValueBuffer),
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
