%(lightningjs_bootstrap_code)s

lightningjs.provide('%(library_namespace)s', {
    asynchronousEcho: function(text, callback) {
        callback("echo:" + text);
    }
})
