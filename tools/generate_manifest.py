import os
import json
import sys

def build_tree(path):
    d = {'name': os.path.basename(path), 'type': 'directory', 'children': []}
    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        return None

    for entry in entries:
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            child = build_tree(full_path)
            if child and (child['children']): # Only add if it contains something
                d['children'].append(child)
        elif entry.lower().endswith('.png'):
            d['children'].append({
                'name': entry,
                'type': 'file',
                'path': full_path
            })
    
    # Filter out directories that ended up empty after filtering for .png
    d['children'] = [c for c in d['children'] if c['type'] == 'file' or (c['type'] == 'directory' and c['children'])]
    
    return d

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_manifest.py <root_dir>")
        sys.exit(1)
    
    root_dir = sys.argv[1]
    if not os.path.isdir(root_dir):
        print(f"Error: {root_dir} is not a directory")
        sys.exit(1)
    
    tree = build_tree(root_dir)
    
    with open('textures/manifest.json', 'w') as f:
        json.dump(tree, f, indent=2)
    print("Manifest generated at textures/manifest.json")

if __name__ == "__main__":
    main()
