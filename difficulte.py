import json

# Liste des pays faciles à trouver
easy_countries = [
    "Afrique du Sud", "Allemagne", "Arabie saoudite", "Argentine", "Australie", "Autriche", "Belgique",
    "Brésil", "Canada", "Chine", "Corée du Sud", "Égypte", "Espagne", "États-Unis", "France", "Grèce",
    "Inde", "Indonésie", "Irlande", "Italie", "Japon", "Malaisie", "Maroc", "Mexique", "Pays-Bas",
    "Philippines", "Pologne", "Portugal", "Royaume-Uni", "Russie", "Suède", "Suisse", "Thaïlande", "Turquie"
]

# Liste des pays moyennement difficiles à trouver
medium_countries = [
    "Afghanistan", "Algérie", "Angola", "Arménie", "Azerbaïdjan", "Bangladesh", "Bénin", "Bolivie",
    "Botswana", "Burkina Faso", "Cambodge", "Cameroun", "Chili", "Colombie", "Congo", "Costa Rica",
    "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Équateur", "Finlande", "Ghana", "Guatemala", "Haïti",
    "Honduras", "Hongrie", "Irak", "Iran", "Israël", "Jamaïque", "Kazakhstan", "Kenya", "Liban", "Madagascar",
    "Mali", "Maurice", "Myanmar", "Nicaragua", "Niger", "Nigeria", "Norvège", "Ouganda", "Pakistan",
    "Panama", "Paraguay", "Pérou", "République dominicaine", "République tchèque", "Roumanie", "Salvador",
    "Sénégal", "Serbie", "Singapour", "Slovénie", "Sri Lanka", "Tanzanie", "Tchad", "Togo", "Tunisie",
    "Ukraine", "Uruguay", "Venezuela", "Viêt Nam", "Zambie", "Zimbabwe"
]

# Liste des pays difficiles à trouver
difficult_countries = [
    "Andorre", "Antigua-et-Barbuda", "Bahamas", "Barbade", "Belize", "Bhoutan", "Cap-Vert", "Comores",
    "Dominique", "Fidji", "Gambie", "Grenade", "Guinée-Bissau", "Guyana", "Îles Marshall", "Kiribati",
    "Lesotho", "Liechtenstein", "Maldives", "Malte", "Monaco", "Nauru", "Palaos", "Papouasie-Nouvelle-Guinée",
    "Saint-Christophe-et-Niévès", "Saint-Marin", "Sao Tomé-et-Principe", "Seychelles", "Slovaquie",
    "Somalie", "Soudan du Sud", "Suriname", "Timor oriental", "Tonga", "Tuvalu", "Vanuatu", "Vatican"
]

# Charger le fichier GeoJSON initial
with open('src/data/countries_FR.json', 'r', encoding='utf-8') as file:
    geojson_data = json.load(file)

# Créer une copie du fichier GeoJSON initial
new_geojson_data = geojson_data.copy()

# Mettre à jour les propriétés de chaque pays dans la copie du fichier GeoJSON
for feature in new_geojson_data['features']:
    country = feature['properties']['ADMIN']
    if country in easy_countries:
        feature['properties']['Difficulty'] = 'Facile'
    elif country in medium_countries:
        feature['properties']['Difficulty'] = 'Moyen'
    elif country in difficult_countries:
        feature['properties']['Difficulty'] = 'Difficile'
    else:
        feature['properties']['Difficulty'] = 'Difficile'

# Écrire le fichier GeoJSON mis à jour
with open('src/data/countriesWithDifficulty_FR.json', 'w', encoding='utf-8') as file:
    json.dump(new_geojson_data, file, separators=(',', ':'), indent=2, ensure_ascii=False)

print("Nouveau fichier GeoJSON créé avec succès !")
