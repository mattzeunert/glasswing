import React, {Component} from 'react'
import {render} from 'react-dom'
import _ from "lodash"
// var config = require("../config")  // don't need it for now

window.start = function(){
    window.editor = monaco.editor.create(document.getElementById("code-container"), {
        value: window.code,
        language: "javascript",
        readOnly: true,
        scrollBeyondLastLine: false,
    });

    window.addEventListener("resize", function(){
        editor.layout()
    });

    var decorations = Object.keys(locations).map(function(key){
        var location = locations[key].loc
        if (!location) {
            console.log("not sure wht this is... look into, no location info")
            return
        }
        var type = locations[key].type
        var start = location.start
        var end = location.end
        if (type === "returnStatement") {
            end = {line: start.line, column: start.column + "return".length }
        }
        if (type === "functionLocation") {
            return
        }
        // if (type === "call"  ) {
        //     console.log("TODO: INSERT STH WITH RETVAL instead...")
         
        //     return
        // }

        start.column++
        end.column++
        
        var hasExamples = locations[key].hasValue

        return  {
            range: new monaco.Range(start.line, start.column, end.line, end.column),
            options: {
                isWholeLine: false,
                inlineClassName: "value value-" + key + " " + (hasExamples ? "" : "value--no-data")
            }
        }

        
        console.log(location.loc)
    })
    decorations = decorations.filter(x => x !== undefined)

    goToLineInHash()
    editor.deltaDecorations([], decorations);
}


window.onhashchange  = function(){
    goToLineInHash()
}

function goToLineInHash(){
    var line = parseFloat(location.hash.replace("#", ""))
    if (line) {
        var LINE_HEIGHT = 18
        editor.setScrollTop((line - 2) * LINE_HEIGHT)
        editor.setSelection(new monaco.Range(line, 1, line, 1000))
    }
}
window.goToLineInHash = goToLineInHash

var setState = null

window.openingId = 1;

function getValues(scriptId, valueId, cb){
    if (window.valueCache[valueId]) {
        cb(window.valueCache[valueId])
    } else {
        fetch("/__jscb/getValues/" + scriptId + "/" + valueId)
        .then(r=>r.json())
        .then(function(values){
            window.valueCache[valueId] = values;
            cb(values)
        })
    }
}

class OverlayContent extends Component {
    constructor(props){
        super(props)
        this.state = {
            valueId: -1
        }
    }
    componentWillMount(){
        setState = (valueId) => {
            this.setState({
                exampleIndex: 0,
                previewExampleIndex: null,
                valueId: valueId,
                examples: {examples: []},
                hasFetchedExamples: false
            })
            getValues(scriptId, valueId, (examples) => this.setState({
                examples: {examples},
                hasFetchedExamples: true
            }))
        }
    }
    render(){
        if (!this.state.hasFetchedExamples) {
            return null
        }

        if (this.state.examples) {
            var examples = this.state.examples.examples
            window.openingId++

            var exampleNav = null;
            if (examples && examples.length > 1) {
                exampleNav = <div style={{background: "#ccc"}}>
                    {examples.map((e, i) => {
                        var previousExamples = examples.slice(0, i)
                        var previousExamplesThatAreSame = previousExamples.filter(function(prevExample){
                            return JSON.stringify(prevExample) == JSON.stringify(e)
                        })
                        var isUnique = previousExamplesThatAreSame.length === 0
                        var isSelected = this.state.exampleIndex === i
                        var className = "example-nav-item "
                        if (isUnique) {
                            className += "example-nav-item__unique "   
                        }
                        if (isSelected ){ 
                            className += "example-nav-item__selected "   
                        }
                        return <button
                            onClick={() => this.setState({exampleIndex: i})}
                            className={className}
                            onMouseEnter={() => this.setState({previewExampleIndex: i})}
                            onMouseLeave={() => this.setState({previewExampleIndex: null})}
                            >
                            {i}
                        </button>
                    })}
                </div>
            }
            var exampleView = null;
            var hasExamples = examples && examples.length > 0
            if (hasExamples) {
                if (this.state.previewExampleIndex === null) {
                    exampleView = <ExampleView example={examples[this.state.exampleIndex]} />
                } else {
                    exampleView = <ExampleView example={examples[this.state.previewExampleIndex]} />
                }
            }
            else {
                exampleView = <span>No value captured, this code didn't run.</span>
            }
            return <div style={{fontFamily: "monospace", cursor: "default", 
                border: "1px solid #ddd",
                background: "white"
            }}>
                {exampleNav}
                <div style={{padding: 4}}>
                    {exampleView}
                </div>
            </div>
        }
        return <div>no examples </div>
    }
}

