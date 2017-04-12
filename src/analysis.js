module.exports = function getType(values){
    var types = []
    console.log(values)
    values.forEach(function(value){
        var type = null
        if (typeof value === "number") {
            type = "number"
        }
        if (value && value.type == "string") {
            type = "string"
        }
        if (value && value.type === "object") {
            type = null
            types.forEach(function(t){
                if (typeof t === "object") {
                    Object.keys(value.data).forEach(function(key){
                        var propType = getType([value.data[key]])
                        if (!t[key]) {
                            t[key] = { 
                                type: propType,
                                optional: true
                            }
                        }
                    })
                    Object.keys(t).forEach(function(key){
                        if (!(key in value.data)) {
                            t[key].optional = true
                        }
                    })

                    type = "not null :)"
                }
            })
            if (type == null){
                type = {}
                Object.keys(value.data).forEach(function(key){
                    console.log("key", key)
                    type[key] = {
                        type: getType([value.data[key]])
                    }
                })
            }
        }
        
        if (type && type !== "not null :)" && types.indexOf(type) == -1) {
            types.push(type)
        }
    })

    return types
}