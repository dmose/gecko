#!/bin/bash
set -x -e -v

# This script is for repacking Node (and NPM) from nodejs.org.

WORKSPACE=$HOME/workspace
SUFFIX=tar.xz
UNARCHIVE="tar xaf"
REPACK_TAR_COMPRESSION_SWITCH=J
REPACK_SUFFIX=tar.xz

case "$1" in
linux64)
    ARCH=linux-x64
    # From https://nodejs.org/dist/latest-v10.x/SHASUMS256.txt.asc
    SHA256SUM=2b49cd296f969ef0ffb7922719ffa6542bedb89d6c959a47c023d11ce222f5d6
    ;;
macosx64)
    ARCH=darwin-x64
    # From https://nodejs.org/dist/latest-v10.x/SHASUMS256.txt.asc
    SHA256SUM=540a8f636eabe470be454f63791165c8118bd7b5534fba0dd588d97c3ef0a0f2
    ;;
win64)
    ARCH=win-x64
    # From https://nodejs.org/dist/latest-v10.x/SHASUMS256.txt.asc
    SHA256SUM=e84a1f3685219811bb4662eb3e3b55abd0c764c24cd2b224ba31b3f9f162baf6
    SUFFIX=zip
    UNARCHIVE=unzip
    REPACK_TAR_COMPRESSION_SWITCH=j
    REPACK_SUFFIX=tar.bz2
    ;;
win32)
    ARCH=win-x86
    # From https://nodejs.org/dist/latest-v10.x/SHASUMS256.txt.asc
    SHA256SUM=1956af513eba539614f5428f4fccdbb438fb33593f789bc20033b6a88c005cf1
    SUFFIX=zip
    UNARCHIVE=unzip
    REPACK_TAR_COMPRESSION_SWITCH=j
    REPACK_SUFFIX=tar.bz2
    ;;
esac

VERSION=10.17.0
# From https://nodejs.org/dist/latest-v10.x/
URL=https://nodejs.org/dist/latest-v10.x/node-v$VERSION-$ARCH.$SUFFIX
ARCHIVE=node-v$VERSION-$ARCH.$SUFFIX
DIR=node-v$VERSION

mkdir -p $UPLOAD_DIR

cd $WORKSPACE
wget --progress=dot:mega $URL

# shasum is available on both Linux and Windows builders, but on
# Windows, reading from stdin doesn't work as expected.
echo "$SHA256SUM  $ARCHIVE" > node.txt
shasum --algorithm 256 --check node.txt

$UNARCHIVE $ARCHIVE
mv node-v$VERSION-$ARCH node
tar c${REPACK_TAR_COMPRESSION_SWITCH}f $UPLOAD_DIR/node.$REPACK_SUFFIX node
