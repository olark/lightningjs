asyncTest("can call traditional asynchronous echo function", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(1);
    testlib("asynchronousEcho", "hello world", function(echoText) {
        equals(echoText, "echo:hello world");
        start();
    })
});

asyncTest("can call promised echo function", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(1);
    testlib("echo", "hello world").then(function(echoText) {
        equals(echoText, "echo:hello world");
        start();
    })
});

asyncTest("can call promised exception-throwing function", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(1);
    testlib("throwThisError", "goodbye moon").then(function() {
        ok(false, "this method should throw an exception");
        start();
    }, function(error) {
        equals(error.message, "goodbye moon", "exception was thrown and delivered")
        start();
    });
});

asyncTest("can call then() multiple times to attach more listeners", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(2);
    var callbackLookup = {first: false, second: false};
    var echoPromise = testlib("throwThisError", "goodbye moon");

    echoPromise.then(function() {
        ok(false, "this method should throw an exception");
        start();
    }, function(error) {
        equals(error.message, "goodbye moon", "exception was thrown and delivered")
        callbackLookup.first = true;
        allValuesAreTruthy(callbackLookup) && start();
    });

    echoPromise.then(function() {
        ok(false, "this method should throw an exception");
        start();
    }, function(error) {
        equals(error.message, "goodbye moon", "exception was thrown and delivered")
        callbackLookup.second = true;
        allValuesAreTruthy(callbackLookup) && start();
    });

});

asyncTest("can call then() after the call returns once, and get the result again", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(3);
    var callbackLookup = {first: false, chained: false, timeout: false};
    var echoPromise = testlib("throwThisError", "goodbye moon");

    echoPromise.then(function() {
        ok(false, "this method should throw an exception");
        start();
    }, function(error) {
        equals(error.message, "goodbye moon", "exception was thrown and delivered")
        callbackLookup.first = true;
        echoPromise.then(function() {
            ok(false, "this method should throw an exception");
            start();
        }, function(error) {
            equals(error.message, "goodbye moon", "exception was thrown and delivered")
            callbackLookup.chained = true;
            allValuesAreTruthy(callbackLookup) && start();
        });
    });

    setTimeout(function(){
        echoPromise.then(function() {
            ok(false, "this method should throw an exception");
            start();
        }, function(error) {
            equals(error.message, "goodbye moon", "exception was thrown and delivered")
            callbackLookup.timeout = true;
            allValuesAreTruthy(callbackLookup) && start();
        });
    }, 2000);

});

asyncTest("can chain calls to then()", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(2);
    var callbackLookup = {first: false, second: false};
    var echoPromise = testlib("throwThisError", "goodbye moon");

    echoPromise.then(function() {
        ok(false, "this method should throw an exception");
        start();
    }, function(error) {
        equals(error.message, "goodbye moon", "exception was thrown and delivered")
        callbackLookup.first = true;
        allValuesAreTruthy(callbackLookup) && start();
    }).then(function() {
        ok(false, "this method should throw an exception");
        start();
    }, function(error) {
        equals(error.message, "goodbye moon", "exception was thrown and delivered")
        callbackLookup.second = true;
        allValuesAreTruthy(callbackLookup) && start();
    });

});

asyncTest("promised then() callbacks calls execute in the given order", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(3);
    var callbackLookup = {first: false, second: false, third: false};
    var echoPromise = testlib("throwThisError", "goodbye moon");

    function shouldHaveThrownException() {
        ok(false, "this method should throw an exception");
        start();
    }

    function firstCallback() {
        equals(callbackLookup.second, false, "the second callback should not have executed yet");
        callbackLookup.first = true;
        allValuesAreTruthy(callbackLookup) && start();
    }

    function secondCallback() {
        equals(callbackLookup.first, true, "the first callback should already have executed");
        callbackLookup.second = true;
        allValuesAreTruthy(callbackLookup) && start();
    }

    function thirdCallback() {
        equals(callbackLookup.first && callbackLookup.second, true, "the other callback should already have executed");
        callbackLookup.third = true;
        allValuesAreTruthy(callbackLookup) && start();
    }

    echoPromise.then(shouldHaveThrownException, firstCallback);
    echoPromise.then(shouldHaveThrownException, secondCallback).then(shouldHaveThrownException, thirdCallback);

});

