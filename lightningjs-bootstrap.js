window.lightningjs || (function(window){

    var innerLightningjs = window.lightningjs = {},
        modules = window.parent.lightningjs.modules;
    innerLightningjs.expensive = function(callback) {
        callback._waitforload = true;
        return callback;
    }
    innerLightningjs.require = window.parent.lightningjs.require;
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
        // NOTE: root.bv contains the embed version
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
                method,
                methodResponse;
            // reconstruct the call and perform it on the API
            if (methodSource) {
                // this is a deferred call on the root API namespace
                method = methodSource[methodName];
                if (method) {
                    // call the deferred method
                    methodResponse = method.apply(method, methodArguments);
                } else {
                    // nothing matched for this call, fall back to wildcard
                    method = methodSource['_call'];
                    if (method) {
                        methodArguments.unshift(methodName);
                        methodResponse = method.apply(method, methodArguments);
                    } else {
                        logError("unknown deferred method '" + methodName + "'");
                    }
                }
                if (methodResponse) {
                    responses[methodResponseId] = methodResponse;
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
        root._.s = {push: function(deferredArguments){
            deferredApiCalls.push(deferredArguments);
            dequeueDeferredApiCalls();
        }};
        dequeueDeferredApiCalls();
    }

    // provide a lightningjs('load') method that signals all other modules to load
    if (modules.lightningjs.provided) {
        // lightningjs deferred methods are already defined
    } else {

        // define lightningjs deferred methods
        innerLightningjs.provide('lightningjs', {
            'load': function() {
                var modules = window.parent.lightningjs.modules,
                    moduleObj;
                for (var moduleName in modules) {
                    moduleObj = modules[moduleName];
                    if (moduleObj._) {
                        window.parent[moduleName]('_load')
                    }
                }
            }
        })
    }

})(window);
