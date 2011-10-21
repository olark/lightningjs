(function(){
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = '//' + window.location.host + window.embedScriptPath + '&cachebreaker=' + Math.random();
    var entry = document.getElementsByTagName('script')[0];
    entry.parentNode.insertBefore(script, entry);
}());
