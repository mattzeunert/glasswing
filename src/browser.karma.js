describe("serializeValue", function(){
    var specs = [
        {
            name: "an array of numbers",
            value: [1, 2],
            serialized: {
                type: "array",
                itemCount: 2,
                items: [1, 2]
            }
        },
        {
            name: "a large array of numbers",
            value: [1, 2, 3, 4, 5, 6, 7],
            serialized: {
                type: "array",
                itemCount: 7,
                items: [1, 2, 3, 4, 5]
            }
        },
        {
            name: "HtmlElements",
            value: document.createElement("div"),
            serialized: {
                type: "HTMLElement",
                tagName: "DIV",
                innerHTML: ""
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
                ],
                elementCount: 1
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
            serialized: {
                type: "string",
                text: "Hi",
                length: 2
            }
        },,
        {
            name: "long strings",
            value: new Array(10000).join("A"),
            serialized: {
                type: "string",
                text: new Array(1001).join("A"),
                length: 9999
            }
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
                type: "function",
                text: "function (){}"
            }
        },
        {
            name: "regular Expressions",
            value: /[a-z]*/g,
            serialized: {
                type: "Regular Expression",
                value: "/[a-z]*/g"
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
                konstructor: {
                    type: "function",
                    text: "function Object() { [native code] }"
                },
                keyCount: 2,
                data: {
                    five: 5,
                    "null": {
                        type: "null"
                    }
                }
            }
        },
        {
            name: "symbols",
            value: Symbol("A"),
            serialized: {
                type: "symbol"
            }
        },
    ]

    specs.forEach(function(spec){
        it("Can serialize " + spec.name, function(){
            expect(__jscb.serializeValue(spec.value)).toEqual(spec.serialized)
        })            
    })

})