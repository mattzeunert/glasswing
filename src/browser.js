if (!window.__jscb) {
    inittt()
}

function inittt() {
    var recordedValueBuffer = []
    var __jscb = {
        recordValue: function(scriptId, valueId, value, memberExpressionParent){
            
            recordedValueBuffer.push({scriptId, valueId, value: __jscb.serializeValue(value)})
            
            return value
        },
        serializeValue
    }

    function serializeValue(value, depth){
        // try {
        //     console.log("serializng", value)
        // } catch (err){console.log("serilaizng sth")}
        try {
            if (depth === undefined) {
                depth = 0;
            }
            if (depth > 4) {
                return {
                    type: "Too Deep"
                }
            }
            function serialize(val){
                return serializeValue(val, depth + 1)
            }

            if (value === undefined) {
                return {
                    type: "undefined"
                }   
            } else if (value === null) {
                return {
                    type: "null"
                }   
            } else if (typeof value === "string") {
                return {
                    type: "string",
                    length: value.length,
                    text: value.slice(0, 100)
                }
            }
            else if (typeof value === "number") {
                return value
            }
            else if (typeof value === "boolean") {
                return value
            }
            else if (typeof value === "function") {
                var match = value.toString().match(/__jscbFM\(([0-9]+, ?[0-9]+)\)/)
                if (!match){
                    return {
                        type: "function",
                        text: value.toString().slice(0, 100)
                    }
                }
                var fnIdentifier = match[1]
                fnIdentifier = fnIdentifier.replace(/[^0-9,]/g,"")
                var parts = fnIdentifier.split(",").map(s => parseFloat(s))
                // console.log("function", parts)
                return {
                    type: "function",
                    scriptId: parts[0],
                    locationId: parts[1]
                }
            }
            else if (value instanceof HTMLElement) {
                return {
                    type: "HTMLElement",
                    tagName: value.tagName,
                    children: Array.prototype.map.call(value.children, c => serialize(c))
                }
            }
            else if (value && value.length && value.map === Array.prototype.map) {
                return {
                    type: "array",
                    itemCount: value.length,
                    items: value.slice(0, 5).map(v => serialize(v))
                }
            } else if (value && value.jquery && value.length && value.on) {
                var elements = []
                for (var i=0; i<value.length; i++) {
                    elements.push(serialize(value[i]))
                }
                return {
                    type: "jQuery Object",
                    elements
                }
            } else if (typeof value === "object") {
                var data = {}
                var keys = Object.keys(value)
                keys.slice(0, 5).forEach(function(key){
                    data[key] = serialize(value[key])
                })
                return {
                    type: "object",
                    keyCount: keys.length,
                    data
                }
            } else if (typeof value === "symbol") {
                return {
                    type: "symbol"
                }
            } else {
                console.log("unhandled value", value)
                console.count("UNHANDLED")
                return "Unhandled"
            }
        } catch (err) {
            console.error(err)
            return "ERROR WHILE SERIALIZING"
        }
    }

    window.__jscbFM = function(){
        // don't need to do anything here...
    }
    // todo: make sure all values are actually sent... probs best to test by setting valuestosend max to 1 or 2
    window.__jscbRV = function(scriptId, valueId, value, memberExpressionParent){
        return __jscb.recordValue.apply(this, arguments)
    }
    setInterval(function(){
        if (recordedValueBuffer.length === 0) {
            return;
        }
        var valuesToSend = recordedValueBuffer.length; 
        if (valuesToSend > 250000) {
            valuesToSend = 250000
        }
        // debugger
        var body = JSON.stringify(recordedValueBuffer.slice(0, valuesToSend))
        console.time("Generate JSON")
        var body = "["
        for (var i=0; i<valuesToSend; i++) {
            if (i !== 0) {
                body += ","
            }
            var value = recordedValueBuffer[i]
            var str = JSON.stringify(value)
            if (str.length > 1000) {
                // console.log("Large serialized/stringified value", value)
            }
            body += str
        }
        body += "]"
        console.timeEnd("Generate JSON")
        console.log("sending " + valuesToSend + " values", "size: ", body.length / 1024 /1024, "MB")
        
        

        if (location.protocol === "http:") {
            fetch("http://localhost:8000/__jscb/reportValues", {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: body,
                method: "post"
            })
        } else {
            var event = new CustomEvent("RebroadcastExtensionMessage", {
                detail: {
                    "cake": body ,
                    isFromJSExtensionMessage: true
                }
            });
            window.dispatchEvent(event);
        }
        
        recordedValueBuffer = recordedValueBuffer.slice(valuesToSend)
        console.log("values in buffer: ", recordedValueBuffer.length)
    }, 1000)
}