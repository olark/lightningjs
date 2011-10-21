import os
import urlparse
from SocketServer import ThreadingMixIn
from wsgiref.util import setup_testing_defaults
from wsgiref.simple_server import make_server, WSGIServer
from lightningjs.http.gzipper import GzipperMiddleware


class ThreadedWsgiServer(ThreadingMixIn, WSGIServer):
     pass


class RoutableApplication(object):

    def __init__(self, routable_object):
        self.__routable_object = routable_object

    def __call__(self, environ, start_response):

        # parse the request
        setup_testing_defaults(environ)
        path = environ['PATH_INFO']
        querystring = environ['QUERY_STRING']
        multiargs = urlparse.parse_qs(querystring)

        # get the route and the associated Python method, then execute
        # that method with the given querystring parameters as Python kwargs
        if path[1:]:
            path_method = 'get_%s' % path[1:]
        else:
            path_method = 'get_index'
        if hasattr(self.__routable_object, path_method):

            # call the routed method
            single_value_args = {}
            for key in multiargs:
                single_value_args[key] = multiargs[key][0]
            status, content_type, content = getattr(self.__routable_object, path_method)(**single_value_args)

        else:
            # route doesn't exist
            content_type = 'text/html'
            content = status = '404 NOT FOUND'

        # write out the HTTP response
        status = '200 OK'
        headers = [('Content-type', content_type)]
        start_response(status, headers)
        return [content]


def serve_routable_object(routable_object, port):

    routable_server = RoutableApplication(routable_object=routable_object)
    httpd = make_server(
        host='',
        port=port,
        app=GzipperMiddleware(routable_server, compresslevel=8),
        server_class=ThreadedWsgiServer,
        )
    httpd.serve_forever()

def render_browser_template(path, **kwargs):

    template_path = os.path.join(os.path.dirname(__file__), 'templates', path)
    with open(template_path, 'r') as template_fd:
        content = template_fd.read()
        if kwargs:
            # do Python string templates if given
            content = content % kwargs
        return content
