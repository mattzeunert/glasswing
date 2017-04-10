console.log("bg")

let tabId = 0



 chrome.webRequest.onBeforeRequest.addListener(
        function(details) {
            if (details.url.indexOf("4248145") !== -1 && details.type =="main_frame") {
                tabId = details.tabId
            }
            else {
                if (details.tabId === tabId){
                    if (details.url.indexOf("http://localhost:8000/request/") !== -1
                        || details.url.indexOf("__jscb") !== -1){
                            console.log("Not intercepting", details.url)
                        return
                    }
                    
                    var requestId = Math.floor(Math.random() * 100000000000)
                    setTimeout(function(){
                        var oReq = new XMLHttpRequest();
                        oReq.addEventListener("load", function(){
                            fetch("http://localhost:8000/response/" + requestId, {
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    response: oReq.responseText,
                                    url: details.url
                                }),
                                method: "post"
                            })
                        });
                        oReq.open("GET", details.url);
                        oReq.send();   
                    }, 500)
                    return {redirectUrl: "http://localhost:8000/request/" + requestId}
                }
            }
            
        },
    {urls: ["*://*/*"]},
    ["blocking"]
        );