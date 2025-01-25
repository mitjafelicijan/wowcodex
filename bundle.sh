#!/usr/bin/env bash

# Default index page
mkdir -p public/
cp default/* public/

# Interface explorer
mkdir -p public/interface-explorer
cp -Rf interface-explorer/1.12/www/* public/interface-explorer
cp -Rf interface-explorer/1.12/assets public/interface-explorer
