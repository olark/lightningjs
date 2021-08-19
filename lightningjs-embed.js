window.lightningjs || (function(modules){
    var lightningjsName = 'lightningjs';
    function require(moduleName, url) {
        // attach the lightningjs version to the URL to make versioning possible
        var lightningjsVersion = '1';
        if (url) url += (/\?/.test(url) ? '&': '?') + 'lv=' + lightningjsVersion;
        // declare the namespace
        modules[moduleName] || (function() {
            var theWindow = window,
            theDocument = document,
            namespace = moduleName,
            protocol = theDocument.location.protocol,
            load = "load",
            responseCounter = 0;
            (function() {
                // create a callback named after the namespace, and have it
                // recursively return deferred responses
                modules[namespace] = function() {
                    var theArguments = arguments,
                    context = this,

                    // freeze in the ID of the response of this function so that
                    // the nested methods can depened on its response
                    // (used to deserialize the callstack with proper dependency
                    // ordering later on)
                    promiseResponseId = ++responseCounter,
                    promiseFunctionId = (context && context != theWindow) ? (context.id || 0) : 0;

                    // push this call onto the callstack
                    (internalModule.s = internalModule.s || []).push([promiseResponseId, promiseFunctionId, theArguments]);

                    // create a deferred function that recursively applies this
                    // deferred call mechanism to allow nested deferred methods
                    function promiseFunction() {
                        promiseFunction.id = promiseResponseId;
                        return modules[namespace].apply(promiseFunction, arguments)
                    }

                    // add then() method to implement the CommonJS Promise API
                    // http://wiki.commonjs.org/wiki/Promises/A
                    promiseFunction.then = function(fulfillmentHandler, errorHandler, progressHandler) {

                        // initialize the handler queues
                        var fulfillmentHandlers = internalModule.fh[promiseResponseId] = internalModule.fh[promiseResponseId] || [],
                            errorHandlers = internalModule.eh[promiseResponseId] = internalModule.eh[promiseResponseId] || [],
                            progressHandlers = internalModule.ph[promiseResponseId] = internalModule.ph[promiseResponseId] || [];

                        // enqueue the appropriate handlers
                        fulfillmentHandler && fulfillmentHandlers.push(fulfillmentHandler);
                        errorHandler && errorHandlers.push(errorHandler);
                        progressHandler && progressHandlers.push(progressHandler);

                        // return the function itself to allow chaining
                        return promiseFunction;
                    }
                    return promiseFunction;
                };

                // the internal module keeps track of all our internal state
                // like callstacks and performance data
                var internalModule = modules[namespace]._ = {};

                // vars for tracking Promise API callbacks
                internalModule.fh = {}; // fulfillmentHandler list
                internalModule.eh = {}; // errorHandler list
                internalModule.ph = {}; // progressHandler list

                // generate the URL that we will download from (based on http/https)
                internalModule.l = url ? url.replace(/^\/\//, (protocol=='https:' ? protocol : 'http:') + '//') : url;

                // download performance tracking dictionary (keeps timestamps
                // of each stage of the download for later analysis)
                internalModule.p = {
                    0: +new Date
                };
                internalModule.P = function(f) {
                    internalModule.p[f] = new Date - internalModule.p[0]
                };

                // track the window.onload event
                function windowLoadHandler() {
                    internalModule.P(load);
                    // use internalModule.w to remember that the onload event
                    // triggered, for future module imports
                    internalModule.w = 1;
                    modules[namespace]('_load')
                }

                // if the window.onload event triggered previously for any other
                // namespace, trigger it again for this namespace
                if (internalModule.w) windowLoadHandler();

                // listen for onload
                theWindow.addEventListener ? theWindow.addEventListener(load, windowLoadHandler, false) : theWindow.attachEvent("on" + load, windowLoadHandler);

                // download the library (if a URL was given...otherwise we
                // assume that something else is providing this namespace)
                var downloadIntoFrameContext = function() {

                    // this helper is used to build the inner iframe where
                    // the module will live in its own window context
                    function buildInnerFrameHtml() {
                        return [
                            "<head></head><",body, "'\"></", body, ">"
                        ].join("")
                    }

                    // try to get a handle on the document body
                    var body = "body",
                    documentBody = theDocument[body];

                    // if the document body does not exist yet, wait 100ms
                    // and retry this anonymous closure
                    if (!documentBody) {
                        return setTimeout(downloadIntoFrameContext, 100)
                    }

                    // performance tracking: we have reached stage 1 (building inner frame)
                    internalModule.P(1);

                    // use vars to refer to strings, this improves compression by
                    // allowing the compiler to treat repeated instances as one
                    var appendChild = "appendChild",
                    createElement = "createElement",
                    srcAttr = "src",
                    innerFrameWrapper = theDocument[createElement]("div"),
                    innerFrameContainer = innerFrameWrapper[appendChild](theDocument[createElement]("div")),
                    innerFrame = theDocument[createElement]("iframe"),
                    documentString = "document",
                    domain = "domain",
                    domainSrc,
                    contentWindow = "contentWindow";

                    // hide the iframe container and append it to the document
                    innerFrameWrapper.style.display = "none";
                    documentBody.insertBefore(innerFrameWrapper, documentBody.firstChild).id = lightningjsName + "-" + namespace;
                    innerFrame.frameBorder = "0";
                    innerFrame.id = lightningjsName + "-frame-" + namespace;
                    if (/MSIE[ ]+6/.test(navigator.userAgent)) {
                        // in IE6, we make sure to load javascript:false to avoid
                        // about:blank security warnings under SSL
                        innerFrame[srcAttr] = "javascript:false"
                    }
                    innerFrame.allowTransparency = "true";
                    innerFrameContainer[appendChild](innerFrame);

                    // Try to start writing into the blank iframe. In IE, this will fail if document.domain has been set,
                    // so fail back to using a javascript src for the frame. In IE > 6, these urls will normally prevent
                    // the window from triggering onload, so we only use the javascript url to open the document and set
                    // its document.domain
                    try {
                        innerFrame[contentWindow][documentString].open()
                    } catch(E) {
                        // keep track of the actual document.domain in the
                        // internal module in case it is useful in the future
                        internalModule[domain] = theDocument[domain];
                        domainSrc = "javascript:var d=" + documentString + ".open();d.domain='" + theDocument.domain + "';";
                        innerFrame[srcAttr] = domainSrc + "void(0);"
                    }

                    var loadScript = function(e) {
                        var iframeDocument = e.currentTarget.contentDocument;
                        var head = iframeDocument.getElementsByTagName('head')[0];
                        var script = iframeDocument.createElement('script');
                        script.setAttribute(srcAttr, internalModule.l);
                        head.appendChild(script);
                    };

                    // Set the HTML of the iframe. In IE 6, the document.domain from the iframe src hasn't had time to
                    // "settle", so trying to access the contentDocument will throw an error. Luckily, in IE 7 we can
                    // finish writing the html with the iframe src without preventing the page from onloading
                    try {
                        var frameDocument = innerFrame[contentWindow][documentString];
                        frameDocument.write(buildInnerFrameHtml());
                        frameDocument.close();
                        if (innerFrame.addEventListener) {
                            innerFrame.addEventListener('load', loadScript);
                        } else {
                            innerFrame.attachEvent('onload', loadScript);
                        }
                    } catch(D) {
                        innerFrame[srcAttr] = domainSrc + 'd.write("' + buildInnerFrameHtml().replace(/"/g, String.fromCharCode(92) + '"') + '");d.close();'
                    }

                    // performance tracking: this is the last bit of code for
                    // the loader to execute, we want to know how long it took
                    internalModule.P(2)

                };
                internalModule.l && downloadIntoFrameContext();
            })()
        })();

        // freeze the version identifier into this module
        modules[moduleName].lv = lightningjsVersion;

        // return the module itself
        return modules[moduleName];
    }

    // load lightningjs as a module itself, this has the side benefit
    // of making sure there is at least one module listening to window.onload
    var lightningjs = window[lightningjsName] = require(lightningjsName);

    // export the public lightningjs API
    lightningjs.require = require;
    lightningjs.modules = modules;

})({});