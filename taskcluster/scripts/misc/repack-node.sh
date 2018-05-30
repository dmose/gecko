#!/bin/bash
set -x -e -v

# This script is for repacking Node (and NPM) from nodejs.org.

case "$(uname -s)" in
Linux)
    WORKSPACE=$HOME/workspace
    UPLOAD_DIR=$HOME/artifacts
    ARCH=linux-x64
    # From https://nodejs.org/dist/v8.11.1/SHASUMS256.txt.asc
    SHA256SUM=6617e245fa0f7fbe0e373e71d543fea878315324ab31dc64b4eba10e42d04c11
    SUFFIX=tar.xz
    UNARCHIVE="tar xaf"
    ;;
MINGW*)
    WORKSPACE=$PWD
    UPLOAD_DIR=$WORKSPACE/public/build
    ARCH=win-x64
    # From https://nodejs.org/dist/v8.11.1/SHASUMS256.txt.asc
    SHA256SUM=7d49b59c2b5d73a14c138e8a215d558a64a5241cd5035d9824f608e7bba097b1
    SUFFIX=zip
    UNARCHIVE=unzip
    ;;
esac

VERSION=8.11.1
# From https://nodejs.org/en/download/
URL=https://nodejs.org/dist/v$VERSION/node-v$VERSION-$ARCH.$SUFFIX
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
tar caf $UPLOAD_DIR/node.tar.bz2 node

case "$(uname -s)" in
Linux)
    cd node/bin
    ./node -v
    # XXX should we remove the below as well as npm itself?
    PATH=./ ./npm -v
    ;;
MINGW*)
    cd node
    ./node.exe -v
    # XXX should we remove the below as well as npm itself?
    ./npm -v
    ;;
esac
