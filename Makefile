# Project Metadata
MEX_DESCRIPTION = "WoW Codex Tools: A collection of scripts to process World of Warcraft API reference data and textures for the browser-based explorer."
MEX_LICENSE = "Released under the BSD 2-Clause License."
MEX_ASSURE = "python3 bash blpconvert lua5.4"

include makext.mk

# Default target
help: .help

all: manifest api events library gear crafting quests # Run all generation targets

convert-textures: .assure # Convert BLP files to PNG
	@echo "Converting BLP files from reference/Interface to data..."
	@bash tools/convert_blp.sh reference/Interface data

manifest: .assure # Update textures/manifest.json from data
	@echo "Generating texture manifest..."
	@python3 tools/generate_manifest.py data

api: .assure # Update api/data.json from reference files
	@echo "Generating API data..."
	@python3 tools/generate_api_data.py

events: .assure # Update events/data.json from reference files
	@echo "Generating event data..."
	@python3 tools/generate_event_data.py

library: .assure # Update library/data.json from reference SQL
	@echo "Generating library data..."
	@python3 tools/extract_books.py

gear: .assure # Update dungeon-gear/dungeon_gear.json from AtlasLoot
	@echo "Generating gear data..."
	@python3 tools/extract_dungeon_gear.py

crafting: .assure # Update crafting/data.json from AtlasLoot
	@echo "Generating crafting data..."
	@python3 tools/extract_crafting.py

quests: .assure # Update dungeon-quests/dungeon_quests.json from reference files
	@echo "Generating dungeon quest data..."
	@mkdir -p dungeon-quests
	@lua5.4 tools/extract_dungeon_quests.lua > dungeon-quests/dungeon_quests.json

serve: # Start a local web server on 8080
	@echo "Starting server at http://localhost:8080..."
	@python3 -m http.server 8080

provision-tts: # Provisions TTS local setup
	@echo "Provisioning local TTS setup"
	@cd tools && bash tools/provision_tts.sh

convert-library: # Converts library books and documents to audio
	@echo "Converts library books and documents to audio"
	@cd tools/tts && . .venv/bin/activate && python ../convert_books.py

clean: # Remove all generated JSON files
	@echo "Cleaning generated files..."
	rm -f textures/manifest.json api/data.json events/data.json library/data.json dungeon-gear/dungeon_gear.json crafting/data.json dungeon-quests/dungeon_quests.json

.PHONY: all convert-textures manifest api events library gear crafting quests serve clean
