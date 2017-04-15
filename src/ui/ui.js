import React, {Component} from 'react';
import {render} from 'react-dom';

var setState = null

window.openingId = 1;

class OverlayContent extends Component {
    constructor(props){
        super(props)
        this.state = {}
    }
    componentWillMount(){
        setState = (values) =>{
            this.setState(values)
        }
    }
    render(){
        if (this.state.examples) {
            var examples = this.state.examples.examples
            window.openingId++
            return <div style={{fontFamily: "monospace"}}>
                <ValueExample key={window.openingId} example={examples[0]} isRoot={true} />
            </div>
        }
        return <div>no examples </div>
    }
}

function getValueFromExample(example){
    if (example.type === "string") {
        return example.text
    }else if (example.type === "object"){
        return example.data  
    } else if (example.type === "array") {
        return example.items
    }if (example.type === "function") {
        return "(function)"
    } else {
        return example
    }
}

class Preview extends Component {
    render(){
        var val = this.props.value
        if (typeof val === "number") {
            return <span style={{color: "blue"}}>{val}</span>
        }
        if (typeof val === "boolean") {
            return <span style={{color: "blue"}}>{val}</span>
        }
        if (val.type === "Too Deep") {
            return <span>Too deep, no data</span>
        }
        if (val.type === "string") {
            return <span style={{color: "red"}}>{val.text}</span>
        }
        if (val.type === "object") {
            return <span>(Object)</span>
        }
        if (val.type === "array"){
            return <span>(Array)</span>
        }
        return <span>(No preview)</span>

    }
}

class ValueExample extends Component {
    constructor(props) {
        super(props)
        this.state = {
            expandedPaths: []
        }
    }
    render(){
        var example = this.props.example;

        var items = []
        var depth = -1
        var path = []

        console.log("expandedPaths", this.state.expandedPaths)

        var t= this

        function isExpanded(path){
            console.log("isExpanded", path)
            return t.state.expandedPaths.indexOf(path.join(".")) !== -1
        }
        function traverse(e){
            depth++;
            function each(key, val){
                path.push(key)
                var expand = null;
                var canExpand = val.type === "object" || val.type==="Array"
                if (canExpand) {
                    expand = <span style={{
                            color: "#777",
                            fontSize: 10,
                            marginRight: -5
                    }}>{isExpanded(path) ? "▼" : "▶"}</span>
                } else {
                    // keep space free
                    expand = <span style={{visibility: "hidden", marginRight: -5}}>▼</span>
                }
                let p = path.join(".")
                items.push(<div onClick={
                    () => {
                        var newExpandedPaths = t.state.expandedPaths.slice()
                        if (t.state.expandedPaths.indexOf(p) === -1){
                            newExpandedPaths = newExpandedPaths.concat([p])
                        } else {
                            newExpandedPaths = _.reject(newExpandedPaths, pp => pp === p)
                        }
                        t.setState({expandedPaths: newExpandedPaths})
                    }
                } style={{paddingLeft: (depth + 1) * 20}}>
                    {expand} <span style={{color: "purple"}}>{key}</span>: <Preview value={val} />
                </div>)
                traverse(val)
                path.pop()
            }
            if (e && e.type === "object") {
                if (depth === 0 || isExpanded(path)) {
                    Object.keys(e.data).forEach(function(key){
                        each(key, e.data[key])
                    })
                }
            }
            if (e && e.type === "array") {
                if (depth === 0 || isExpanded(path)) {
                    e.items.forEach(function(item, key){
                        each(key, item)
                    })
                }
            }
            
            depth--;
        }
        traverse(example)
        console.log("items", items)
        return <div>
            {this.props.isRoot ? <Preview value={example} /> : null}
            {items}
        </div>
    }
}


var overlay = document.getElementById("overlay")
var overlayComp = <OverlayContent />
window.overlayComop = overlayComp
render(overlayComp, overlay)

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
        setState({examples: vals})

        function esc(str){
            if(str===undefined) debugger
            return str.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        }
        // overlay.innerHTML = "<pre>" + esc(JSON.stringify(vals.examples, null, 4))  + "</pre>"

        function renderTypes(type, depth){
            if (!type) {
                return "no info..."
            }
            if (!type){debugger}
            if (depth === undefined) {
                depth =0 
            }
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
                        return new Array(depth + 2).join("  ") + esc(key) + (t[key].optional ? "?" : "") + ":" + renderTypes(t[key].type, depth + 1)
                    }).join(",\n")
                    ret += "\n" + new Array(depth + 1).join("  ") + "}"
                    return ret
                } else {
                    return esc(JSON.stringify(t, null, 4))
                }
                
            }
            
        }
    } else {
        overlay.innerText = "No values captured. This code didn't run."
    }
    
})

document.body.addEventListener("mouseout", function(e){
    var el = e.target
    console.log(el)
    var valId = el.getAttribute("data-value-id")
    var overlay = document.getElementById("overlay")
    // overlay.style.display = "none"
})