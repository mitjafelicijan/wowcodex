#!/usr/bin/env bash

mkdir -p public/

# Default index page
cp -Rf default/* public/

# Default index page
cp -Rf www-assets/ public/

# Interface explorer
mkdir -p public/interface-explorer
cp -Rf interface-explorer/1.12/www/* public/interface-explorer
cp -Rf interface-explorer/1.12/assets public/interface-explorer

# Audio library
cp -Rf audio-library/ public/

