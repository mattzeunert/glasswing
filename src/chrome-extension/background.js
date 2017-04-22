console.log("bg")

sessionsByTabId = []

function onBrowserActionClicked(tab) {
    var session = sessionsByTabId[tab.id]
    if (session) {
        session.close()
        delete sessionsByTabId[tab.id]
        chrome.tabs.reload(tab.id)
    } else {
        sessionsByTabId[tab.id] = new Session(tab.id)
    }
}
chrome.browserAction.onClicked.addListener(onBrowserActionClicked);

var port = 9500



chrome.runtime.onMessage.addListener(function(request, sender) {
    if (!request.isFromJSExtensionMessage) {return}
    console.log("########################Got message", request)
    if (request.cake) {
        fetch("http://localhost:"  + port +"/__jscb/reportValues", {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: request.cake,
            method: "post"
        })
    }
        
});

function Session(tabId){
    this.tabId = tabId
    this.injected = false
    this.requestOrder = []
    this.closed = false

    this._open()
}
Session.prototype._open = function(){
    this._onBeforeRequest = makeOnBeforeRequest(this)

    chrome.webRequest.onBeforeRequest.addListener(this._onBeforeRequest, {urls: ["<all_urls>"], tabId: this.tabId}, ["blocking"]);

    chrome.tabs.reload(this.tabId)
}
Session.prototype.close = function(){
    this.closed = true
    this.updateBadge()
    chrome.webRequest.onBeforeRequest.removeListener(this._onBeforeRequest)
}
Session.prototype.updateBadge = function(){
    chrome.browserAction.setBadgeText({
        text: this.closed ? "" : "ON",
        tabId: this.tabId
    });
}


 function makeOnBeforeRequest(session){
    return function(details) {
        session.updateBadge()
        if (details.type === "main_frame" ) {
            if (details.url.indexOf("https://") !== -1) {
                session.canLoadInsecureContent = false
                console.log("https site, can't load insecure content")
            } else {
                session.canLoadInsecureContent = true;
            }
            return
        }

        if (!session.injected) {
            chrome.tabs.executeScript( session.tabId, {code: `
window.addEventListener("RebroadcastExtensionMessage", function(evt) {
    console.log("REBROADCASRT", evt.detail)
    if (!evt.detail || !evt.detail.isFromJSExtensionMessage) {
        return
    }
    chrome.runtime.sendMessage(evt.detail);
}, false);
                `}, function(){
                
            })
            session.injected = true
        }
        console.log("request for", details.url)
        if (details.url.indexOf("http://localhost:" + port + "/request/") !== -1
            || details.url.indexOf("__jscb") !== -1){
                console.log("Not intercepting", details.url)
            return
        }

        if (details.type !== "script") {
            return
        }

        var requestId = Math.floor(Math.random() * 100000000000)
        var ret
        if (session.canLoadInsecureContent) {
            ret = {redirectUrl: "http://localhost:"  + port + "/request/" + requestId}
        }
        else {
            
            ret = {cancel: true}
        }
        
        session.requestOrder.push(details.url)

        
        setTimeout(function(){
            var oReq = new XMLHttpRequest();
            oReq.addEventListener("load", function(){
                console.log("loaded response for", requestId)
                fetch("http://localhost:" + port + "/response/" + requestId, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        response: oReq.responseText,
                        requestType: details.type, 
                        url: details.url,
                        returnProcessedContent: !session.canLoadInsecureContent
                    }),
                    method: "post"
                })
                .then(r => r.text())
                .then(function(t){
                    
                    if (!session.canLoadInsecureContent) {
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
                    chrome.tabs.executeScript( session.tabId, {code: inj}, function(){
                        console.log("DONE Injecting", details.url)
                        console.log("requestorder", requestOrder)
                    })
                    clearInterval(int)
                }
            }, 300)
            
        }
    
    
        
    }
 }