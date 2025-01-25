#!/usr/bin/env bash

mkdir -p public/

# Default index page
cp -Rf default/* public/

# Default assets
cp -Rf www-assets/ public/

# Interface Explorer
mkdir -p public/interface-explorer
cp -Rf interface-explorer/1.12/www/* public/interface-explorer
cp -Rf interface-explorer/1.12/assets public/interface-explorer

# Audio Library
cp -Rf audio-library/ public/

# Game Events
cp -Rf game-events/ public/

