

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
    if (vals.length > 0) {
        overlay.innerHTML = "Values: " + vals.length + "<br>" + "<pre>" + JSON.stringify(vals[0], null, 4).replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>"
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