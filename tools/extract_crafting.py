import re
import json
import os

def extract_mappings(text_parsing_content):
    mappings = {}
    matches = re.findall(r'gsub\(text, "(#.*?#)", (?:AL|BC|BS|BF|BIS|BB)\["(.*?)"\]\)', text_parsing_content)
    for placeholder, key in matches:
        mappings[placeholder] = key
    
    class_mappings = {"#c1#": "Druid", "#c2#": "Hunter", "#c3#": "Mage", "#c4#": "Paladin", "#c5#": "Priest", "#c6#": "Rogue", "#c7#": "Shaman", "#c8#": "Warlock", "#c9#": "Warrior"}
    type_mappings = {"#a1#": "Cloth", "#a2#": "Leather", "#a3#": "Mail", "#a4#": "Plate", "#w1#": "Axe", "#w2#": "Bow", "#w3#": "Crossbow", "#w4#": "Dagger", "#w5#": "Gun", "#w6#": "Mace", "#w7#": "Polearm", "#w8#": "Shield", "#w9#": "Staff", "#w10#": "Sword", "#w11#": "Thrown", "#w12#": "Wand", "#w13#": "Fist Weapon", "#w14#": "Fishing Pole", "#s15#": "Held In Off-hand", "#s16#": "Relic", "#s13#": "Ring", "#s14#": "Trinket", "#s2#": "Neck", "#e20#": "Book"}
    profession_mappings = {"#p1#": "Alchemy", "#p2#": "Blacksmithing", "#p3#": "Cooking", "#p4#": "Enchanting", "#p5#": "Engineering", "#p6#": "First Aid", "#p7#": "Leatherworking", "#p8#": "Tailoring"}
    
    mappings.update(class_mappings)
    mappings.update(type_mappings)
    mappings.update(profession_mappings)
    
    # Missing common mappings
    mappings.update({
        "#sr#": "Skill:",
        "#lr#": "Level:"
    })
    
    return mappings, class_mappings, type_mappings, {}, profession_mappings

def get_babble_translations(file_path):
    if not os.path.exists(file_path): return {}
    with open(file_path, 'r') as f: content = f.read()
    translations = {}
    en_us_match = re.search(r'RegisterTranslations\("enUS",\s*function\(\)\s*return\s*\{(.*?)\}\s*end\)', content, re.DOTALL)
    if not en_us_match: en_us_match = re.search(r'RegisterTranslations\("enUS",.*?\n\treturn\s*\{(.*?)\n\t\}', content, re.DOTALL)
    if en_us_match:
        section = en_us_match.group(1)
        matches = re.findall(r'\["(.*?)"\]\s*=\s*(true|"(.*?)")', section)
        for key, val_type, val_str in matches:
            translations[key] = key if val_type == "true" else val_str
    return translations

def clean_text(text, mappings):
    if not text: return ""
    text = re.sub(r'\|c[0-9a-fA-F]{8}', '', text)
    text = re.sub(r'\|r', '', text)
    text = re.sub(r'=q\d+=', '', text)
    text = re.sub(r'=ds=', '', text)
    text = re.sub(r'=so\d+=', '', text)
    text = re.sub(r'=lr=', '', text)
    for k, v in mappings.items(): text = text.replace(k, v)
    text = re.sub(r'\s+', ' ', text)
    return text.strip(", ")

def get_texture_map():
    texture_map = {}
    data_dir = "data/Interface/Icons"
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename.endswith(".png"):
                name_no_ext = filename[:-4]
                texture_map[name_no_ext.lower()] = name_no_ext
    return texture_map

def extract_tags(text, class_mappings, type_mappings, profession_mappings):
    classes = []
    for k, v in class_mappings.items():
        if k in text: classes.append(v)
    types = []
    for k, v in type_mappings.items():
        if k in text: types.append(v)
    professions = []
    for k, v in profession_mappings.items():
        if k in text: professions.append(v)
    return classes, types, professions

def extract_skill_levels(text):
    levels = {}
    for i in range(1, 5):
        match = re.search(rf'=so{i}=(\d+)', text)
        if match:
            levels[str(i)] = int(match.group(1))
    return levels

def get_quality(text):
    match = re.search(r'=q(\d+)=', text)
    if match:
        qualities = {"0": "Poor", "1": "Common", "2": "Uncommon", "3": "Rare", "4": "Epic", "5": "Legendary", "6": "Artifact"}
        return qualities.get(match.group(1), "Unknown")
    return "Unknown"

def format_title(s):
    # Inserts a space before every capital letter that is not the start of the string
    # and not already preceded by a space or other separator
    return re.sub(r'(?<!^)(?<!\s)(?<!\')(?<!\()(?<!\-)(?!$)(?=[A-Z])', ' ', s)

def parse_spells(file_path):
    with open(file_path, 'r') as f: content = f.read()
    spells = {"enchants": {}, "craftspells": {}}
    
    for category in ["enchants", "craftspells"]:
        start_marker = f'["{category}"] = {{'
        start_idx = content.find(start_marker)
        if start_idx == -1: continue
        
        entries = re.findall(r'\[(\d+)\]\s*=\s*\{\s*\["name"\]\s*=(.*?)\n\t\t\},', content[start_idx:], re.DOTALL)
        for sid, details in entries:
            sid = int(sid)
            item_match = re.search(r'\["item"\]\s*=\s*(\d+)', details)
            craft_item_match = re.search(r'\["craftItem"\]\s*=\s*(\d+)', details)
            
            res_id = None
            if item_match: res_id = int(item_match.group(1))
            elif craft_item_match: res_id = int(craft_item_match.group(1))
            
            if res_id:
                spells[category][sid] = {"item": res_id}
                
    return spells

