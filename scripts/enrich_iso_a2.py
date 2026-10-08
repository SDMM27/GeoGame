# ONE-SHOT SCRIPT — do not re-run after aliases have been manually populated.
# Requires: pip install pycountry
import json
from pathlib import Path
import pycountry

ROOT = Path(__file__).resolve().parent.parent  # repo root, whatever the current directory
INPUT = ROOT / 'src/data/countriesWithDifficulty_FR.json'

with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

not_found = []
for feature in data['features']:
    props = feature['properties']
    iso_a3 = props.get('ISO_A3', '')
    iso_a2 = None
    if iso_a3 and iso_a3 != '-99':
        country = pycountry.countries.get(alpha_3=iso_a3)
        if country:
            iso_a2 = country.alpha_2
        else:
            not_found.append(iso_a3)
    props['ISO_A2'] = iso_a2
    if 'aliases' not in props:
        props['aliases'] = []

with open(INPUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(f"Done. {len(not_found)} codes not resolved: {not_found}")