class ExampleView extends Component {
    render() {
        return <div>
            <ValueExample key={window.openingId} example={this.props.example} isRoot={true}/>
        </div>
    }
}

class FunctionPreview extends Component {
    constructor(props){
        super(props)
        this.state = {}
    }
    componentDidMount(){
        var value = this.props.value;
        if (!value.scriptId) {
            this.setState({text: value.text})
        } else {
            fetch("/__jscb/fetchFunctionCode/" + value.scriptId + "/" + value.locationId)
            .then(t => t.json())
            .then(json => this.setState({
                text: json.text,
                url: json.url
            }))   
        }
    }
    render(){
        return <span>
            {this.props.value.scriptId ? (<span><button onClick={() => window.location = this.state.url}>Go to definition</button><br/></span>) : null}
            <pre style={{display: "inline"}}>{this.state.text ? this.state.text.split(/\n/g).slice(0, 10).join("\n") : null}</pre>
        </span>
    }
}

class StringPreview extends Component {
    constructor(props){
        super(props)
        this.state = {
            isExpanded: false
        }
    }
    render(){
        var val = this.props.value
        var PREVIEW_STRING_LENGTH = 50
        var previewIsTruncated = val.text.length > PREVIEW_STRING_LENGTH
        var toggleButton = null
        var preview = null
       
        var stringView = null
        if (!this.state.isExpanded) {
            var v = val.text.slice(0, PREVIEW_STRING_LENGTH).replace(/\n/g, "\\n")
            if (previewIsTruncated) {
                v += "..."
            }
            stringView = <span style={{display: "inline", color: "red"}}>"{v}"</span>
        } else {
            var fullText = val.text
            var isTruncated = val.length > val.text.length
            if (isTruncated) {
                fullText += "..."
            }
            stringView = <span style={{display: "inline-block", maxWidth: "80vw", overflow: "auto"}}>
                <pre style={{
                    display: "inline",
                    color: "red",
                    background: "white"
                }}>"{fullText}"</pre>
            </span>
        }

        if (previewIsTruncated) {
            toggleButton = <button
                className="toggle-value-detail-button"
                onClick={() => this.setState({isExpanded: !this.state.isExpanded})}>
                {this.state.isExpanded ? "-" : "+"}
            </button>
        } else {
            return stringView
        }

        return <div style={{overflow: "hidden"}}>
            <div style={{width: 30, float: "left"}}>{toggleButton}</div>
            <div style={{width: "calc(100% - 30px", float: "left"}}>{stringView}</div>
        </div>
    }
}

