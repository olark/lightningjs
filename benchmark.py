import os
import time
import urlparse
from wsgiref.util import setup_testing_defaults
from wsgiref.simple_server import make_server

PORT = 8000

BENCHMARK_INDEX_HTML = '''
<!DOCTYPE html>
<html>
    <head>
        <title>Embed Benchmarks</title>
    </head>
    <body>
        <h1>Benchmarking</h1>
        <ul>
            <li>
                <a href="/synchronous">synchronous embed</a>
            </li>
        </ul>
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
                $(document).ready(function(){
                    $('#document-ready-time').text(+new Date - initialTime);
                });
                $(window).load(function(){
                    $('#window-load-time').text(+new Date - initialTime);
                });
                window.finished = function() {
                    $('#javascript-finished-time').text(+new Date - initialTime);
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

EMBED_HTML_LOOKUP = {
    'synchronous': '''<script type="text/javascript" src="//localhost:%(PORT)s/slowcontent?delay=2&type=text/javascript&jsonp=window.finished"></script>''' % locals()
}


class BenchmarkServer(object):

    def __init__(self, jquery_code):
        self.__jquery_code = jquery_code

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
            embed_html = EMBED_HTML_LOOKUP.get(embed_name, EMBED_HTML_LOOKUP['synchronous'])
            content = BENCHMARK_HTML_TEMPLATE % dict(
                embed_name=embed_name.capitalize(),
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
    jquery_path = os.path.abspath(os.path.dirname(__file__)) + '/jquery.js'
    benchmark_server = BenchmarkServer(jquery_code=open(jquery_path).read())
    httpd = make_server('', port, benchmark_server.application_callback)
    print "serving locally on port %(port)s..." % locals()
    httpd.serve_forever()
