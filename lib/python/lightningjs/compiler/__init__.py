import os
import re
import sys
import tempfile
import subprocess

_CLOSURE_COMPRESSOR_PATH = os.path.join(os.path.dirname(__file__), 'closure-compiler.jar')
_YUI_COMPRESSOR_PATH = os.path.join(os.path.dirname(__file__), 'yuicompressor-2.4.2.jar')

def minify_with_closure(path):
    pipe = subprocess.Popen([
        'java',
        '-jar',
        _CLOSURE_COMPRESSOR_PATH,
        # '--compilation_level',
        # 'ADVANCED_OPTIMIZATIONS',
        '--js',
        path,
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    response = pipe.communicate()

    def only_warning_is_about_the_with_statement(output):
        lines = output.split('\n')
        num_warning_lines = len([True for line in lines if 'WARNING' in line])
        num_with_warning_lines = len([True for line in lines if 'The use of the with structure should be avoided.' in line])
        if num_with_warning_lines == num_warning_lines:
            # all warnings were for the 'with' construct, ignore them
            return True
        else:
            return False

    if response[1] and not only_warning_is_about_the_with_statement(output=response[1]):
        # TODO: render the closure errors more nicely?
        error_list = [response[1]]
        details = '\n'.join(error_list)
        raise StandardError("failed to compile module '%(path)s':\n\n%(details)s\n\n" % locals())
    return response[0]

def minify_with_yuicompressor(path, retain_variable_names=False):
    # helper for displaying line-by-line YUI compressor errors
    def _contextualize_yuicompressor_errors(path, yui_stderr_string):
        # parse the YUI compressor errors line-by-line
        reasons = [' '.join(x.split()[1:]) for x in yui_stderr_string.split('\n') if '[ERROR]' in x]
        errors = []
        with open(path) as source_fd:
            lines = source_fd.readlines()
            for reason in reasons:
                line_number = int(reason.split(':')[0]) - 1
                line_contents = lines[line_number].strip()
                errors += ['%(reason)s =====> %(line_contents)s' % locals()]
        return errors

    command_pieces = [
        'java',
        '-jar',
        _YUI_COMPRESSOR_PATH
    ]
    if retain_variable_names:
        command_pieces += ['--nomunge']
    command_pieces += [
        '--type',
        'js',
        path,
    ]
    pipe = subprocess.Popen(command_pieces, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    response = pipe.communicate()
    if response[1]:
        error_list = _contextualize_yuicompressor_errors(path=module.path, yui_stderr_string=response[1])
        details = '\n'.join(error_list)
        raise StandardError("failed to compile module '%(path)s':\n\n%(details)s\n\n" % locals())
    return response[0]
