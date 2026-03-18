import json

with open('page1_tafsir.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

verses = data.get('verses', [])
print(f"Total verses on page 1: {len(verses)}")
for v in verses[:3]:
    print(f"\nVerse {v['verse_key']}:")
    tafsirs = v.get('tafsirs', [])
    print(f"  Number of tafsirs: {len(tafsirs)}")
    for t in tafsirs:
        print(f"  resource_id={t.get('resource_id')}, text_length={len(t.get('text',''))}, text_preview={t.get('text','')[:80]}")
