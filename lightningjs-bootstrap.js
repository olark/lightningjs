window.lightningjs || (function(window, parentLightningjs){

    // get a handle on the parent copy of lightningjs
    var innerLightningjs = window.lightningjs = {modules: parentLightningjs.modules},
        modules = parentLightningjs.modules;

    // export the rest of the lightningjs APIs
    innerLightningjs.expensive = function(callback) {
        callback._waitforload = true;
        return callback;
    }
    innerLightningjs.require = parentLightningjs.require;
    innerLightningjs.provide = function(ns, api) {

        // in case we are calling provide() without having ever require()d it,
        // make sure that we create the default callstack, etc
        innerLightningjs.require(ns);

        // determine if we are providing this module twice
        function logError() {
            var c = window.console;
            if (c && c.error) {
                try {
                    c.error.apply(c, arguments);
                } catch(e) {}
            } else if (window.opera) {
                try {
                    window.opera.postError.apply(window.opera, arguments);
                } catch(e) {}
            }
        }
        var root = modules[ns];
        if (root.provided) {
            // already defined this module
            logError("deferred module '" + ns + "' is already defined");
            return;
        } else {
            // we are about to define this module
            root.provided = true;
        }

        // start calling all pending deferreds and future deferreds in order
        var deferredApiCalls = (root._.s||[]).slice(),
            responses = {0: api},
            parentLoadPendingCalls = [],
            parentLoadPendingIdLookup = {},
            parentLoaded = false;

        if(deferredApiCalls && deferredApiCalls[0]) {
            var promiseFunctionId = deferredApiCalls[0][1];
            responses[promiseFunctionId] = api;
        }
        
        // NOTE: root.lv contains the embed version
        api._load = function() {
            // this method gets called whenever the parent.window.onload event fires
            parentLoaded = true;
            // dequeue all pending load calls
            var nextCall = parentLoadPendingCalls.shift();
            while (nextCall) {
                executeCall(nextCall);
                nextCall = parentLoadPendingCalls.shift();
            }
        }
        function enqueueCallThatDependsOnParentLoad(call) {
            var methodResponseId = call[0];
            parentLoadPendingIdLookup[methodResponseId] = true;
            parentLoadPendingCalls.push(call);
        }
        function callDependsOnParentLoad(call) {
            if (parentLoaded) {
                return false;
            }
            var methodResponseId = call[0],
                methodSourceId = call[1],
                methodSource = methodSourceId > 0 ? responses[methodSourceId] : api,
                methodArguments = Array.prototype.slice.call(call[2]),
                methodName = methodArguments.shift(),
                method,
                isWaitingOnAnotherPendingCall = parentLoadPendingIdLookup[methodSourceId] ? true : false;
            if (methodSource) {
                method = methodSource[methodName];
                if (method) {
                    return method._waitforload ? true : false;
                } else {
                    // method doesn't exist, so it doesn't depend on parent load
                    return false;
                }
            } else if (isWaitingOnAnotherPendingCall) {
                return true;
            } else {
                // method depends on a response that will never exist
                return false;
            }
        }
        function executeCall(call) {
            var methodResponseId = call[0],
                methodSourceId = call[1],
                methodSource = methodSourceId > 0 ? responses[methodSourceId] : api,
                methodArguments = Array.prototype.slice.call(call[2]),
                methodName = methodArguments.shift(),
                methodFulfillmentHandlers = root._.fh[methodResponseId] = root._.fh[methodResponseId] || [],
                methodErrorHandlers = root._.eh[methodResponseId] = root._.eh[methodResponseId] || [],
                // TODO: progress handling is not implemented yet
                methodProgressHandlers = root._.ph[methodResponseId] = root._.ph[methodResponseId] || [],
                method,
                methodResponse,
                methodError;

            // reconstruct the call and perform it on the API
            if (methodSource) {

                // this is a deferred call on the root API namespace
                method = methodSource[methodName];
                if (method) {

                    // call the deferred method
                    try {
                        methodResponse = method.apply(method, methodArguments);
                    } catch(e) {
                        methodError = e;
                    }

                } else {
                    // no methods matched for this call
                    // TODO: consider some kind of method_missing approach here?
                    methodError = new Error("unknown deferred method '" + methodName + "'");
                    logError(methodError.toString());
                }

                // cache the response so that dependent calls can reference it
                // later on in the callstack
                if (methodResponse) {
                    responses[methodResponseId] = methodResponse;
                }

                // ensure that the proper callbacks and errorHandlers get called
                if (methodError) {
                    while (methodErrorHandlers.length) {
                        var errorHandler = methodErrorHandlers.shift();
                        try {
                            errorHandler(methodError);
                        } catch(e) {
                            logError(e);
                        }
                    }
                    // ensure all future callbacks get called too
                    methodErrorHandlers.push = function(errorHandler) {
                        errorHandler(methodError);
                    }
                } else {
                    while (methodFulfillmentHandlers.length) {
                        var fulfillmentHandler = methodFulfillmentHandlers.shift();
                        try {
                            fulfillmentHandler(methodResponse);
                        } catch(e) {
                            logError(e);
                        }
                    }
                    // ensure all future callbacks get called too
                    methodFulfillmentHandlers.push = function(fulfillmentHandler) {
                        fulfillmentHandler(methodResponse);
                    }
                }

            } else {
                logError("cannot call deferred method '" + methodName + "' on 'undefined'")
            }
        }
        function dequeueDeferredApiCalls() {
            var nextCall = deferredApiCalls.shift();
            while (nextCall) {
                if (callDependsOnParentLoad(nextCall)) {
                    // we have to wait for parent to load here
                    enqueueCallThatDependsOnParentLoad(nextCall);
                } else {
                    executeCall(nextCall);
                }
                // dequeue the next call
                nextCall = deferredApiCalls.shift();
            }
        }

        // root._.s is the callstack from the embed code, the format is a list of
        // tuples like this: [responseId, sourceId, argumentList]
        // ...we change it's push() method here to start triggering dequeuing
        // of those calls since we have the library provided now
        root._.s = {push: function(deferredArguments){
            deferredApiCalls.push(deferredArguments);
            dequeueDeferredApiCalls();
        }};

        // start dequeing calls immediately
        dequeueDeferredApiCalls();
    }

    // provide a lightningjs('load') method that signals all other modules to load
    if (modules.lightningjs.provided) {
        // lightningjs deferred methods are already defined
    } else {

        // define lightningjs deferred methods
        innerLightningjs.provide('lightningjs', {
            // helper that allows forced load (could be used to reload modules)
            // TODO: is this necessary anymore?
            'load': function() {
                var modules = parentLightningjs.modules,
                    moduleObj;
                for (var moduleName in modules) {
                    moduleObj = modules[moduleName];
                    if (moduleObj._) {
                        moduleObj('_load')
                    }
                }
            }
        })
    }

})(window, window.parent.lightningjs);