class Preview extends Component {
    render(){
        var val = this.props.value
        if (typeof val === "number") {
            return <span style={{color: "blue"}}>{val}</span>
        }
        if (typeof val === "boolean") {
            return <span style={{color: "blue"}}>{val + ""}</span>
        }
        if (val.type === "Too Deep") {
            return <span>Too deep, no data</span>
        }
        if (val.type === "UI Message") {
            return <span>{val.text}</span>
        }
        if (val.type === "Regular Expression") {
            return <span style={{color: "red"}}>{val.value}</span>
        }
        if (val.type === "string") {
            return <StringPreview value={val} />
        }
        if (val.type === "object") {
            return <span>
                (Object)
                {" {" + Object.keys(val.data).join(", ") +"}" }
            </span>
        }
        if (val.type === "array"){
            return <span>
                (Array) [{val.itemCount}]
            </span>
        }
        if (val.type === "function") {
            return <span>(Function)</span>
        }
        if (val.type === "undefined") {
            return <span style={{color: "blue"}}>undefined</span>
        }
        if (val.type === "functionDetail") {
            return <FunctionPreview value={val.fn} />
        }
        if (val.type === "jQuery Object") {
            return <span>
                jQuery Object [{val.elementCount}]
            </span>
        }
        if (val.type === "HTMLElement") {
            return <span>
                {"<" + val.tagName.toLowerCase() + ">" + val.innerHTML + "<" + val.tagName.toLowerCase() + ">"}
            </span>
        }
        return <span>(No preview) <br/><pre>{JSON.stringify(val)}</pre></span>

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
                var canExpand = (val.type === "object" || val.keyCount > 0) ||
                    (val.type === "array" && val.itemCount > 0) || 
                    (val.type === "jQuery Object" && val.elementCount > 0) ||
                    (val.type === "function")
                console.log("val.type", val.type)
                if (canExpand) {
                    expand = <span style={{
                            color: "#777",
                            fontSize: 10,
                            marginRight: -5
                    }}>{isExpanded(path) ? "▼" : "▶"}</span>
                } else {
                    // keep space free
                    expand = <span style={{visibility: "hidden",fontSize: 10, marginRight: -5}}>▼</span>
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
                    each("constructor", e.konstructor)
                    Object.keys(e.data).forEach(function(key){
                        each(key, e.data[key])
                    })
                    var uncollectedValues = e.keyCount - Object.keys(e.data).length
                    if (uncollectedValues > 0) {
                        each("...", {
                            type: "UI Message",
                            text: "(" + uncollectedValues + " value(s) not collected)"
                        })
                    }
                }
            }
            if (e && e.type === "array") {
                if (depth === 0 || isExpanded(path)) {
                    e.items.forEach(function(item, key){
                        each(key, item)
                    })
                    var uncollectedValues = e.itemCount - e.items.length
                    if (uncollectedValues > 0) {
                        each("...", {
                            type: "UI Message",
                            text: "(" + uncollectedValues + " value(s) not collected)"
                        })
                    }
                }
            }
            if (e && e.type === "jQuery Object") {
                if (depth === 0 || isExpanded(path)) {
                    e.elements.forEach(function(item, key){
                        each(key, item)
                    })
                }
            }
            if (e && e.type === "function") {
                if (depth === 0 || isExpanded(path)) {
                    each("code", {
                        type: "functionDetail",
                        fn: e
                    })
                }
            }
            
            
            depth--;
        }
        traverse(example)
        // console.log("items", items)
        return <div>
            {this.props.isRoot ? <Preview value={example} /> : null}
            {items}
        </div>
    }
}


var overlay = document.getElementById("overlay")
overlay.style.display = "none"
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

var enteredOverlay = false
var shouldHideOverlaySoon = true
overlay.addEventListener("mouseenter", function(e){
    console.log("mouseenter", e.target)
    enteredOverlay = true;
    setTimeout(function(){
        enteredOverlay = false
    }, 500)
    shouldHideOverlaySoon = false
})
overlay.addEventListener("mouseleave", function(e){
    console.log("mouseleave", e.target)
    shouldHideOverlaySoon = true
    setTimeout(function(){
        if (shouldHideOverlaySoon) {
            overlay.style.display = "none"
        }
    }, 1000)
})

var lastEnteredId = null
document.body.addEventListener("mouseover", function(e){
    
    var el = e.target
    // console.log(el)
    var match = el.className.match(/value-([0-9]+)/)
    if (match === null) {
        return
    }
    console.log("mouseover", e.target)
    
    var valId = parseFloat(match[1])
    lastEnteredId = valId
    var overlay = document.getElementById("overlay")
    overlay.style.display = "block"
    overlay.setAttribute("style",
        "top: " + (el.getBoundingClientRect().top + window.scrollY + 12) +
        "px; left: " + (el.getBoundingClientRect().left) + "px"
        + ";position: absolute;padding-top: 8px;"
    )

    setState(valId)

})

document.body.addEventListener("mouseleave", function(e){
    console.log("mouseleave2", e.target)
    var el = e.target
    if (el.className.indexOf("value") === -1) {
        return
    }
    var valId = el.className.split(" ").filter(c => c.indexOf("value-") !== -1)[0].replace(/[^0-9]/g,"")
    if (valId !== lastEnteredId) {
        return;
    }
    {/*console.log(el)*/}
    var valId = el.getAttribute("data-value-id")
    var overlay = document.getElementById("overlay")
    setTimeout(function(){
        if (!enteredOverlay) {
            overlay.style.display = "none"
        }
    }, 400)
    
})