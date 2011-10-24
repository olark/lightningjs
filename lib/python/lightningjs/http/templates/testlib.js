%(lightningjs_bootstrap_code)s

var downloadTimestamp = +new Date;
var valueList = [];
lightningjs.provide('%(library_namespace)s', {
    getDownloadTimestamp: function() {
        return downloadTimestamp;
    },
    asynchronousEcho: function(text, callback) {
        callback("echo:" + text);
    },
    echo: function(text) {
        return "echo:" + text;
    },
    throwThisError: function(text) {
        throw new Error(text);
    },
    appendToValueList: function(value, callback) {
        valueList.push(value);
        callback(valueList);
    },

    // this is used to test chained deferred calls
    getComplexObject: function(secretValue) {
        return {
            getColorOfSky: function(optionalCallback) {
                var value = "blue";
                if (optionalCallback) {
                    optionalCallback(value);
                }
                return value;
            },
            getTreasureChest: function() {
                return {
                    getSecretValue: function(optionalCallback) {
                        if (optionalCallback) {
                            optionalCallback(secretValue);
                        }
                        return secretValue;
                    }
                }
            }
        }
    }
})
