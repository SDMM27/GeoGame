import json

CONTINENT_MAP = {
    'AF': 'Afrique',
    'AS': 'Asie',
    'EU': 'Europe',
    'NA': 'Amériques',
    'SA': 'Amériques',
    'OC': 'Océanie',
}

# Countries pycountry-convert doesn't know or maps wrong
FALLBACK = {
    'XK': 'Europe',    # Kosovo
    'EH': 'Afrique',   # Western Sahara
    'SS': 'Afrique',   # South Sudan
    'TW': 'Asie',      # Taiwan
    'PS': 'Asie',      # Palestine
    'SJ': 'Europe',    # Svalbard
    'VA': 'Europe',    # Vatican
    'TL': 'Asie',      # Timor-Leste
    'SX': 'Amériques', # Sint Maarten
    'PN': 'Océanie',   # Pitcairn
    'AQ': None,        # Antarctica — no continent tag
    '-99': None,
    '': None,
}

# Fallback by ADMIN name for countries with null ISO_A2 (e.g. Kosovo)
FALLBACK_BY_ADMIN = {
    'Kosovo': 'Europe',
}

def get_continent(iso2):
    if iso2 in FALLBACK:
        return FALLBACK[iso2]
    try:
        import pycountry_convert as pc
        code = pc.country_alpha2_to_continent_code(iso2)
        return CONTINENT_MAP.get(code)
    except Exception:
        return None

with open('src/data/countriesWithDifficulty_FR.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

missing = []
for feature in data['features']:
    iso2 = feature['properties'].get('ISO_A2', '') or ''
    continent = get_continent(iso2)
    if continent is None:
        continent = FALLBACK_BY_ADMIN.get(feature['properties'].get('ADMIN', ''))
    feature['properties']['continent'] = continent
    if continent is None:
        missing.append(f"{feature['properties'].get('ADMIN')} ({iso2})")

with open('src/data/countriesWithDifficulty_FR.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(f"Done. {len(missing)} without continent: {missing}")