def main():
    root = "reference/AtlasLoot/AtlasLoot"
    texture_map = get_texture_map()
    boss_names = get_babble_translations(os.path.join(root, "Libs/Babble-Boss-2.2/Babble-Boss-2.2.lua"))
    zone_names = get_babble_translations(os.path.join(root, "Libs/Babble-Zone-2.2/Babble-Zone-2.2.lua"))
    atlas_names = get_babble_translations(os.path.join(root, "Locale/locale.en.lua"))
    
    with open(os.path.join(root, "Core/TextParsing.lua"), 'r') as f:
        mappings, class_mappings, type_mappings, _, profession_mappings = extract_mappings(f.read())

    spells = parse_spells(os.path.join(root, "Core/Spells.lua"))
    
    with open(os.path.join(root, "Crafting/crafting.en.lua"), 'r') as f:
        crafting_content = f.read()

    with open(os.path.join(root, "Core/Crafting.lua"), 'r') as f:
        menu_content = f.read()

    loot_data = {}
    current_table = None
    in_table = False
    for line in crafting_content.splitlines():
        match = re.search(r'^\t(\w+)\s*=\s*\{', line)
        if match:
            current_table = match.group(1)
            loot_data[current_table] = []
            in_table = True
            continue
        if in_table:
            if re.match(r'^\t\}', line):
                in_table = False
                continue
            
            if '{' in line and '}' in line:
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
                        raw_id = parts[0].strip('" ')
                        if not raw_id or raw_id == "0": continue
                        
                        if raw_id.startswith('s'):
                            sid = int(raw_id[1:])
                            item_id = spells["craftspells"].get(sid, {}).get("item")
                            if item_id:
                                res_id = item_id
                                res_type = "item"
                            else:
                                res_id = sid
                                res_type = "spell"
                        elif raw_id.startswith('e'):
                            sid = int(raw_id[1:])
                            item_id = spells["enchants"].get(sid, {}).get("item")
                            if item_id:
                                res_id = item_id
                                res_type = "item"
                            else:
                                res_id = sid
                                res_type = "spell"
                        else:
                            res_id = int(raw_id)
                            res_type = "item"
                        
                        if res_id is None: continue

                        icon = parts[1].strip('"')
                        if icon.lower() in texture_map:
                            icon = texture_map[icon.lower()]

                        name_raw = parts[2].strip('"')
                        desc_raw = parts[3].strip('"') if len(parts) > 3 else ""
                        
                        classes, types, professions = extract_tags(desc_raw, class_mappings, type_mappings, profession_mappings)
                        skill_levels = extract_skill_levels(desc_raw)
                        
                        description = clean_text(desc_raw, mappings)
                        if skill_levels:
                            import re as pyre
                            # Sort levels by length descending to avoid partial matches (though \b handles it)
                            for lvl in sorted(skill_levels.values(), key=lambda x: len(str(x)), reverse=True):
                                description = pyre.sub(rf'\b{lvl}\b', '', description)
                            description = pyre.sub(r'\s+', ' ', description).strip()

                        loot_data[current_table].append({
                            "id": res_id,
                            "type": res_type,
                            "name": clean_text(name_raw, mappings),
                            "icon": icon,
                            "quality": get_quality(name_raw),
                            "description": description,
                            "classes": classes,
                            "types": types,
                            "professions": professions,
                            "skill_levels": skill_levels
                        })
                    except ValueError: continue

    final_data = {}
    categories = {
        "Alchemy": ["AlchemyApprentice", "AlchemyJourneyman", "AlchemyExpert", "AlchemyArtisan"],
        "Blacksmithing": ["SmithingApprentice", "SmithingJourneyman", "SmithingExpert", "SmithingArtisan", "Armorsmith", "Weaponsmith", "Axesmith", "Hammersmith", "Swordsmith"],
        "Enchanting": ["EnchantingApprentice", "EnchantingJourneyman", "EnchantingExpert", "EnchantingArtisan"],
        "Engineering": ["EngineeringApprentice", "EngineeringJourneyman", "EngineeringExpert", "EngineeringArtisan", "Gnomish", "Goblin"],
        "Leatherworking": ["LeatherApprentice", "LeatherJourneyman", "LeatherExpert", "LeatherArtisan", "Dragonscale", "Elemental", "Tribal"],
        "Tailoring": ["TailoringApprentice", "TailoringJourneyman", "TailoringExpert", "TailoringArtisan"],
        "Cooking": ["CookingApprentice", "CookingJourneyman", "CookingExpert", "CookingArtisan"],
        "First Aid": ["FirstAid"],
        "Poisons": ["Poisons"],
        "Crafted Sets": ["ImperialPlate", "TheDarksoul", "BloodsoulEmbrace", "BloodvineG", "VolcanicArmor", "IronfeatherArmor", "StormshroudArmor", "DevilsaurArmor", "BloodTigerH", "PrimalBatskin", "GreenDragonM", "BlueDragonM", "BlackDragonM"],
        "Crafted Epic Weapons": ["CraftedWeapons"]
    }

    for prof, table_prefixes in categories.items():
        prof_data = {}
        for prefix in table_prefixes:
            for t_name in loot_data.keys():
                if t_name.startswith(prefix):
                    display_name = t_name.replace(prof.replace(" ", ""), "").replace("1", "").replace("2", "").replace("3", "")
                    if not display_name:
                        display_name = prof
                    else:
                        display_name = format_title(display_name)
                    
                    if display_name not in prof_data:
                        prof_data[display_name] = []
                    prof_data[display_name].extend(loot_data[t_name])
        if prof_data:
            final_data[prof] = prof_data

    os.makedirs("crafting", exist_ok=True)
    with open("crafting/data.json", "w") as f:
        json.dump(final_data, f, indent=2)

if __name__ == "__main__":
    main()
