function valueToString(value, depth) {
    if (depth === undefined) {
        depth = 0;
    }
    if (depth > 4) {
        return "TOO DEEP"
    }
    var valueString = ""
    if (typeof value == "symbol") {
        valueString = "(Symbol)"
    } 
    else if (value && value instanceof HTMLElement) {
        return value.outerHTML
    }
    else if (value && value.attributes && value.cid) {
        //backbone model
        return "(Backbone model)\\n" + valueToString(value.attributes, depth + 1)
    }
    else if (value && value.jquery && value.on) {
        // jquery object
        var inside = Array.prototype.map.call(value, v => valueToString(v, depth + 1)).map(s => "  " + s).join(", \\n")
        return "[" + inside + "]"
    }
    else if (value && value.length && value.map == Array.prototype.map) {
        if (depth < 2) {
            valueString = "[" + Array.prototype.map.call(value, v => valueToString(v, depth + 1)).join(",\\n  ") + "]"
        } else {
            try {
                valueString = value + ""
            } catch (err){
                valueString =  "coulntd serialize"
            }
        }
        
    }
    else if (typeof value === "object" && value !== null) {
            valueString = "{\\n"
            Object.keys(value).slice(0, 5).forEach(function(key){
                var str = ""
                try {
                    str = valueToString(value[key], depth + 1)
                } catch(err){
                    str = "Coudn't serialize"
                }
                valueString += "    " + key + ": " + str + "\\n"
            })
            valueString += ", ...}"
        }
    else {
        try {
            valueString =  value + ""
        } catch(e) {
            valueString = "Couldn't serialize value"
            console.log("couldn't serialize", value)
        }
        
        
    }

    if (valueString.length > 400) {
        valueString = valueString.slice(0, 400) + "...(truncated)"
    }
    return valueString
}

var recordedValueBuffer = []
var __jscb = {
    recordValue: function(scriptId, valueId, value, memberExpressionParent){
        recordedValueBuffer.push({scriptId, valueId, value: __jscb.serializeValue(value)})
        return value
    },
    serializeValue
}

function serializeValue(value, depth){
    if (depth === undefined) {
        depth = 0;
    }
    if (depth > 3) {
        return {
            type: "Too Deep"
        }
    }
    function serialize(val){
        return serializeValue(val, depth + 1)
    }

    if (typeof value === "number") {
        return value
    }
    if (value instanceof HTMLElement) {
        return {
            type: "HTMLElement",
            tagName: value.tagName,
            children: Array.prototype.map.call(value.children, c => serialize(c))
        }
    }
    else if (value && value.length && value.map === Array.prototype.map) {
        return {
            type: "array",
            items: value.map(v => serialize(v))
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
    } else {
        console.log("unhandled value", value)
        return "Unhandled"
    }
}

window.__jscbRV = function(scriptId, valueId, value, memberExpressionParent){
    return __jscb.recordValue.apply(this, arguments)
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