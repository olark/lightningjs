(function(d,u){
    var h=d.location.protocol=='https:'?'https://':'http://';
    d.write(unescape("%3Cscript src='"+h+u+"' type='text/javascript'%3E%3C/script%3E"));
})(document, window.location.host + window.embedScriptPath + '&cachebreaker=' + Math.random());
