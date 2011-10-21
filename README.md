# LightningJS

LightningJS is a fast implementation of Javascript embed code intended for
third-party Javascript library providers.  This technique has the following
advantages over traditional synchronous and asynchronous embed techniques:

1. **Avoids blocking the `window.onload` and `document.ready` events on the parent page**.
   Traditional embed techniques can block `window.onload` if the server responds
   slowly, even when the embed is asynchronous.
2. **Ensures that the library code does not conflict with other code on the parent page**.
   All of the library code lives in its own separate `window` context.
3. **Makes the library namespace immediately available for asynchronous calls**.
   There is no need to declare a callstack (e.g. Google Analytics' `var _gaq=[]; _gaq.push(...)`),
   nor is there a need to wait for a script onload event.

As a third-party Javascript provider, LightningJS addresses most
"worst case scenarios" that can affect the parent page when your servers
(or your code) misbehave in the wild.

Due to its nonblocking design, you should be able to embed this code anywhere in the
parent page. Embedding in the `<head>...</head>` of the HTML will likely speed
up the load time of your library, without having a negative affect on the parent
page.


# Basic Usage

To make your own embed code, just start with `embed.min.js` and then underneath
that code you can simply use `lightningjs.require` to pull in your library.

For example: if you named your library namespace "zippyzoop", then your
final embed code will look something like this:

    window.lightningjs||(function(modules){...minified lightningjs embed code...})({});
    lightningjs.require("zippyzoop", "//static.zippyzoop.com/zippyzoop.js");

Keep in mind that the target library will be loaded **in its own `window` context**.
If you want to access the DOM of the actual page, you will need to grab the
`window.parent` object.  For example, `zippyzoop.js` would probably look like this:

    ;(function(window, document){
        
        // ensure your codebase refers explicitly to these
        // window and document objects when making changes
        // to the parent page
        
    })(window.parent, window.parent.document);

Alternatively, if you have an older codebase that relies on the implicit globals
on the parent page, you could do this instead:

    ;(function(){
        with (window.parent) {
            
            // your existing codebase goes here
            
        }
    })();

That should be all you need to get up and running :)

# Advanced Usage

If you want to provide an asynchronous API with your embed code, you can do so
by starting with the included `lightningjs-bootstrap.js`.  This file has all the methods you
need to handle asynchronous calls against your namespace from the embed code.

*TODO: more documentation*

# Previous Work

Most of these concepts are taken from work done by the fine hackers at Meebo.
They even wrote up a great [blog post](http://blog.meebo.com/?p=2956)
detailing the reasoning behind the different parts of the Meebo embed code.

You can also find most of these techniques in use by the Olark embed code,
which contains some minor improvements to enable an
[asynchronous Javascript API](http://www.olark.com/documentation). 

The LightningJS project attempts to distill this work and make the code
more accessible to the community by:

* simplifying the process of including multiple arbitrary Javascript files
* allowing out-of-the-box handling of asynchronous library calls
* removing the dependency the Meebo build system

Somewhat tangentially, you can find more information about traditional
synchronous and asynchronous third-party embed code (as well as other important
topics) from the [Third-party JavaScript](http://thirdpartyjs.com/) book,
written up by a couple engineers from Disqus.

# Alternatives

Other loaders exist with some similar goals, though many are not as well-suited
for third-party providers.  You should check out these alternatives particularly
if you are trying to load files from your own domain:

* [HeadJS](http://headjs.com)
* [RequireJS](http://requirejs.org)
* [LabJS](http://labjs.com)
* [ControlJS](http://stevesouders.com/controljs/)
