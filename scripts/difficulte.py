import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # repo root, whatever the current directory

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
    "Andorre", "Bahamas", "Belize", "Bhoutan", "Cap-Vert", "Comores",
    "Fidji", "Gambie", "Guinée-Bissau", "Guyana", "Lesotho", "Liechtenstein", "Maldives", "Malte", "Monaco", "Papouasie-Nouvelle-Guinée","Saint-Marin", 
    "Sao Tomé-et-Principe", "Seychelles", "Slovaquie",
    "Somalie", "Soudan du Sud", "Suriname", "Vatican"
]

impossible_countries = ["Aruba",
"Anguilla",
"Aland",
"Samoa américaines",
"Îles Ashmore et Cartier",
"Terres australes et antarctiques françaises",
"Bajo Nuevo Bank (îles Petrel)",
"Antigua-et-Barbuda",
"Saint-Barthélemy",
"Île Clipperton",
"Îles Cook",
"Îles de la mer de Corail","Curaçao",
"Îles Caïmans","Dominique",
"Barbade",
"Zone de souveraineté de Dhekelia",
"Brunei",
"Îles Malouines",
"États fédérés de Micronésie",
"Guernesey","Grenade",
"Guam",
"Îles Heard et MacDonald",
"Île de Man",
"Territoires de l'océan Indien","Territoire britannique de l'océan Indien",
"Jersey",
"Kiribati",
"Saint-Christophe-et-Niévès",
"Sainte-Lucie",
"Macao R.A.S.","Saint-Martin",
"Îles Marshall",
"Îles Mariannes du Nord",
"Montserrat",
"Île Norfolk",
"Niue",
"Nauru",
"Îles Pitcairn",
"Îles Spratly","Palaos","Récif Scarborough","Banc Serranilla","Géorgie du Sud et les îles Sandwich du Sud",
"Sainte-Hélène","Îles Salomon","Saint-Pierre-et-Miquelon","Saint-Martin","Îles Turques-et-Caïques","Timor oriental","Tonga","Tuvalu",
"Îles mineures éloignées des États-Unis","Base navale américaine de la baie de Guantánamo","Saint-Vincent-et-les Grenadines","Îles Vierges britanniques","Îles Vierges américaines","Vanuatu","Wallis-et-Futuna",
"Zone de souveraineté d'Akrotiri","Samoa"]

# Charger le fichier GeoJSON initial
with open(ROOT / 'src/data/countries_FR.json', 'r', encoding='utf-8') as file:
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
    elif country in impossible_countries:
        feature['properties']['Difficulty'] = 'Impossible'
    else:
        feature['properties']['Difficulty'] = 'Difficile'

# Écrire le fichier GeoJSON mis à jour
with open(ROOT / 'src/data/countriesWithDifficulty_FR.json', 'w', encoding='utf-8') as file:
    json.dump(new_geojson_data, file, separators=(',', ':'), indent=2, ensure_ascii=False)

print("Nouveau fichier GeoJSON créé avec succès !")
