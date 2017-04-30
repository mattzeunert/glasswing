var logging = {
    performance: false,
    requests: false,
    debug: false,
    receivedValues: false
}
function setConfig(verbose) {
    if (verbose) {
        logging = {
            performance: true,
            requests: true,
            debug: true,
            receivedValues: true
        }
    }
}

var perf = {}
function logPerfStart(label){
    if (!logging.performance) {return}
    perf[label] = new Date()
}
function logPerfEnd(label){
    if (!logging.performance) {return}
    console.log(label, "took", new Date().valueOf() - perf[label].valueOf(), "ms")
    delete perf[label]
}

function logRequest(request){
    if (!logging.requests) { return }
    console.log("[" + request.method + "]", request.url)
}

function debug(){
    if (!logging.debug) { return }
    console.log.apply(console, arguments)
}

function logReceivedValues(values){
    if (!logging.receivedValues) {return}
    console.log("Received " + values.length + " values")
}


var logger = {
    logRequest,
    logPerfStart,
    logPerfEnd,
    setConfig,
    debug,
    logReceivedValues
}
module.exports = logger