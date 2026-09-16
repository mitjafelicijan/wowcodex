# WoW Codex Tools

## Convert BLP to PNG
Batch convert BLP files while preserving the directory structure. Requires `blpconvert` utility in PATH.

```bash
./tools/bulkblpconvert.sh <source_interface_dir> <output_dir>
```

- **source_interface_dir**: Path to the exported WoW `Interface` directory.
- **output_dir**: Target directory for converted PNGs.

## Texture Explorer
A browser-based tool to view converted textures.

### 1. Generate Manifest
Updates `textures/manifest.json` with the current file list from the data directory.
```bash
python3 tools/generate_manifest.py data
```

### 2. Run
Serve the root directory using any local web server.
```bash
python3 -m http.server 8000
```
- Texture Explorer: `http://localhost:8000/textures/`
- API Reference: `http://localhost:8000/api/`

## API Reference
The API data is extracted from the Lua type definitions in `reference/WoWAPI`.

### Update API Data
```bash
python3 tools/generate_api_data.py
```

## Requirements
- `blpconvert`
- `python3`
- `bash`
