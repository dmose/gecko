#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script installs Node v10.
# XXX For now, this should match the version installed in
# taskcluster/scripts/misc/repack-node.sh. Later we'll get the ESLint builder
# to use the linux64-node toolchain directly.

wget --progress=dot:mega https://nodejs.org/dist/latest-v10.x/node-v10.17.0-linux-x64.tar.xz

echo '2b49cd296f969ef0ffb7922719ffa6542bedb89d6c959a47c023d11ce222f5d6  node-v10.17.0-linux-x64.tar.xz' | sha256sum -c
tar -C /usr/local -xJ --strip-components 1 < node-v10.17.0-linux-x64.tar.xz
node -v  # verify
npm -v
