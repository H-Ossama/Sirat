import requests
import json

r = requests.get("https://api.quran.com/api/v4/tafsirs/14/by_chapter/2?per_page=5")
if r.status_code == 200:
    data = r.json()
    print("Keys in tafsir object:", data["tafsirs"][0].keys() if data["tafsirs"] else "No tafsirs found")
    print(json.dumps(data["tafsirs"][0:5], indent=2))
else:
    print(f"Error: {r.status_code}")
