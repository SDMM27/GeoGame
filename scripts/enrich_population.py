import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent.parent  # repo root, whatever the current directory
INPUT = ROOT / 'src/data/countriesWithDifficulty_FR.json'

with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Appel à l'API REST Countries pour récupérer les populations via le code ISO A3
url = "https://restcountries.com/v3.1/all?fields=cca3,population"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        rest_data = json.loads(response.read().decode())
    
    # Mapping Code ISO A3 -> Population
    pop_map = {item['cca3']: item['population'] for item in rest_data}

    not_found = []
    for feature in data['features']:
        props = feature['properties']
        iso_a3 = props.get('ISO_A3', '')
        
        if iso_a3 in pop_map:
            props['population'] = pop_map[iso_a3]
        else:
            props['population'] = 0
            if iso_a3 != '-99':
                not_found.append(iso_a3)

    with open(INPUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Succès. {len(not_found)} populations non trouvées : {not_found}")

except Exception as e:
    print(f"Erreur lors de la récupération des données : {e}")