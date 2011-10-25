# LightningJS

[LightningJS](http://lightningjs.com) is a safe, fast, and asynchronous embed code intended for
third-party Javascript providers.


### **Safe:** ensures zero Javascript code conflicts

Globals, prototypes and mismatched library versions can cause lots of
compatibility headaches for third-party code.

With LightningJS, all of that third-party code lives in its own separate
`window` context.  If the code needs to do DOM manipulation, it still has
access to the original document via `window.parent`.

### **Fast:** avoids blocking window.onload and document.ready

Slowdowns in embedded third-party code should never impact the original document.
Traditional embed techniques can block `window.onload` if the server responds
slowly, even when the embed itself is asynchronous.

With LightningJS, third-party server response time has zero impact on the 
original document.  It should even be safe to embed the code at the top of the
`<body>` of the document for an added speed boost :)

### **Asynchronous:** defers API calls with a simple interface

When customers are using your third-party API, asynchronicity can make usage a
bit more complicated.  Some libraries require manual creation of a callstack
(e.g. Google Analytics `var _gaq=[]; _gaq.push(...)`), and others try to hook
into `script.onload` events.

With LightningJS, the third-party namespace is immediately available as a
callable function.  All calls return objects that adhere to the
[CommonJS Promise API](http://wiki.commonjs.org/wiki/Promises/A).  Just a few
modifications to the existing API will enable these deferred calls.

# What does it look like?

Let's say that we are Pirates Incorporated, purveyors of all things
[piratey](http://www.pirateglossary.com/) on the interwebs.  When using
LightningJS, our embed code will look something like this:

    <!-- begin embed code -->
    <script type="text/javascript">/*{literal}<![CDATA[*/
    /*** lightningjs-embed.min.js ***/
    window.piratelib = lightningjs.require("piratelib", "//static.piratelib.com/piratelib.js");
    /*]]>{/literal}*/</script>
    <!-- end embed code -->

Our customers can call methods on `piratelib` immediately, even though none of
our code has actually loaded yet:

    piratelib("fireWarningShot", {direction: "starboard"})

This calls the `fireWarningShot` method on our API.  At some point, we decide to
return a value to our customers that indicates whether the warning shot was seen.
We also decide to throw exceptions in cases where the warning shot failed.
Since LightningJS already implements a [promise API](http://wiki.commonjs.org/wiki/Promises/A),
we can use the `.then(fulfillmentCallback, errorCallback)` method to handle return
values and exceptions:

    piratelib("fireWarningShot", {direction: "starboard"}).then(function(didSee) {
        if (!didSee) {
            // arrr, those landlubbers didn't see our warning shot...we're no
            // scallywags, so run another shot across the bow
            piratelib("fireWarningShot", {direction: "starboard"});
        }
    }, function(error) {
        if (error.toString() == "crew refused") {
            // blimey! it's mutiny!
        }
    })

# Getting Started

The LightningJS API is pretty simple:

- `lightningjs.require` imports third-party code
- `lightningjs.modules` dictionary of all imported modules
- `lightningjs.provide` exports third-party code as a LightningJS module
- `lightningjs.expensive` designates specific exported methods to execute only after the original document is completely finished

This step-by-step should get you up and running pretty quickly:

### **Step 1**: Create your embed code

To make your own embed code, just start with `embed.min.js` and then underneath
that code you can simply use `lightningjs.require` to pull in your library.
For example: if you named your library namespace "piratelib", then your
final embed code might look something like this:

    <!-- begin embed code -->
    <script type="text/javascript">/*{literal}<![CDATA[*/
    /*** lightningjs-embed.min.js ***/
    window.piratelib = lightningjs.require("piratelib", "//static.piratelib.com/piratelib.js");
    /*]]>{/literal}*/</script>
    <!-- end embed code -->

The extra "guards" around the code ensure that you avoid any issues with
template engines (e.g. Drupal, Joomla, etc) and XHTML parsers...as a third-party
provider it pays to be prepared for all kinds of document environments.

### **Step 2**: Modify your codebase to use the parent window context

Keep in mind that your code will be loaded **in its own window context**.
If you need to access the globals on the original document, you should grab the
`window.parent` object.  You should also use `window.parent.document` to
manipulate the DOM.

Some older codebases may rely on implicit globals in the original document
If this is the case with your library, you could try wrapping your code in
a `with` context:

    with (window.parent) {
        // your existing codebase goes here
    }

### **Step 3 (optional)**: Enable asynchronous calls to your library

If you want to utilize the asynchronous API that the embed code creates for your
namespace, you can do so by pasting the code from `lightningjs-bootstrap.min.js`
at the top of your codebase.

After doing this, you need to tell LightningJS which methods need to be made
available for asynchronous calling using the `lightningjs.provide` method.
For example, you could expose your `fireWarningShot` method like so:

    /*** lightningjs-bootstrap.min.js ***/
    /*** piratelib library code ***/
    lightningjs.provide("piratelib", {
        fireWarningShot: function(options) {
            return piratelib.fireWarningShot(options);
        }
    });

### **Step 4 (optional)**: Force expensive methods to execute after the original document loads

Tools like Google PageSpeed and YSlow sometimes penalize pages for executing
too much Javascript before the page loads.  Therefore, you may want to avoid
executing certain CPU or parsing intensive methods until after `window.onload`
so that your library does not cause any execution penalty for the original document.

To avoid executing expensive methods too early, just decorate these methods
using `lightningjs.expensive`.  LightningJS will ensure that calls to these
methods are delayed until after the original document completely loads:

    lightningjs.provide("piratelib", {
        loadToTheGunwalls: lightningjs.expensive(function() {
            // this method instantiates lots of grog and iterates
            // through each bottle in a loop
            piratelib.stockTheGalley();
            while (piratelib.bottlesOfGrogOnTheWall) {
                piratelib.takeOneDownAndPassItAround();
            }
        }),
    });

# Browser Compatibility

Exhaustive browser support really important for LightningJS.  To that end, this
loading approach has been battle-tested in production by both
[Meebo](http://www.meebo.com) and [Olark](http://www.olark.com) across
thousands of websites and browsers.  The included tests have been verified to
pass in every browser we could easily get our hands on:

- Firefox 2+ (tested in 2.0, 3.0, 3.6, 4.0, 5.0, 6.0, 7.0)
- Chrome 12+ (tested in 12, 13, 14, 15)
- Internet Explorer 6+ (tested in 6, 7, 8, 9)
- Safari 4+ (tested in 4.0, 5.0, 5.1)
- Opera 10+ (tested in 10, 11.5)
- Mobile Safari 5+ (tested in 5.0, 5.1)

# Contributing to LightningJS

The development cycle should be pretty straightforward:

1. Edit `lightningjs-embed.js` and `lightningjs-bootstrap.js` directly
2. Add your test cases in `test/test.js`
  - *you might need to add methods to the test library in `test/testlib.js`*
3. Run the development server by executing `bin/serve` and visiting
   [http://localhost:1167](http://localhost:1167) in your browser
4. Click on the links for testing and benchmarking pages to see the effects of your changes
  - *don't forget to check multiple browsers, especially older ones like IE6*
5. Rebuild the components before committing your patches, by executing `bin/build`

Feel free to fork, make changes, and send us a pull request...you know the drill.

# Future Work

Loading third-party Javascript is the core goal of LightningJS, and that functionality
has been battle-tested in production scenarios.  However, there are still some areas that need work:

- gathering test results on more browsers (older browsers, more mobile browsers)
- better testing of the Promise API in production environments
- exposing the original document's `ready` event to the third-party code
- working around additional server-side templating systems so that more end-users can paste code into their favorite CMS
- designing an easy backwards-compatibility layer for existing third-party libraries

Incidentally - though is it really a coincidence? - you can
[work on cool stuff like this](http://www.olark.com/jobs) here at Olark :)

# Previous Work

Most of the LightningJS concepts build on work done by the fine Javascript
hackers at Meebo. They even wrote up a great [blog post](http://blog.meebo.com/?p=2956)
detailing the reasoning behind the different parts of the Meebo embed code.

You can also find most of these techniques in use by the Olark embed code,
which added cookie-controlled cachebreaking of the library code download
and also sidestepped some common templating engine incompatibilities.

The LightningJS project distills this work for the open-source community by:

* simplifying the process of including multiple arbitrary Javascript files
* allowing out-of-the-box handling of asynchronous library calls
* removing dependency on the Meebo build system

For information on traditional third-party embed code (as well as other important
topics), you could check out the [Third-party JavaScript](http://thirdpartyjs.com/) book,
written up by a couple engineers from Disqus.

# Alternatives

Other loaders exist with some similar goals, though many are not as well-suited
for third-party providers.  You should check out these alternatives particularly
if you are trying to load files from your own domain:

* [HeadJS](http://headjs.com)
* [RequireJS](http://requirejs.org)
* [LabJS](http://labjs.com)
* [ControlJS](http://stevesouders.com/controljs/)
