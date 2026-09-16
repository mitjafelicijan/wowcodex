# WoW Codex Tools

A collection of tools to process World of Warcraft API reference data and textures for a browser-based explorer.

## Usage

All data is prebuilt and the explorer is ready to use immediately.

### Run Explorer

Start the local development server to view the explorer.

```bash
make serve
```

- Explorer: `http://localhost:8080`

### Update Data

If you have updated the reference files, you can regenerate the API, events, and texture manifest data.

```bash
make all
```

### Lore Library

The explorer includes a library of unique World of Warcraft lore books with high-quality audio narrations.

#### Extract Books

To extract unique lore books (GameObject Type 9) from the reference database into `library/data.json`:

```bash
make library
```

#### Setup TTS

Provision the local Python environment required for the Kokoro TTS engine:

```bash
make provision-tts
```

#### Convert to Audio

Generate `.ogg` audio files for all extracted books:

```bash
make convert-library
```
- The voice is set to `af_heart` by default. You can change the `VOICE` variable at the top of `tools/convert_books.py`.
- For a full list of available voices, see the [Kokoro Voices list](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).

### Convert Textures

If you need to refresh the texture library, use this command to convert BLP files from `reference/Interface` to `data`.

```bash
make convert-textures
```

## Requirements

- `make`
- `python3`
- `bash`
- [blpconvert](https://github.com/mitjafelicijan/blpconvert) (required for texture conversion)

## Legal Notice

World of Warcraft®, Warcraft® and Blizzard Entertainment® are trademarks or registered trademarks of Blizzard Entertainment, Inc. in the United States and/or other countries.

All assets, including but not limited to textures, interface files, and API reference data, are the sole and exclusive property of Blizzard Entertainment, Inc. This project is a non-commercial, fan-made tool intended for personal use and creative exploration. It is not affiliated with, endorsed by, or sponsored by Blizzard Entertainment in any way. No ownership is claimed over any Blizzard Entertainment intellectual property.
