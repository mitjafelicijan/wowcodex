#!/bin/bash

mkdir tts && cd tts

sudo xbps-install -S espeak-ng uv

uv python install 3.12
uv venv --python 3.12

source .venv/bin/activate
uv pip install kokoro>=0.9.2 soundfile IPython