import os
import time
import urlparse
import StringIO
from gzip import GzipFile
from wsgiref.util import setup_testing_defaults
from wsgiref.simple_server import make_server

PORT = 8000

JAVASCRIPT_URL = '//localhost:%(PORT)s/slowcontent?delay=2&type=text/javascript&jsonp=(window.finished||window.parent.finished)' % locals()

BENCHMARK_INDEX_HTML = '''
<!DOCTYPE html>
<html>
    <head>
        <title>Embed Benchmarks</title>
        <style type="text/css">
            * {
                font-family: monospace;
            }
            iframe {
                width: 100%;
                border-width: 0px;
                border-style: none;
                margin: 0px;
                padding: 0px;
                height: 200px;
            }
        </style>
        <script type="text/javascript">
            (function(){
                var iframeUrlList = [
                    '/synchronous',
                    '/asynchronous',
                    '/lightning'
                ];
                window.nextBenchmark = function() {
                    var url = iframeUrlList.shift();
                    if (url) {
                        var iframe = document.createElement('iframe');
                        iframe.src = 'javascript:false';
                        document.body.appendChild(iframe);
                        iframe.src = url;
                    }
                }
                window.onload = function() {
                    window.nextBenchmark();
                }
            })();
        </script>
    </head>
    <body>
    </body>
</html>
'''

BENCHMARK_HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
    <head>
        <title>%(embed_name)s Benchmark</title>
        <script type="text/javascript">
            %(jquery_code)s
            ;(function(initialTime){
                function getMillisecondsElapsed() {
                    return (+new Date - initialTime) + 'ms';
                }
                $(document).ready(function(){
                    $('#document-ready-time').text(getMillisecondsElapsed());
                });
                $(window).load(function(){
                    $('#window-load-time').text(getMillisecondsElapsed());
                });
                window.finished = function() {
                    $('#javascript-finished-time').text(getMillisecondsElapsed());
                    if (window.parent.nextBenchmark) {
                        window.parent.nextBenchmark();
                    }
                };
            })(+new Date);
        </script>
        <style type="text/css">
            * {
                font-family: monospace;
            }
            h1 {
                text-align: center;
            }
            table, td {
                border-width: 1px;
                border-style: solid;
                border-spacing: 0px;
                border-color: #888;
            }
            table {
                width: 500px;
                margin-left: auto;
                margin-right: auto;
            }
            td {
                padding: 10px;
                background: #aaa;
            }
            .time-result {
                text-align: right;
                background: #ddd;
            }
        </style>
    </head>
    <body>

        <h1>%(embed_name)s Benchmark</h1>

        <table>
            <tr>
                <td>Milliseconds until <strong>document.ready</strong></td>
                <td id="document-ready-time" class="time-result"></td>
            </tr>
            <tr>
                <td>Milliseconds until <strong>window.onload</strong></td>
                <td id="window-load-time" class="time-result"></td>
            </tr>
            <tr>
                <td>Milliseconds until <strong>Javascript finished loading</strong></td>
                <td id="javascript-finished-time" class="time-result"></td>
            </tr>
        </table>

        <!-- begin embed code -->
        %(embed_html)s
        <!-- end embed code -->

    </body>
