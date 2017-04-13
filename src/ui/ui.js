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
            if (e && e.type === "object") {
                if (depth === 0 || isExpanded(path)) {
                    Object.keys(e.data).forEach(function(key){
                        path.push(key)
                        var val = e.data[key]
                        let p = path.join(".")
                        items.push(<div onClick={() => t.setState({expandedPaths: t.state.expandedPaths.concat([p])})} style={{paddingLeft: depth * 20}}>{key} => preview [{path.join(".")}]</div>)
                        traverse(val)
                        path.pop()
                    })
                }
            }
            if (e && e.type === "array") {
                if (depth === 0 || isExpanded(path)) {
                    e.items.forEach(function(item, key){
                        path.push(key)
                        var val = item
                        let p = path.join(".")
                        items.push(<div onClick={() => t.setState({expandedPaths: t.state.expandedPaths.concat([p])})} style={{paddingLeft: depth * 20}}>{key} => preview [{path.join(".")}]</div>)
                        traverse(val)
                        path.pop()
                    })
                }
            }
            
            depth--;
        }
        traverse(example)
        console.log("items", items)
        return <div>{items}</div>
        /*return <ObjectInspector
            data={example}
            nodeRenderer={
                ({ depth, name, data, isNonenumerable }) => {
                    if (data.type === "object"){ 
                        data = data.data
                    }
                    else if (data.type === "array") {
                        data = data.items
                    }
                    else if (data.type === "string") {
                        data = data.text
                    }
                    console.log(data)
                    return (depth === 0) ? <ObjectRootLabel name={name} data={data} />
                  : <ObjectLabel name={name} data={data} isNonenumerable={isNonenumerable} />
                }
            }
            />*/
        var ret = null
        if (typeof example === "number") {
            ret = {
                preview: <span style={{color: "blue"}}>{example}</span>
            }
        }
        else if (example.type === "string") {
            ret = {
                preview: <span style={{color: "red"}}>"{example.text}"</span>
            }
        } else if (example.type === "object") {
            var children = {}
            Object.keys(example.data).forEach(key => {
                children[key] = <ValueExample example={example.data[key]} />
            })
            ret = {
                preview: <span>"object"</span>,
                children
            }

            /*return <span style={{overflow: "hidden"}}>
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
        
            </span>*/
        } else if (example.type === "array") {
            var children = {}
            example.items.forEach(function(item, i){
                children[i] = <ValueExample example={example.items[i]} />  
            })
            ret = {
                preview: <span>array</span>,
                children
            }
            /*return <span style={{float: "left"}}>
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
            </span>*/
        } else {
            ret = {
                preview: <span>not handled</span>
            }
        }

        if (!this.state.isExpanded) {
            console.log("ret", ret)
            return <div>
                {ret.children ? <button onClick={() => this.setState({isExpanded: true})}>+</button> : null}
                {ret.preview}
            </div>
        } else {
            var children = Object.keys(ret.children).map(function(key){
                return <div>
                    <div style={{border: "1px solid blue", overflow: "hidden"}}>
                        <div style={{float: "left"}}> {key} </div>
                        <div style={{float: "left"}}> => </div>
                    </div>
                    <div> {ret.children[key]}</div>
                </div>
            })
            return <div style={{border: "1px solid red"}}>
                <div>{ret.preview}</div>
                <span style={{display: "inline-block", paddingLeft: this.props.isRoot ? 20 : 0}}>
                    {children}
                </span>
            </div>
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