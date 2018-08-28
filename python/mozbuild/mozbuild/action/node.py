# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from __future__ import absolute_import, unicode_literals, print_function

import buildconfig
import os
import pipes
import subprocess
import sys


SCRIPT_WHITELIST = [
        buildconfig.topsrcdir + "/devtools/client/debugger/new/build/copy-module.js"
    ]

WHITELIST_WARNING = '''
%s is not
in SCRIPT_WHITELIST in python/mozbuild/mozbuild/action/node.py.
Using NodeJS from moz.build is currently in beta, and node
scripts to be executed need to be added to the whitelist and
reviewed by a build peer so that we can get a better sense of
how support should evolve.
'''


def is_script_in_whitelist(script_path):
    if script_path in SCRIPT_WHITELIST:
        return True

    return False


def execute_node_cmd(node_cmd_list):
    """Execute the given node command list.

    Arguments:
    node_cmd_list -- a list of the command and arguments to be executed

    Returns:
    The set of dependencies which should trigger this command to be re-run.
    This is ultimately returned to the build system for use by the backend
    to ensure that incremental rebuilds happen when any dependency changes.

    The node script is expected to output lines for all of the dependencies
    to stdout, each prefixed by the string "dep:".  These lines will make up
    the returned set of dependencies.  Any line not so-prefixed will simply be
    printed to stderr instead.
    """

    try:
        printable_cmd = ' '.join(pipes.quote(arg) for arg in node_cmd_list)
        print('Executing "{}"'.format(printable_cmd), file=sys.stderr)
        sys.stderr.flush()

        # XXX do we actually want to pass through the whole environment?
        env = dict(os.environ)

        output = subprocess.check_output(node_cmd_list, env=env)

        # Process the node script output
        deps = []
        for line in output.splitlines():
            if 'dep:' in line:
                deps.append(line.replace('dep:', ''))
        else:
            print(line, file=sys.stderr)
            sys.stderr.flush()

        return set(deps)

    except subprocess.CalledProcessError as err:
        # XXX On Mac (and elsewhere?) "OSError: [Errno 13] Permission denied"
        # (at least sometimes) means "node executable not found".  Can we
        # disambiguate this from real "Permission denied" errors so that we
        # can log such problems more clearly?
        print("""Failed with %s.  Be sure to check that your mozconfig doesn't
            have --disable-nodejs in it.  If it does, try removing that line and
            building again.""" % str(err), file=sys.stderr)
        raise err


def generate(output, node_script, *files):
    """Call the given node_script to transform the given modules.

    Arguments:
    output -- a dummy file, used by the build system.  Can be ignored.
    node_script -- the script to be executed.  Must be in the SCRIPT_WHITELIST
    files -- files to be transformed, will be passed to the script as arguments

    Returns:
    The set of dependencies which should trigger this command to be re-run.
    This is ultimately returned to the build system for use by the backend
    to ensure that incremental rebuilds happen when any dependency changes.
    """

    node_interpreter = buildconfig.substs['NODEJS']

    if type(node_script) is not str:
        raise ValueError("moz.build file didn't specify a node script")

    if not is_script_in_whitelist(node_script):
        raise ValueError(WHITELIST_WARNING % (node_script))

    node_cmd_list = [node_interpreter, node_script]
    node_cmd_list.extend(files)

    return execute_node_cmd(node_cmd_list)
