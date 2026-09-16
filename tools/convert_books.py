from kokoro import KPipeline
import numpy as np
import soundfile as sf
import torch
import json
import os
from pathlib import Path

# Setup paths relative to project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
INPUT_JSON = PROJECT_ROOT / "library" / "data.json"
OUTPUT_DIR = PROJECT_ROOT / "data" / "Library"
ERROR_FILE = PROJECT_ROOT / "errors.txt"
VOICE = 'af_heart'

def main():
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not INPUT_JSON.exists():
        print(f"Error: {INPUT_JSON} not found")
        return

    # Load books from library data
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        books = json.load(f)

    # Filter valid entries
    valid_books = [b for b in books if b.get('entry') and b.get('content')]
    total = len(valid_books)

    print(f"Found {total} valid entries. Initializing TTS pipeline...")
    
    # Initialize pipeline (lang_code='a' for American English)
    pipeline = KPipeline(lang_code='a')

    for i, book in enumerate(valid_books, 1):
        entry = book.get('entry')
        content = book.get('content')
            
        output_file = OUTPUT_DIR / f"{entry}.ogg"

        # Skip if already converted
        if output_file.exists():
            continue

        print(f"Converting {entry}... [{i}/{total}]")
        
        try:
            # Generate audio chunks (Kokoro outputs at 24000Hz)
            generator = pipeline(" " + content, voice=VOICE)
            
            with sf.SoundFile(
                str(output_file),
                mode="w",
                samplerate=24000,
                channels=1,
                format="OGG",
                subtype="VORBIS",
            ) as out:
                # Add 1s of leading silence
                out.write(np.zeros(int(24000 * 1.0), dtype=np.float32))

                for chunk_idx, (gs, ps, audio) in enumerate(generator):
                    if hasattr(audio, "detach"):
                        audio = audio.detach().cpu().numpy()
                    
                    audio = np.asarray(audio, dtype=np.float32).squeeze()
                    out.write(audio)
        except Exception as e:
            print(f"Error converting {entry}: {e}")
            with open(ERROR_FILE, "a") as ef:
                ef.write(f"{entry}\n")

if __name__ == "__main__":
    main()
