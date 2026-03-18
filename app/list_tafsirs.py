import json

with open('tafsirs.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    for t in data['tafsirs']:
        if t['language_name'] == 'arabic':
            print(f"ID: {t['id']}, Name: {t['name']}, Slug: {t['slug']}")
