import React, {Component} from 'react';
import {render} from 'react-dom';

var setState = null

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
            
            return <ValueExample example={examples[0]} isRoot={true} />
        }
        return <div>no examples </div>
    }
}

class ValueExample extends Component {
    constructor(props) {
        super(props)
        this.state = {
            
        }
    }
    render(){
        var example = this.props.example;
        if (typeof example === "number") {
            return <span style={{color: "blue"}}>{example}</span>
        }
        else if (example.type === "string") {
            return <span style={{color: "red"}}>"{example.text}"</span>
        } else if (example.type === "object") {
            return <span style={{overflow: "hidden"}}>
                {this.props.isRoot ? <div>Object</div> : null}
                <span style={{paddingLeft: 20, display: "inline-block"}}>
                    {
                        Object.keys(example.data).map((key) => {
                            return <div style={{overflow: "hidden"}}>
                                <div style={{float: "left"}}>
                                    <span style={{color: "purple"}}>{key}</span>: 
                                    <pre style={{display: "inline"}}> </pre>
                                    {example.data[key].type === "object" ? 
                                        <span>Object 
                                        <button onClick={() => this.setState({
                                            [key + "isExpanded"]: !this.state[key + "isExpanded"]
                                        })}>
                                            {this.state[key + "isExpanded"] ? "-" : "+" }
                                        </button>
                                        
                                        <br/></span>
                                        : ""}
                                </div>    
                                {(this.state[key + "isExpanded"] || example.data[key].type !== "object") ? 
                                    <ValueExample example={example.data[key]} />
                                    : null
                                }
                                
                            </div>
                        })
                    }
                </span>
        
            </span>
        } else if (example.type === "array") {
            return <span style={{float: "left"}}>
                <div>
                    Array
                    <button onClick={() => this.setState({arrayIsExpanded: !this.state.arrayIsExpanded}) }>
                        {this.state.arrayIsExpanded ? "-" : "+" }
                    </button>
                </div>
                { (this.state.arrayIsExpanded || this.props.isRoot) ? 
                    <div>
                        <div>[</div>
                        <div>
                            {example.items.map(item => 
                                <div>
                                    <div style={{paddingLeft: 20}}>
                                        {item.type === "object" ? <div>Object</div>: ""}

                                        <ValueExample example={item} />
                                    </div>
                                    <div>,</div>
                                </div>
                            )}
                        </div>
                        <div>]</div>
                    </div>
                : null }
            </span>
        } else {
            return <span>not handled</span>
        }
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