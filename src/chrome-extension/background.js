console.log("bg")

let tabId = 0

let canLoadInsecureContent = true;

var requestOrder = []
var injected = false

function onBrowserActionClicked(tab) {
    canLoadInsecureContent = true
    tabId = tab.id
    injected = false
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);

chrome.runtime.onMessage.addListener(function(request, sender) {
    
    if (!request.isFromJSExtensionMessage) {return}
    console.log("########################Got message", request)
            fetch("http://localhost:8000/__jscb/reportValues", {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: request.cake,
            method: "post"
        })
});

 chrome.webRequest.onBeforeRequest.addListener(
           function(details) {
            if (details.tabId === tabId){
                if (details.type === "main_frame" ) {
                    if (details.url.indexOf("https://") !== -1) {
                        canLoadInsecureContent = false;
                    }
                    return
                }


                if (!injected) {
                    chrome.tabs.executeScript( tabId, {code: `
    window.addEventListener("RebroadcastExtensionMessage", function(evt) {
        console.log("REBROADCASRT", evt.detail)
        if (!evt.detail || !evt.detail.isFromJSExtensionMessage) {
            return
        }
        chrome.runtime.sendMessage(evt.detail);
    }, false);
                        `}, function(){
                        
                    })
                    injected = true
                }
                console.log("request for", details.url)
                if (details.url.indexOf("http://localhost:8000/request/") !== -1
                    || details.url.indexOf("__jscb") !== -1){
                        console.log("Not intercepting", details.url)
                    return
                }

                if (details.type !== "script") {
                    return
                }

                var requestId = Math.floor(Math.random() * 100000000000)
                var ret
                if (canLoadInsecureContent) {
                    ret = {redirectUrl: "http://localhost:8000/request/" + requestId}
                }
                else {
                    
                    ret = {cancel: true}
                }
                
                requestOrder.push(details.url)

                
                setTimeout(function(){
                    var oReq = new XMLHttpRequest();
                    oReq.addEventListener("load", function(){
                        console.log("loaded response for", requestId)
                        fetch("http://localhost:8000/response/" + requestId, {
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                response: oReq.responseText,
                                url: details.url,
                                returnProcessedContent: !canLoadInsecureContent
                            }),
                            method: "post"
                        })
                        .then(r => r.text())
                        .then(function(t){
                            
                            if (!canLoadInsecureContent) {
                                tryInject(details.url, t)
                                
                            }
                        })
                    });
                    oReq.open("GET", details.url);
                    oReq.send();   
                }, 300)

                return ret


                function tryInject(url, code) {
                    var inj = `
                        var scr = document.createElement("script")
                        scr.textContent = decodeURI("${encodeURI(code)}")
                        document.body.appendChild(scr)
                    `
                    var int = setInterval(function(){
                        
                        if (requestOrder[0] === url) {
                            requestOrder.shift()
                            chrome.tabs.executeScript( tabId, {code: inj}, function(){
                                console.log("DONE Injecting", details.url)
                                console.log("requestorder", requestOrder)
                            })
                            clearInterval(int)
                        }
                    }, 300)
                    
                }
            }
        
            
        },
    {urls: ["*://*/*"]},
    ["blocking"]
        );