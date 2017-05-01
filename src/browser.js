if (!window.__jscb) {
    inittt()
}

function inittt() {
    try {
        {{REPLACE_WITH_CONFIG}}
    } catch (err) {
        // replace with config might not be defined, but that's ok..
    }

    var numberOfValuesCollectedByScriptIdValueId = {}
    var __jscb = {
        recordValue: function(scriptId, valueId, value){
            var id = scriptId + "_" + valueId
            if (!numberOfValuesCollectedByScriptIdValueId[id]) {
                numberOfValuesCollectedByScriptIdValueId[id] = 0
            }
            if (numberOfValuesCollectedByScriptIdValueId[id] > 4) {
                // enough values already...
                return value
            }
            numberOfValuesCollectedByScriptIdValueId[id] = numberOfValuesCollectedByScriptIdValueId[id] + 1


            __jscb.recordedValueBuffer.push({scriptId, valueId, value: __jscb.serializeValue(value)})
            
            return value
        },
        serializeValue,
        recordedValueBuffer: []
    }
    window.__jscb = __jscb

    function serializeValue(value, depth){
        // return {obj: "dont bother"}
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
                var maxChar = depth < 2 ? config.MAX_STRING_LENGTH_SHALLOW : config.MAX_STRING_LENGTH_DEEP
                return {
                    type: "string",
                    length: value.length,
                    text: value.slice(0, maxChar)
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
                    innerHTML: value.innerHTML.slice(0, 100)
                    // children: Array.prototype.map.call(value.children, c => serialize(c))
                }
            }
            else if (value.constructor === NodeList) {
                // NodeList was causing weird errors..., so add special handler
                return {
                    type: "NodeList"
                }
            }
            else if (value.constructor === DOMTokenList) {
                // DOMTokenList was causing weird errors..., so add special handler
                return {
                    type: "DOMTokenList"
                }
            }
            else if (value.constructor === MediaList) {
                // MediaList was causing weird errors..., so add special handler
                return {
                    type: "MediaList"
                }
            }
            else if (value.constructor === StyleSheetList) {
                // StyleSheetList was causing weird errors..., so add special handler
                return {
                    type: "StyleSheetList"
                }
            }
            else if (value.constructor === CSSRuleList) {
                // CSSRuleList was causing weird errors..., so add special handler
                return {
                    type: "CSSRuleList"
                }
            }
            else if (value && value.length !== undefined && value.map === Array.prototype.map) {
                return {
                    type: "array",
                    itemCount: value.length,
                    items: value.slice(0, config.MAX_ARRAY_VALUES_TO_COLLECT).map(v => serialize(v))
                }
            } else if (value && value.jquery && value.length && value.on) {
                var elements = []
                for (var i=0; i<value.length; i++) {
                    elements.push(serialize(value[i]))
                }
                return {
                    type: "jQuery Object",
                    elementCount: value.length, 
                    elements
                }
            } else if (value instanceof RegExp){
                return {
                    type: "Regular Expression",
                    value: value.toString()
                }                
            } else if (typeof value === "object") {
                var data = {}
                var keys = Object.keys(value)
                keys.slice(0, config.MAX_OBJECT_PROPERTY_VALUES_TO_COLLECT).forEach(function(key){
                    data[key] = serialize(value[key])
                })
                return {
                    type: "object",
                    keyCount: keys.length,
                    data,
                    konstructor: serialize(value.constructor)
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
            console.warn("Error while serializing value", err)
            return { type: "ERROR WHILE SERIALIZING" }
        }
    }

    window.__jscbFM = function(){
        // don't need to do anything here...
    }
    // todo: make sure all values are actually sent... probs best to test by setting valuestosend max to 1 or 2
    window.__jscbRV = function(scriptId, valueId, value){
        return __jscb.recordValue.apply(this, arguments)
    }
    window.__jscbME = function(scriptId, valueId, object, property) {
        var value = object[property]
        __jscb.recordValue(scriptId, valueId, value)
        return value
    }
    setInterval(function(){
        if (__jscb.recordedValueBuffer.length === 0) {
            return;
        }
        var valuesToSend = __jscb.recordedValueBuffer.length; 
        if (valuesToSend > 250000) {
            valuesToSend = 250000
        }
        // debugger
        var body = JSON.stringify(__jscb.recordedValueBuffer.slice(0, valuesToSend))
        console.time("Generate JSON")
        var body = "["
        for (var i=0; i<valuesToSend; i++) {
            if (i !== 0) {
                body += ","
            }
            var value = __jscb.recordedValueBuffer[i]
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
            fetch("http://localhost:{{port}}/__jscb/reportValues", {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: body,
                method: "post"
            })
        } else {
            console.log("using RebroadcastExtensionMessage to send values")
            var event = new CustomEvent("RebroadcastExtensionMessage", {
                detail: {
                    "cake": body ,
                    isFromJSExtensionMessage: true
                }
            });
            window.dispatchEvent(event);
        }
        
        __jscb.recordedValueBuffer = __jscb.recordedValueBuffer.slice(valuesToSend)
        console.log("values in buffer: ", __jscb.recordedValueBuffer.length)
    }, 1000)
}