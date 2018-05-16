# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Invoke yarn.

from __future__ import absolute_import, unicode_literals, print_function

import buildconfig
import mozpack.path as mozpath
import os
import pipes
import subprocess
import sys


def main(output, config, *flags):
    # XXX once we switch to multiple inputs, we may need a better way
    # to get this
    cwd = os.path.dirname(os.path.abspath(config))

    try:
        if(flags.count('--') != 1):
            raise ValueError('Exactly one -- delimiter must be given to separate inputs from node arguments')

        delimiterIndex = flags.index('--')

        # XXX Do we even need to do anything with the inputs?  If so, they're
        # here:
        # inputs = flags[:delimiterIndex]

        nodeArgs = [buildconfig.substs['NODE']]
        nodeArgs += flags[delimiterIndex + 1:]

        cmd = ' '.join(pipes.quote(arg) for arg in nodeArgs)
        print('"{}" in {}'.format(cmd, cwd), file=sys.stderr)
        sys.stderr.flush()

        env = dict(os.environ)

        subprocess.check_call(nodeArgs, cwd=cwd, env=env)

        return 0
    except subprocess.CalledProcessError as err:
        # XXX On Mac (and elsewhere?) "OSError: [Errno 13] Permission denied"
        # (at least sometimes) means "node executable not found".  Can we
        # disambiguate this from real "Permission denied" errors so that we
        # can log such problems more clearly?
        print('Failed with %s.' % str(err))
        return 1
