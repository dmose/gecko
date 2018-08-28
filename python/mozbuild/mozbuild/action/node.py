# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from __future__ import absolute_import, unicode_literals, print_function

import buildconfig
import os
import pipes
import subprocess
import sys


# XXXdmose - we should probably make this the empty list before landing,
# since we don't want to support webpack just yet.
SCRIPT_WHITELIST = [
        buildconfig.topsrcdir + "/node_modules/webpack/bin/webpack.js"
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


def main(output, config, *flags):
    # config is passed the first input (i.e. dependency).  flags is a tuple
    # containing the rest of the inputs, then the string '--' as a delimiter,
    # followed by the list of arguments that should be passed to node on the
    # command line.

    def build_node_cmd_list():
        # Note the we're ignoring the inputs for now, as our test
        # use case has all this stuff specified in webpack.config.
        # Subsequent use cases may need better support than this.
        inputs = [config]

        # XXX handle no inputs
        # XXX handle no -- delimiter
        flagsIter = iter(flags)
        token = flagsIter.next()
        while token != '--':
            inputs += token
            token = flagsIter.next()

        node_interpreter = buildconfig.substs['NODEJS']

        try:
            script_to_run = flagsIter.next()
        except StopIteration:
            raise ValueError("moz.build file didn't specify a node script")

        if (not is_script_in_whitelist(script_to_run)):
            raise ValueError(WHITELIST_WARNING % (script_to_run))

        node_cmd_list = [node_interpreter, script_to_run]

        script_args = list(flagsIter)
        node_cmd_list.extend(script_args)

        return node_cmd_list

    # XXX right now, we're just grabbing the path to execute in from
    # the first input file.  It's not clear that this will actually be
    # suitable for all use cases.
    cwd = os.path.dirname(os.path.abspath(config))

    if(flags.count('--') != 1):
        raise ValueError('Exactly one -- delimiter must be given to '
                         'separate inputs from node arguments')

    node_cmd_list = build_node_cmd_list()

    try:
        print('Executing [%s]' % ', '.join(map(str, node_cmd_list)))

        cmd = ' '.join(pipes.quote(arg) for arg in node_cmd_list)
        print('"{}" in {}'.format(cmd, cwd), file=sys.stderr)
        sys.stderr.flush()

        # XXX do we actually want to pass through the whole environment?
        env = dict(os.environ)

        subprocess.check_call(node_cmd_list, cwd=cwd, env=env)

        return 0
    except subprocess.CalledProcessError as err:
        # XXX On Mac (and elsewhere?) "OSError: [Errno 13] Permission denied"
        # (at least sometimes) means "node executable not found".  Can we
        # disambiguate this from real "Permission denied" errors so that we
        # can log such problems more clearly?
        print('Failed with %s.' % str(err))
        return 1

