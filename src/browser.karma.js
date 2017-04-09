describe("serializeValue", function(){
    var specs = [
        {
            name: "an array of numbers",
            value: [1, 2],
            serialized: {
                type: "array",
                items: [1, 2]
            }
        },
        {
            name: "HtmlElements",
            value: document.createElement("div"),
            serialized: {
                type: "HTMLElement",
                tagName: "DIV",
                children: []
            }
        },
        {
            name: "jQuery objects",
            value: {
                jquery: "1.7.1",
                length: 1,
                0: document.createElement("div"),
                on: function(){}
            },
            serialized: {
                type: "jQuery Object",
                elements: [
                    __jscb.serializeValue(document.createElement("div"))
                ]
            }
        },
        {
            name: "undefind",
            value: undefined,
            serialized: {
                type: "undefined"
            }
        },
        {
            name: "null",
            value: null,
            serialized: {
                type: "null"
            }
        },
        {
            name: "strings",
            value: "Hi",
            serialized: "Hi"
        },
        {
            name: "numbers",
            value: 5,
            serialized: 5
        },
        {
            name: "booleans",
            value: true,
            serialized: true
        },
        {
            name: "functions",
            value: function(){},
            serialized: {
                type: "function"
            }
        },
        {
            name: "objects",
            value: {
                five: 5,
                "null": null
            },
            serialized: {
                type: "object",
                keyCount: 2,
                data: {
                    five: 5,
                    "null": {
                        type: "null"
                    }
                }
            }
        }
    ]

    specs.forEach(function(spec){
        it("Can serialize " + spec.name, function(){
            expect(__jscb.serializeValue(spec.value)).toEqual(spec.serialized)
        })            
    })

})