</html>
'''


"""
    author: Evan Fosmark
    source: http://www.evanfosmark.com/2008/12/python-wsgi-middleware-for-automatic-gzipping/2/

    A WSGI middleware application that automatically gzips output
    to the client.
    Before doing any gzipping, it first checks the environ to see if
    the client can even support gzipped output. If not, it immediately
    drops out.
    It automatically modifies the headers to include the proper values
    for the 'Accept-Encoding' and 'Vary' headers.

    Example of use:

        from wsgiref.simple_server import WSGIServer, WSGIRequestHandler

        def test_app(environ, start_response):
            status = '200 OK'
            headers = [('content-type', 'text/html')]
            start_response(status, headers)

            return ['Hello gzipped world!']

        app = Gzipper(test_app, compresslevel=8)
        httpd = WSGIServer(('', 8080), WSGIRequestHandler)
        httpd.set_app(app)
        httpd.serve_forever()

"""

def gzip_string(string, compression_level):
    """ The `gzip` module didn't provide a way to gzip just a string.
        Had to hack together this. I know, it isn't pretty.
    """
    fake_file = StringIO.StringIO()
    gz_file = GzipFile(None, 'wb', compression_level, fake_file)
    gz_file.write(string)
    gz_file.close()
    return fake_file.getvalue()

def parse_encoding_header(header):
    """ Break up the `HTTP_ACCEPT_ENCODING` header into a dict of
        the form, {'encoding-name':qvalue}.
    """
    encodings = {'identity':1.0}

    for encoding in header.split(","):
        if(encoding.find(";") > -1):
            encoding, qvalue = encoding.split(";")
            encoding = encoding.strip()
            qvalue = qvalue.split('=', 1)[1]
            if(qvalue != ""):
                encodings[encoding] = float(qvalue)
            else:
                encodings[encoding] = 1
        else:
            encodings[encoding] = 1
    return encodings

def client_wants_gzip(accept_encoding_header):
    """ Check to see if the client can accept gzipped output, and whether
        or not it is even the preferred method. If `identity` is higher, then
        no gzipping should occur.
    """
    encodings = parse_encoding_header(accept_encoding_header)

    # Do the actual comparisons
    if('gzip' in encodings):
        return encodings['gzip'] >= encodings['identity']

    elif('*' in encodings):
        return encodings['*'] >= encodings['identity']

    else:
        return False


class Gzipper(object):
    """ WSGI middleware to wrap around and gzip all output.
        This automatically adds the content-encoding header.
    """
    def __init__(self, app, compresslevel=6):
        self.app = app
        self.compresslevel = compresslevel

    def __call__(self, environ, start_response):
        """ Do the actual work. If the host doesn't support gzip as a proper encoding,
            then simply pass over to the next app on the wsgi stack.
        """
        accept_encoding_header = environ.get("HTTP_ACCEPT_ENCODING", "")
        if(not client_wants_gzip(accept_encoding_header)):
                return self.app(environ, start_response)

        def _start_response(status, headers, *args, **kwargs):
            """ Wrapper around the original `start_response` function.
                The sole purpose being to add the proper headers automatically.
            """
            headers.append(("Content-Encoding", "gzip"))
            headers.append(("Vary", "Accept-Encoding"))
            return start_response(status, headers, *args, **kwargs)

        data = "".join(self.app(environ, _start_response))
        return [gzip_string(data, self.compresslevel)]


class BenchmarkServer(object):

    def __init__(self, javascript_url, jquery_code, lightning_embed_code):
        self.__javascript_url = javascript_url
        self.__jquery_code = jquery_code
        self.__lightning_embed_code = lightning_embed_code

    def __get_embed_html(self, embed_name):
        javascript_url = self.__javascript_url
        lightning_embed_code = self.__lightning_embed_code
        html_lookup = {

            # simple synchronous loader
            'synchronous': '''<script type="text/javascript" src="%(javascript_url)s"></script>''' % locals(),

            # typical asynchronous loader
            'asynchronous': '''
                <script type="text/javascript">
                (function(){
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.async = true;
                    script.src = '%(javascript_url)s';
                    var entry = document.getElementsByTagName('script')[0];
                    entry.parentNode.insertBefore(script, entry);
                }());
                </script>
                ''' % locals(),

            # lightning loader (e.g. from embed.js in this project)
            'lightning': '''
                <script type="text/javascript">
                    %(lightning_embed_code)s;
                    lightning.require("benchmark", "%(javascript_url)s");
                </script>
                ''' % locals(),
        }
        return html_lookup.get(embed_name, '''<script type="text/javascript">document.write("invalid page")</script>''')

    def application_callback(self, environ, start_response):

        # parse the request
        setup_testing_defaults(environ)
        path = environ['PATH_INFO']
        querystring = environ['QUERY_STRING']
        multiargs = urlparse.parse_qs(querystring)

        # do different things based on
        if path == '/slowcontent':

            # we have to respond in a delayed fashion for testing purposes
            delay = float(multiargs.get('delay', [0])[0])
            content_type = multiargs.get('type', ['text/html'])[0]
            jsonp_callback = multiargs.get('jsonp', [None])[0]

            # build the response, after delaying for the requested time
            if delay:
                time.sleep(delay)
            content = "responded after delaying %(delay)s seconds with Content-type of %(content_type)s" % locals()
            if jsonp_callback:
                content = "%(jsonp_callback)s(%(content)r)" % locals()

        elif not path or path == '/':

            # we should show the root benchmarking page
            content_type = 'text/html'
            content = BENCHMARK_INDEX_HTML

        else:

            # otherwise, we are serving one of the embed benchmark pages
            content_type = 'text/html'
            embed_name = path[1:]
            jquery_code = self.__jquery_code
            embed_html = self.__get_embed_html(embed_name=embed_name)
            content = BENCHMARK_HTML_TEMPLATE % dict(
                embed_name=embed_name.capitalize().replace('-', ' '),
                embed_html=embed_html,
                jquery_code=jquery_code,
                )

        # write out the HTTP response
        status = '200 OK'
        headers = [('Content-type', content_type)]
        start_response(status, headers)
        return [content]

if __name__ == '__main__':

    # run the benchmarking server
    port = PORT
    project_path = os.path.abspath(os.path.dirname(__file__))
    benchmark_server = BenchmarkServer(
        javascript_url=JAVASCRIPT_URL,
        jquery_code=open(project_path + '/jquery.js').read(),
        lightning_embed_code=open(project_path + '/embed.js').read(),
        )
    httpd = make_server(
        host='',
        port=port,
        app=Gzipper(benchmark_server.application_callback, compresslevel=8),
        )
    print "serving locally on port %(port)s..." % locals()
    httpd.serve_forever()
