import requests
import json

r = requests.get("https://api.quran.com/api/v4/verses/by_page/1?per_page=10")
if r.status_code == 200:
    data = r.json()
    for v in data["verses"]:
        print(f"Verse {v['id']}, Key {v['verse_key']}")
else:
    print(f"Error: {r.status_code}")
