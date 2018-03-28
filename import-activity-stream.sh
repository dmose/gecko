#!/bin/bash

set -x -e -v

# Like '837cea5f'.
REV=`grep 'em:version' browser/extensions/activity-stream/install.rdf.in | python -c 'import sys; print(sys.stdin.readline().rsplit("-", 1)[1].split("<", 1)[0])'`

pushd browser/extensions/activity-stream
FILES="*/package.json */webpack.system-addon.config.js */webpack.prerender.config.js */system-addon/content-src"
curl -L https://github.com/mozilla/activity-stream/archive/$REV.tar.gz | tar zxf - --strip-components 1 $FILES
popd
