import os
import re
import json

def parse_event_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Events are separated by --- lines
    # We'll split by empty '---' lines or transitions
    # Example:
    # --- Fired when X
    # --- arg1 type desc
    # --- | "EVENT_NAME"
    # ---
    
    blocks = re.split(r'\n---\s*\n', content)
    events = []
    
    filename = os.path.basename(filepath).replace('.d.lua', '')

    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip().startswith('---')]
        if not lines:
            continue
            
        event_data = {
            'name': '',
            'description': '',
            'params': [],
            'category': filename
        }
        
        desc_lines = []
        is_event = False
        
        for line in lines:
            # Check for event name: --- | "NAME"
            match_name = re.match(r'^---\s*\|\s*"([^"]+)"', line)
            if match_name:
                event_data['name'] = match_name.group(1)
                is_event = True
                continue
                
            # Check for args: --- arg1 Type Description
            match_arg = re.match(r'^---\s*arg(\d+)\s+(\w+)?(?:\s+(.*))?$', line)
            if match_arg:
                event_data['params'].append({
                    'index': match_arg.group(1),
                    'type': (match_arg.group(2) or "").strip(),
                    'description': (match_arg.group(3) or "").strip()
                })
                continue
                
            # Otherwise it's description, if it doesn't start with @
            if not line.startswith('---@') and not line.strip() == '---':
                desc_text = line.replace('---', '', 1).strip()
                if desc_text and not desc_text.startswith('|'):
                    desc_lines.append(desc_text)
                    
        event_data['description'] = ' '.join(desc_lines).strip()
        
        if is_event and event_data['name']:
            events.append(event_data)
            
    return events

def main():
    event_dir = "reference/WoWAPI/Client/Event"
    all_events = []
    
    if os.path.exists(event_dir):
        for filename in sorted(os.listdir(event_dir)):
            if filename.endswith(".d.lua"):
                all_events.extend(parse_event_file(os.path.join(event_dir, filename)))
                
    # Create events directory if it doesn't exist
    os.makedirs('events', exist_ok=True)
    
    with open('events/data.json', 'w', encoding='utf-8') as f:
        json.dump(all_events, f, indent=2)
        
    print(f"Generated {len(all_events)} events.")

if __name__ == "__main__":
    main()
