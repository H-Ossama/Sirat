import requests
import json

r = requests.get("https://api.quran.com/api/v4/tafsirs/14/by_ayah/2:8")
if r.status_code == 200:
    data = r.json()
    print(json.dumps(data, indent=2))
else:
    print(f"Error: {r.status_code}")
