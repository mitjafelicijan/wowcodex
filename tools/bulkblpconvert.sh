#!/bin/bash

# Target directory from first argument
TARGET_DIR="${1%/}"
# Output directory from second argument
OUT_DIR="${2%/}"

# Validation
if [[ -z "$TARGET_DIR" || ! -d "$TARGET_DIR" || -z "$OUT_DIR" ]]; then
    echo "Usage: $0 <target_directory> <output_directory>"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$OUT_DIR"

TARGET_BASE=$(basename "$TARGET_DIR")

# Loop through one-level-deep subdirectories
for dir in "$TARGET_DIR"/*/; do
    # Handle cases where no subdirectories exist
    [[ -d "$dir" ]] || continue
    
    dir_name=$(basename "$dir")
    echo "Processing directory: $dir_name"
    
    # Find all .blp or .BLP files in the current subdirectory
    find "$dir" -type f -iname "*.blp" -print0 | while IFS= read -r -d '' file; do
        # Calculate relative path from TARGET_DIR
        rel_path="${file#$TARGET_DIR/}"
        dest_file="$OUT_DIR/$TARGET_BASE/$rel_path"
        dest_dir=$(dirname "$dest_file")
        
        # Ensure destination directory exists
        mkdir -p "$dest_dir"
        
        # Copy original BLP to destination structure
        cp "$file" "$dest_file"
        
        # Convert the copied file to PNG
        # blpconvert -f png will create a .png file in the same directory
        blpconvert -f png "$dest_file" > /dev/null 2>&1
        
        # Remove the original .blp in the output directory
        rm "$dest_file"
    done
    
    echo "Completed directory: $dir_name"
    break # Only process the first directory for testing
done

