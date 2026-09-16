import re
import os
import json

def parse_lua_file(filepath, category):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    functions = []
    current_docs = []
    
    for line in lines:
        raw_line = line
        line = line.strip()
        
        if line.startswith('---'):
            current_docs.append(line)
        elif line.startswith('function'):
            match = re.match(r'function\s+([\w:.]+)\s*\((.*)\)', line)
            if match:
                name = match.group(1)
                func_data = {
                    'name': name,
                    'description': '',
                    'params': [],
                    'returns': [],
                    'category': category,
                    'file': os.path.basename(filepath)
                }
                
                desc_lines = []
                for doc in current_docs:
                    if doc.startswith('---@param'):
                        m = re.match(r'---@param\s+(\w+)\s+([\w|\[\]<>.,\s"\'|]+?)(?:\s+(.*))?$', doc)
                        if m:
                            func_data['params'].append({
                                'name': m.group(1),
                                'type': m.group(2).strip(),
                                'description': (m.group(3) or "").strip()
                            })
                    elif doc.startswith('---@return'):
                        m = re.match(r'---@return\s+([\w|\[\]<>.,\s"\'|]+?)(?:\s+(\w+))?(?:\s+(.*))?$', doc)
                        if m:
                            func_data['returns'].append({
                                'type': m.group(1).strip(),
                                'name': (m.group(2) or "").strip(),
                                'description': (m.group(3) or "").strip()
                            })
                    elif any(doc.startswith(x) for x in ['---@meta', '---@nodiscard', '---@field', '---@class', '---@overload']):
                        continue
                    elif doc.startswith('---'):
                        desc_text = doc.replace('---', '', 1).strip()
                        if desc_text:
                            desc_lines.append(desc_text)
                
                func_data['description'] = ' '.join(desc_lines).strip()
                functions.append(func_data)
            
            current_docs = []
        elif not line:
            # Optional: Decide if empty lines between docs and function are allowed.
            # Usually EmmyLua requires them to be together.
            # But sometimes there are empty lines between doc blocks.
            # Let's only clear if it's NOT a doc line.
            # Actually, most EmmyLua has docs right above the function.
            pass 
        else:
            # Some other code line, clear docs
            if not line.startswith('--'): # Ignore regular comments too?
                 current_docs = []

    return functions

def main():
    base_path = "reference/WoWAPI"
    output_data = []

    # Process Client/Function (Global Functions)
    client_func_path = os.path.join(base_path, "Client/Function")
    if os.path.exists(client_func_path):
        for filename in sorted(os.listdir(client_func_path)):
            if filename.endswith(".d.lua"):
                output_data.extend(parse_lua_file(os.path.join(client_func_path, filename), "Global"))

    # Process UI_Vanilla (UI Globals/Frames)
    ui_vanilla_path = os.path.join(base_path, "UI_Vanilla")
    if os.path.exists(ui_vanilla_path):
        for filename in sorted(os.listdir(ui_vanilla_path)):
            if filename.endswith(".d.lua"):
                output_data.extend(parse_lua_file(os.path.join(ui_vanilla_path, filename), "UI"))

    # Process Widgets
    widget_path = os.path.join(base_path, "Client/Widget.d.lua")
    if os.path.exists(widget_path):
         output_data.extend(parse_lua_file(widget_path, "Widget"))

    with open('api/data.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Generated API data with {len(output_data)} entries.")

if __name__ == "__main__":
    main()
