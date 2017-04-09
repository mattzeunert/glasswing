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
        }
    ]

    specs.forEach(function(spec){
        it("Can serialize " + spec.name, function(){
            expect(__jscb.serializeValue(spec.value)).toEqual(spec.serialized)
        })            
    })

})