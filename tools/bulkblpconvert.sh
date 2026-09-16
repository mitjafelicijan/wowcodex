#!/bin/bash

# Function to show usage
usage() {
    echo "Usage: $0 <target_directory> <output_directory>"
    echo
    echo "Arguments:"
    echo "  target_directory  Path to the 'Interface' folder of WoW exported interface files."
    echo "                    The script iterates through its subdirectories to find .blp files."
    echo "  output_directory  The base directory where the converted .png files will be saved."
    echo "                    The folder structure (including the 'Interface' root) will be preserved."
    echo
    echo "Options:"
    echo "  -h, --help        Show this help message"
    exit 1
}

# Check for help flags
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

# Target directory from first argument
TARGET_DIR="${1%/}"
# Output directory from second argument
OUT_DIR="${2%/}"

# Validation
if [[ -z "$TARGET_DIR" || ! -d "$TARGET_DIR" || -z "$OUT_DIR" ]]; then
    usage
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
done

