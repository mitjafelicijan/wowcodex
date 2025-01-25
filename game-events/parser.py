# Usage: python3 parser.py events.md > events.json

import sys
import json

def parse_file(file_path):
    entries = []
    current_entry = None

    with open(file_path, "r") as file:
        for line in file:
            line = line.strip()

            if line.startswith("# "):
                continue

            if line.startswith("## "):
                if current_entry:
                    entries.append(current_entry)

                current_entry = {
                        "name": line[2:].strip(),
                        "description": "",
                        "args": []
                        }
            elif current_entry is not None:
                if line.startswith("-"):
                    arg_line = line[1:].strip()
                    if ":" in arg_line:
                        key, description = arg_line.split(":", 1)
                        current_entry["args"].append({
                            "key": key.strip().replace("*", ""),
                            "description": description.strip()
                        })
                else:
                    if current_entry["description"]:
                        current_entry["description"] += " "
                    current_entry["description"] += line.strip()

        if current_entry:
            entries.append(current_entry)

    return entries

if len(sys.argv) < 2:
    print("Usage: python3 parser.py <filename>")
    sys.exit(1)

file_path = sys.argv[1]
parsed_entries = parse_file(file_path)
print(json.dumps(parsed_entries, indent=4))
