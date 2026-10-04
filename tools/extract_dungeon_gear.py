import re
import json
import os

def extract_mappings(text_parsing_content):
    mappings = {}
    matches = re.findall(r'gsub\(text, "(#.*?#)", (?:AL|BC|BS|BF|BIS|BB)\["(.*?)"\]\)', text_parsing_content)
    for placeholder, key in matches:
        mappings[placeholder] = key
    
    # Structure these for tag extraction
    class_mappings = {
        "#c1#": "Druid", "#c2#": "Hunter", "#c3#": "Mage", "#c4#": "Paladin",
        "#c5#": "Priest", "#c6#": "Rogue", "#c7#": "Shaman", "#c8#": "Warlock", "#c9#": "Warrior"
    }
    type_mappings = {
        "#a1#": "Cloth", "#a2#": "Leather", "#a3#": "Mail", "#a4#": "Plate",
        "#w1#": "Axe", "#w2#": "Bow", "#w3#": "Crossbow", "#w4#": "Dagger",
        "#w5#": "Gun", "#w6#": "Mace", "#w7#": "Polearm", "#w8#": "Shield",
        "#w9#": "Staff", "#w10#": "Sword", "#w11#": "Thrown", "#w12#": "Wand",
        "#w13#": "Fist Weapon", "#w14#": "Fishing Pole",
        "#s15#": "Held In Off-hand", "#s16#": "Relic",
        "#s13#": "Ring", "#s14#": "Trinket", "#s2#": "Neck", "#e20#": "Book"
    }
    slot_mappings = {
        "#s1#": "Head", "#s2#": "Neck", "#s3#": "Shoulder", "#s4#": "Back",
        "#s5#": "Chest", "#s6#": "Shirt", "#s7#": "Tabard", "#s8#": "Wrist",
        "#s9#": "Hands", "#s10#": "Waist", "#s11#": "Legs", "#s12#": "Feet",
        "#s13#": "Ring", "#s14#": "Trinket", "#s15#": "Held In Off-hand", "#s16#": "Relic",
        "#h1#": "One-Hand", "#h2#": "Two-Hand", "#h3#": "Main Hand", "#h4#": "Off Hand"
    }
    profession_mappings = {
        "#p1#": "Alchemy", "#p2#": "Blacksmithing", "#p3#": "Cooking", "#p4#": "Enchanting",
        "#p5#": "Engineering", "#p6#": "First Aid", "#p7#": "Leatherworking", "#p8#": "Tailoring"
    }
    
    manual_mappings = {}
    manual_mappings.update(class_mappings)
    manual_mappings.update(type_mappings)
    manual_mappings.update(slot_mappings)
    manual_mappings.update(profession_mappings)
    
    mappings.update(manual_mappings)
    return mappings, class_mappings, type_mappings, slot_mappings, profession_mappings

def get_babble_translations(file_path):
    if not os.path.exists(file_path):
        return {}
    with open(file_path, 'r') as f:
        content = f.read()
    
    translations = {}
    # Specifically target the enUS registration block
    en_us_match = re.search(r'RegisterTranslations\("enUS",\s*function\(\)\s*return\s*\{(.*?)\}\s*end\)', content, re.DOTALL)
    if not en_us_match:
        en_us_match = re.search(r'RegisterTranslations\("enUS",.*?\n\treturn\s*\{(.*?)\n\t\}', content, re.DOTALL)

    if en_us_match:
        section = en_us_match.group(1)
        matches = re.findall(r'\["(.*?)"\]\s*=\s*(true|"(.*?)")', section)
        for key, val_type, val_str in matches:
            if val_type == "true":
                translations[key] = key
            else:
                translations[key] = val_str
    return translations

def clean_text(text, mappings):
    if not text: return ""
    text = re.sub(r'\|c[0-9a-fA-F]{8}', '', text)
    text = re.sub(r'\|r', '', text)
    text = re.sub(r'=q\d+=', '', text)
    text = re.sub(r'=ds=', '', text)
    for k, v in mappings.items():
        text = text.replace(k, v)
    return text.strip(", ")

