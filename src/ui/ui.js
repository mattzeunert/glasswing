

document.querySelectorAll("[data-value-id]").forEach(function(el){
    var valId = el.getAttribute("data-value-id")
    var vals = window.values[valId]

    if (!vals) {
        vals = []
    }
    if (vals.length ===0) {
        if (el.style.backgroundColor === "red") {
            el.style.backgroundColor = "gray"
        }
        el.style.borderBottom ="1px solid lime"
    }
})

document.body.addEventListener("mouseover", function(e){
    var el = e.target
    console.log(el)
    var valId = el.getAttribute("data-value-id")
    if (!valId){return}
    var vals = window.values[valId]
    if (!vals) {
        vals = []
    }

    var overlay = document.getElementById("overlay")
    overlay.style.display = "block"
    overlay.setAttribute("style",
        "top: " + (el.getBoundingClientRect().top + 20 + window.scrollY) +
        "px; left: " + (el.getBoundingClientRect().left + 20) + "px"
        + ";position: absolute; background: white; padding: 4px; border: 1px solid #ddd;"
    )
    if (vals) {
        function esc(str){
            if(str===undefined) debugger
            return str.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        }
        overlay.innerHTML = "<pre>" + renderTypes(vals.type)
            + "<br><h2>Examples</h2>" + esc(JSON.stringify(vals.examples, null, 4))  + "</pre>"

        function renderTypes(type){
            if (!type){debugger}
            console.log("render", type)
            if (type.length > 1) {
                return "(" + type.map(t => renderTypes([t])).join(" | ") + ")"
            }   if (type.length === 0) {
                return "(No type)"
            }
            else {
                var t = type[0]
                if (typeof t === "object") {
                    var ret = "{\n"
                    ret += Object.keys(t).map(function(key){
                        return "  " + esc(key) + (t[key].optional ? "?" : "") + ":" + renderTypes(t[key].type)
                    }).join(",\n")
                    ret += "\n}"
                    return ret
                } else {
                    return esc(JSON.stringify(t, null, 4))
                }
                
            }
            
        }
    } else {
        overlay.innerText = "No values captured. This code didn't run."
    }
    
    console.log(vals)
})

document.body.addEventListener("mouseout", function(e){
    var el = e.target
    console.log(el)
    var valId = el.getAttribute("data-value-id")
    var overlay = document.getElementById("overlay")
    overlay.style.display = "none"
})