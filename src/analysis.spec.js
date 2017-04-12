var getType = require("./analysis")

describe("stuff", function(){
    it("", function(){
        values = [
            5,
            5
        ]

        expect(getType(values)).toEqual(["number"])
    })

    it("", function(){
        values = [
            5,
            {
                type: "string",
                text: "a"
            }
        ]

        expect(getType(values)).toEqual(["number", "string"])
    })

    it("", function(){
        values = [
            {
                type: "object",
                keyCount: 1,
                data: {
                    a: 5
                }   
            }
        ]

        expect(getType(values)).toEqual([
            {
                a: {
                    type: ["number"]
                }
            }
        ])
    })

    it("assdf", function(){
        values = [
            {
                type: "object",
                keyCount: 1,
                data: {
                    a: 5
                }
            },
            {
                type: "object",
                keyCount: 2,
                data: {
                    a: 5,
                    b: 88
                }
            },
        ]

var t= getType(values)
// console.log(JSON.stringify(t, null, 4))
        expect(t).toEqual([
            {
                a: {
                    type: ["number"]
                },
                b: {
                    type: ["number"],
                    optional: true
                }
            }
        ])
    })

    it("assdf", function(){
        values = [
            {
                type: "object",
                keyCount: 1,
                data: {
                    a: 5,
                    b: 3
                }
            },
            {
                type: "object",
                keyCount: 2,
                data: {
                    a: 5,
                    c: 7
                }
            },
        ]

var t= getType(values)
console.log(JSON.stringify(t, null, 4))
        expect(t).toEqual([
            {
                a: {
                    type: ["number"]
                },
                b: {
                    type: ["number"],
                    optional: true
                },
                c: {
                    type: ["number"],
                    optional: true
                },
            }
        ])
    })
})