module.exports = function rewriteHtml(html, basePath){
    

    body.replace(/(<script[^>]*>)/g, function(match){
        return match.replace(/src=\"([^"]*)\"/, function(x, m){
            return x
            u = url.parse(m)

            var _new = "src=\"" + "/" 
            if (u.protocol && u.hostname) {
                _new += u.protocol + "/" + u.hostname + "/" + u.port +  "/" + u.pathname
            } else {
                return x
            }
            _new += "\""
            return _new 
        })
    })
    return html
}