def extract_tags(text, class_mappings, type_mappings, profession_mappings):
    classes = []
    for k, v in class_mappings.items():
        if k in text:
            classes.append(v)
    
    types = []
    for k, v in type_mappings.items():
        if k in text:
            types.append(v)
            
    professions = []
    for k, v in profession_mappings.items():
        if k in text:
            professions.append(v)
            
    return classes, types, professions

def get_quality(text):
    match = re.search(r'=q(\d+)=', text)
    if match:
        qualities = {
            "0": "Poor", "1": "Common", "2": "Uncommon", "3": "Rare",
            "4": "Epic", "5": "Legendary", "6": "Artifact"
        }
        return qualities.get(match.group(1), "Unknown")
    return "Unknown"

def main():
    # Use relative paths from project root
    root = "reference/AtlasLoot/AtlasLoot"
    boss_names = get_babble_translations(os.path.join(root, "Libs/Babble-Boss-2.2/Babble-Boss-2.2.lua"))
    zone_names = get_babble_translations(os.path.join(root, "Libs/Babble-Zone-2.2/Babble-Zone-2.2.lua"))
    atlas_names = get_babble_translations(os.path.join(root, "Locale/locale.en.lua"))
    
    # Merge atlas names into zone names for resolution
    zone_names.update(atlas_names)
    
    # Manual overrides for SM wings and others
    manual_zone_overrides = {
        "SMArmory": "SM Armory",
        "SMCathedral": "SM Cathedral",
        "SMGraveyard": "SM Graveyard",
        "SMLibrary": "SM Library",
        "TheRuinsofAhnQiraj": "Ruins of Ahn'Qiraj",
        "TheTempleofAhnQiraj": "Temple of Ahn'Qiraj"
    }
    zone_names.update(manual_zone_overrides)
    
    with open(os.path.join(root, "Core/TextParsing.lua"), 'r') as f:
        content = f.read()
        mappings, class_mappings, type_mappings, slot_mappings, profession_mappings = extract_mappings(content)
        
    with open(os.path.join(root, "Instances/instances.en.lua"), 'r') as f:
        instances_content = f.read()

    boss_buttons = {}
    current_instance = None
    in_table = False
    for line in instances_content.splitlines():
        if "AtlasLootBossButtons = {" in line:
            in_table = True
            continue
        if in_table:
            if line.strip() == "};":
                if not current_instance:
                    in_table = False
                current_instance = None
                continue
            inst_match = re.match(r'^\s*(\w+) = \{', line)
            if inst_match:
                current_instance = inst_match.group(1)
                boss_buttons[current_instance] = []
            elif current_instance and '"' in line:
                match = re.search(r'"(.*?)"', line)
                if match:
                    boss_key = match.group(1)
                    if boss_key: boss_buttons[current_instance].append(boss_key)

    loot_data = {}
    current_boss = None
    in_loot_table = False
    for line in instances_content.splitlines():
        boss_match = re.match(r'^\t?(\[?"?\w+"?\]?) = \{', line)
        if boss_match:
            current_boss = boss_match.group(1).strip('[]" ')
            if current_boss not in loot_data: loot_data[current_boss] = []
            in_loot_table = True
            continue
        if in_loot_table:
            if line.strip() == "};":
                in_loot_table = False
                current_boss = None
                continue
            if current_boss and '{' in line and '}' in line:
                content_match = re.search(r'\{(.*)\}', line)
                if not content_match: continue
                content = content_match.group(1)
                parts = []
                part = ""; in_quotes = False
                for char in content:
                    if char == '"': in_quotes = not in_quotes
                    elif char == ',' and not in_quotes:
                        parts.append(part.strip())
                        part = ""
                    else: part += char
                parts.append(part.strip())
                if len(parts) >= 3:
                    try:
                        item_id_str = parts[0].replace('{', '').strip()
                        if not item_id_str: continue
                        item_id = int(item_id_str)
                        if item_id == 0: continue
                        icon = parts[1].strip('"')
                        name_raw = parts[2].strip('"')
                        desc_raw = parts[3].strip('"') if len(parts) > 3 else ""
                        drop_rate = parts[4].strip('"') if len(parts) > 4 else ""
                        
                        classes, types, professions = extract_tags(desc_raw, class_mappings, type_mappings, profession_mappings)
                        
                        loot_data[current_boss].append({
                            "id": item_id,
                            "name": clean_text(name_raw, mappings),
                            "icon": icon,
                            "quality": get_quality(name_raw),
                            "description": clean_text(desc_raw, mappings),
                            "drop_rate": drop_rate,
                            "classes": classes,
                            "types": types,
                            "professions": professions
                        })
                    except ValueError: continue

    with open(os.path.join(root, "TableRegister/loottables.en.lua"), 'r') as f:
        loottables_content = f.read()
    
    boss_display_names = {}
    # Match various patterns in loottables.en.lua
    # Pattern 1: ["Key"] = { BB["Boss Name"], "AtlasLootItems" }
    # Pattern 2: ["Key"] = { "Boss Name", "AtlasLootItems" }
    # Pattern 3: ["Key"] = { AL["Prefix"].."Boss Name", "AtlasLootItems" }
    
    # We'll use a more comprehensive regex or multiple passes
    # First, let's find all entries in AtlasLoot_TableNames and AtlasLoot_Data
    # but the loottables.en.lua is most important for display names.
    
    # Simple strategy: find all ["key"] = { ... } blocks and extract the first element of the table
    entry_pattern = r'\["(.*?)"\]\s*=\s*\{(.*?)\}'
    for key, table_content in re.findall(entry_pattern, loottables_content, re.DOTALL):
        # Extract the first element
        first_el_match = re.search(r'^\s*(.*?)\s*,', table_content.strip())
        if first_el_match:
            first_el = first_el_match.group(1).strip()
            # Resolve the element
            # Remove BB["..."], AL["..."], etc.
            first_el = re.sub(r'(?:BB|AL|BZ|BC|BIS|BF)\["(.*?)"\]', r'\1', first_el)
            # Remove quotes
            first_el = first_el.strip('" ')
            # Handle concatenations ..
            first_el = first_el.replace('"', '').replace('..', ' ')
            
            # Resolve the resolved value against our babble dicts if possible
            resolved = boss_names.get(first_el, zone_names.get(first_el, first_el))
            boss_display_names[key] = resolved

    final_data = {}
    normalized_zones = {k.replace(" ", "").replace("(", "").replace(")", "").replace("'", ""): k for k in zone_names.keys()}
    
    for inst_key, boss_keys in boss_buttons.items():
        inst_name = zone_names.get(inst_key)
        if not inst_name:
            inst_name = normalized_zones.get(inst_key.replace("Ent", "").replace("Upper", "").replace("Lower", ""), inst_key)
            if inst_key.endswith("Ent"): inst_name += " (Entrance)"
            elif inst_key.endswith("Upper"): inst_name += " (Upper)"
            elif inst_key.endswith("Lower"): inst_name += " (Lower)"
        
        # Build boss data first
        boss_data = {}
        for b_key in boss_keys:
            if b_key in loot_data and len(loot_data[b_key]) > 0:
                b_name = boss_display_names.get(b_key, boss_names.get(b_key, b_key))
                boss_data[b_name] = loot_data[b_key]
        
        # Only add dungeon if it has bosses with loot
        if boss_data:
            final_data[inst_name] = boss_data

    output_path = "dungeon-gear/dungeon_gear.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(final_data, f, indent=2)

if __name__ == "__main__":
    main()
