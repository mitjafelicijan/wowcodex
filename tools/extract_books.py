import sqlite3
import json
import re
import gzip
import os

def get_full_text(cursor, start_page, page_text_map):
    if start_page not in page_text_map:
        return ""
    
    pages = []
    curr = start_page
    visited = set()
    
    while curr and curr != 0 and curr not in visited:
        visited.add(curr)
        page = page_text_map.get(curr)
        if not page:
            break
        
        text = page['text']
        if text:
            # Clean up WoW formatting codes
            text = text.replace('$B', '\n').replace('$b', '\n').replace('$n', '\n').replace('$N', '\n')
            text = text.replace('$G', '').replace('$g', '')
            # Remove HTML tags if present
            text = re.sub(r'<[^>]+>', '', text)
            pages.append(text.strip())
        
        curr = page['next']
        
    return "\n\n".join(pages)

def main():
    sql_gz_path = 'reference/Database/classicdb.sql.gz'
    if not os.path.exists(sql_gz_path):
        print(f"Error: {sql_gz_path} not found")
        return

    print(f"Initializing in-memory database and loading {sql_gz_path}...")
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()
    
    with gzip.open(sql_gz_path, 'rt', encoding='utf-8') as f:
        conn.executescript(f.read())
    
    print("Loading page_text...")
    cursor.execute("SELECT entry, text, next_page FROM page_text")
    page_text_map = {}
    for entry, text, next_page in cursor.fetchall():
        try:
            page_text_map[int(entry)] = {
                'text': text,
                'next': int(next_page) if next_page else 0
            }
        except: continue
    
    valid_page_ids = set(page_text_map.keys())
    results = []
    seen_content = set()

    print("Scanning GameObjects...")
    cursor.execute("SELECT * FROM gameobject_template")
    go_rows = cursor.fetchall()
    
    cursor.execute("PRAGMA table_info(gameobject_template)")
    go_cols = [row[1] for row in cursor.fetchall()]
    data_indices = [i for i, name in enumerate(go_cols) if name.startswith('data')]
    type_idx = next((i for i, name in enumerate(go_cols) if name == 'type'), -1)
    
    for row in go_rows:
        # Filter for GAMEOBJECT_TYPE_QUESTGIVER (9)
        if type_idx != -1 and int(row[type_idx]) != 9:
            continue

        entry = int(row[0])
        name = str(row[3])
        
        if not name or name.strip() == "" or name.strip() == "0":
            continue
            
        page_id = 0
        
        for idx in data_indices:
            try:
                val = int(row[idx])
                if val in valid_page_ids:
                    page_id = val
                    break
            except: continue
        
        if page_id > 0:
            content = get_full_text(cursor, page_id, page_text_map)
            if content and len(content) >= 50:
                # Deduplicate based on normalized content
                normalized_content = content.strip()
                if normalized_content not in seen_content:
                    seen_content.add(normalized_content)
                    results.append({
                        "source": "gameobject",
                        "name": name,
                        "entry": entry,
                        "content": content
                    })

    results.sort(key=lambda x: (x['name'], x['entry']))
    
    output_file = 'library/data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully extracted {len(results)} entries to {output_file}")
    conn.close()

if __name__ == "__main__":
    main()
