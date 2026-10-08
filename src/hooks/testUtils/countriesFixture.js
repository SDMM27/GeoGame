// Petit jeu de pays pour les tests des hooks, à la place de countriesWithDifficulty_FR.json (89 Mo).
// Géométrie : un carré de 4° autour du centre donné.
function country({ admin, isoA2, isoA3, center: [lng, lat], difficulty, capital, population, aliases = [] }) {
  const ring = [[lng - 2, lat - 2], [lng + 2, lat - 2], [lng + 2, lat + 2], [lng - 2, lat + 2], [lng - 2, lat - 2]]
  return {
    type: 'Feature',
    properties: {
      ADMIN: admin,
      ISO_A2: isoA2,
      ISO_A3: isoA3,
      Difficulty: difficulty,
      DifficultyFlag: difficulty,
      DifficultyCapitals: difficulty,
      capital,
      population,
      aliases,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}

export const FIXTURE_COUNTRIES = [
  country({ admin: 'France', isoA2: 'FR', isoA3: 'FRA', center: [2, 46], difficulty: 'Facile', capital: 'Paris', population: 68000000 }),
  country({ admin: 'Espagne', isoA2: 'ES', isoA3: 'ESP', center: [-4, 40], difficulty: 'Facile', capital: 'Madrid', population: 48000000 }),
  country({ admin: 'Allemagne', isoA2: 'DE', isoA3: 'DEU', center: [10, 51], difficulty: 'Facile', capital: 'Berlin', population: 84000000 }),
  country({ admin: 'Italie', isoA2: 'IT', isoA3: 'ITA', center: [12, 42], difficulty: 'Facile', capital: 'Rome', population: 59000000 }),
  country({ admin: 'Japon', isoA2: 'JP', isoA3: 'JPN', center: [138, 36], difficulty: 'Moyen', capital: 'Tokyo', population: 124000000 }),
  country({ admin: 'Brésil', isoA2: 'BR', isoA3: 'BRA', center: [-52, -10], difficulty: 'Moyen', capital: 'Brasília', population: 216000000 }),
  country({ admin: 'Canada', isoA2: 'CA', isoA3: 'CAN', center: [-100, 60], difficulty: 'Difficile', capital: 'Ottawa', population: 40000000 }),
  country({ admin: 'Australie', isoA2: 'AU', isoA3: 'AUS', center: [134, -25], difficulty: 'Difficile', capital: 'Canberra', population: 27000000 }),
]

export default { type: 'FeatureCollection', features: FIXTURE_COUNTRIES }

export const byName = (admin) => FIXTURE_COUNTRIES.find((c) => c.properties.ADMIN === admin)
