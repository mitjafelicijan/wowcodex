# Project Metadata
MEX_DESCRIPTION = "WoW Codex Tools: A collection of scripts to process World of Warcraft API reference data and textures for the browser-based explorer."
MEX_LICENSE = "Released under the BSD 2-Clause License."
MEX_ASSURE = "python3 bash blpconvert"

include makext.mk

# Default target
help: .help

all: manifest api events # Run manifest, api, and events targets

convert-textures: .assure # Convert BLP files to PNG
	@echo "Converting BLP files from reference/Interface to data..."
	@./tools/bulkblpconvert.sh reference/Interface data

manifest: .assure # Update textures/manifest.json from data
	@echo "Generating texture manifest..."
	@python3 tools/generate_manifest.py data

api: .assure # Update api/data.json from reference files
	@echo "Generating API data..."
	@python3 tools/generate_api_data.py

events: .assure # Update events/data.json from reference files
	@echo "Generating event data..."
	@python3 tools/generate_event_data.py

serve: # Start a local web server on 8080
	@echo "Starting server at http://localhost:8080..."
	@python3 -m http.server 8080

clean: # Remove all generated JSON files
	@echo "Cleaning generated files..."
	rm -f textures/manifest.json api/data.json events/data.json

.PHONY: all convert-textures manifest api events serve clean
