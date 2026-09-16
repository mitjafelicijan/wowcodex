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

    print("Scanning GameObjects...")
    cursor.execute("SELECT * FROM gameobject_template")
    go_rows = cursor.fetchall()
    
    cursor.execute("PRAGMA table_info(gameobject_template)")
    go_cols = [row[1] for row in cursor.fetchall()]
    data_indices = [i for i, name in enumerate(go_cols) if name.startswith('data')]
    
    for row in go_rows:
        entry = int(row[0])
        name = str(row[3])
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
            if content:
                results.append({
                    "source": "gameobject",
                    "name": name,
                    "entry": entry,
                    "content": content
                })

    print("Scanning Items...")
    cursor.execute("SELECT * FROM item_template")
    item_rows = cursor.fetchall()
    cursor.execute("PRAGMA table_info(item_template)")
    item_cols = [row[1] for row in cursor.fetchall()]
    
    pt_idx = -1
    for i, col in enumerate(item_cols):
        if col.lower() == 'pagetext':
            pt_idx = i
            break
    
    for row in item_rows:
        entry = int(row[0])
        name = str(row[3])
        page_id = 0
        if pt_idx != -1:
            try:
                val = int(row[pt_idx])
                if val in valid_page_ids:
                    page_id = val
            except: pass
        
        if page_id == 0:
            for idx in range(min(100, len(row)), min(120, len(row))):
                try:
                    val = int(row[idx])
                    if val in valid_page_ids:
                        page_id = val
                        break
                except: continue
        
        if page_id > 0:
            content = get_full_text(cursor, page_id, page_text_map)
            if content:
                results.append({
                    "source": "item",
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
