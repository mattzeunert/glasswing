var request = require('request');
var endsWith = require("ends-with")

var connect = require('connect');
var http = require('http');
var processJS = require("./process-js")

var app = connect();

app.use(function(req, res){
    console.log("#######################")
    console.log("#######################")
    console.log("#######################")
    console.log("#######################")
    console.log("#######################")
    request.get('http://todomvc.com' + req.url, function (error, response, body) {
        if (body.indexOf("doctype") !== -1) {
            res.end(`<script>
                window.__jscbRecordValue = function(scriptId, valueId, value){
                    console.log("value", arguments)
                }
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
