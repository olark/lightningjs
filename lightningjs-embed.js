window.lightningjs || (function(modules){
    var ljs = 'lightningjs';
    function require(ns, url) {
        // bv is the embed version, we attach it to the url (if given)
        var bv = '1';
        if (url) url += (/\?/.test(url) ? '&': '?') + 'bv=' + bv;
        // declare the namespace
        modules[ns] || (function() {
            var e = window,
            h = document,
            g = ns,
            protocol = h.location.protocol,
            b = "load",
            rd = 0; (function() {
                // create a callback named after the namespace, and have it
                // recursively return deferred responses
                modules[g] = function() {
                    var ar = arguments,
                    cx = this,
                    id = cx ? (cx.id || 0) : 0; (c.s = c.s || []).push([++rd, id, ar]);
                    function fn() {
                        fn.id = rd;
                        return modules[g].apply(fn, arguments)
                    }
                    fn.then = function(fulfillmentHandler, errorHandler, progressHandler) {
                        var fulfillmentHandlers = c.fh[rd] = c.fh[rd] || [],
                            errorHandlers = c.eh[rd] = c.eh[rd] || [],
                            progressHandlers = c.ph[rd] = c.ph[rd] || [];
                        fulfillmentHandler && fulfillmentHandlers.push(fulfillmentHandler);
                        errorHandler && errorHandlers.push(errorHandler);
                        progressHandler && progressHandlers.push(progressHandler);
                    }
                    return fn
                };
                var c = modules[g]._ = {};
                c.fh = {};
                c.eh = {};
                c.ph = {};
                c.l = url ? url.replace(/^\/\//, (protocol=='https:' ? protocol : 'http:') + '//') : url;
                c.i = arguments.callee;
                c.p = {
                    0: +new Date
                };
                c.P = function(f) {
                    c.p[f] = new Date - c.p[0]
                };
                // track the window.onload event
                function d() {
                    c.P(b);
                    modules.w = 1;
                    modules[g]('_load')
                }
                // if the window.onload event triggered previously for any other
                // namespace, track it again for this namespace
                if (modules.w) d();
                e.addEventListener ? e.addEventListener(b, d, false) : e.attachEvent("on" + b, d);

                // download the library (if a URL was given...otherwise we
                // assume that something else is providing this namespace)
                c.l && (function() {
                    function f() {
                        return ["<head></head><", y, ' onload="var d=', A, ";d.getElementsByTagName('head')[0].", u, "(d.", z, "('script')).", s, "='", c.l, "'\"></", y, ">"].join("")
                    }
                    var y = "body",
                    r = h[y];
                    if (!r) {
                        return setTimeout(arguments.callee, 100)
                    }
                    c.P(1);
                    var u = "appendChild",
                    z = "createElement",
                    s = "src",
                    q = h[z]("div"),
                    F = q[u](h[z]("div")),
                    C = h[z]("iframe"),
                    A = "document",
                    B = "domain",
                    l;
                    q.style.display = "none";
                    r.insertBefore(q, r.firstChild).id = ljs + "-" + g;
                    C.frameBorder = "0";
                    C.id = ljs + "-frame-" + g;
                    if (/MSIE[ ]+6/.test(navigator.userAgent)) {
                        C.src = "javascript:false"
                    }
                    C.allowTransparency = "true";
                    F[u](C);
                    try {
                        C.contentWindow[A].open()
                    } catch(E) {
                        i[B] = h[B];
                        l = "javascript:var d=" + A + ".open();d.domain='" + h.domain + "';";
                        C[s] = l + "void(0);"
                    }
                    try {
                        var G = C.contentWindow[A];
                        G.write(f());
                        G.close()
                    } catch(D) {
                        C[s] = l + 'd.write("' + f().replace(/"/g, String.fromCharCode(92) + '"') + '");d.close();'
                    }
                    c.P(2)
                })()
            })()
        })();
        modules[ns].bv = bv;
        return modules[ns]
    }
    // make sure that *something* is watching the onload event
    var lightningjs = window[ljs] = require(ljs);
    lightningjs.require = require;
    lightningjs.modules = modules;
})({});