asyncTest("promised then() give an error about unknown method when the method was not found", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(1);
    testlib("nonexistentMethod").then(function(valueList){
        ok(false, "this method shouldn't exist");
        start();
    }, function(error) {
        ok(/unknown deferred method.*nonexistentMethod/.test(error.message), "we should get an error about the method not existing, got: " + error);
        start();
    });
});

asyncTest("deferred calls return deferred closures that can be further chained for calls to nested functions", function(){
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(6);

    // create a "secret" string that we will retrieve later from
    // a nested object
    var originalSecretValue = "shh, it's a secret";

    // grab a complex object from our API
    var complexObject = testlib("getComplexObject", originalSecretValue);

    // try the promise API first
    complexObject.then(function(complexObject){
        equals(complexObject.getColorOfSky(), "blue", "the promise API should give direct access to the color");
        complexObject.getColorOfSky(function(color){
            equals(color, "blue", "the traditional async callback should give the color as well (even when using the promise API)");
        });

        // we should be able to traverse the complex object without
        // using the deferred closures in here
        var treasureChest = complexObject.getTreasureChest();
        equals(treasureChest.getSecretValue(), originalSecretValue, "the non-deferred method should get the secret value");
    });

    // try the traditional async callback next
    complexObject("getColorOfSky", function(color) {
        equals(color, "blue", "the traditional async callback should give the color as well");
    });

    // chain a bit deeper to get other attributes on this object,
    // and inspect the "secret" value via promise API and the
    // traditional callback as well
    var treasureChest = complexObject("getTreasureChest");
    treasureChest("getSecretValue").then(function(secretValue){
        equals(secretValue, originalSecretValue, "the secret value should be accessible via promise API");
    });
    treasureChest("getSecretValue", function(secretValue){
        equals(secretValue, originalSecretValue, "the secret value should be accessible via traditional async callbacks");

        // this *should* be the last call
        start();
    });
});

asyncTest("asynchronous calls always execute in the given order", function(){
    var testlib = loadNewTestingLibraryWithLightningjs(2);
    expect(6);
    testlib("appendToValueList", "first1", function(valueList){
        equals(valueList[0], "first1");
    });
    testlib("appendToValueList", "second2", function(valueList){
        equals(valueList[0], "first1");
        equals(valueList[1], "second2");
    });
    testlib("appendToValueList", "third3", function(valueList){
        equals(valueList[0], "first1");
        equals(valueList[1], "second2");
        equals(valueList[2], "third3");
        start();
    });
});

asyncTest("can call asynchronous methods, even when download takes a long time (3 seconds)", function(){
    var testlib = loadNewTestingLibraryWithLightningjs(3);
    var callbackLookup = {
        asynchronousEchoCallback: false,
        echoCallback: false
    };
    expect(2);
    testlib("asynchronousEcho", "hello world", function(echoText) {
        equals(echoText, "echo:hello world");
        callbackLookup.asynchronousEchoCallback = true;
        allValuesAreTruthy(callbackLookup) && start();
    })
    testlib("echo", "hello world").then(function(echoText) {
        equals(echoText, "echo:hello world");
        callbackLookup.echoCallback = true;
        allValuesAreTruthy(callbackLookup) && start();
    })
});

asyncTest("can call require() twice for the same namespace and get the exact same library without an additional download", function(){
    var somethinglib1 = loadNewTestingLibraryWithLightningjs(0.5, "somethinglib");
    expect(2);
    somethinglib1("getDownloadTimestamp").then(function(value){
        var originalTimestamp = value;
        var somethinglib2 = loadNewTestingLibraryWithLightningjs(2.0, "somethinglib");
        equals(somethinglib1, somethinglib2, "the library objects should be the same closure");
        somethinglib2("getDownloadTimestamp").then(function(value){
            equals(value, originalTimestamp, "we didn't download a new version of the library");
            start();
        });
    })
});

asyncTest("can call traditional asynchronous echo function when global id is set", function(){
    window.id = 1;
    var testlib = loadNewTestingLibraryWithLightningjs();
    expect(1);
    testlib("asynchronousEcho", "hello world", function(echoText) {
        equals(echoText, "echo:hello world");
        start();
        window.id = null;
    })
});

// TODO: figure out an easy way to test the lightningjs.expensive API
// asyncTest("expensive calls are executed only after window.onload", function(){
// });
