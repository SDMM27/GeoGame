// Fixture du jeu de test + les deux Saint-Martin, dans le même ordre que le vrai
// dataset (MF avant SX) : l'alias « Saint-Martin » de Sint Maarten (SX) ne doit pas
// écraser le nom canonique de Saint-Martin (MF).
import { FIXTURE_COUNTRIES, country } from './countriesFixture'

const SAINT_MARTIN = country({
  admin: 'Saint-Martin',
  isoA2: 'MF',
  isoA3: 'MAF',
  center: [-63.077, 18.074],
  difficulty: 'Impossible',
  capital: 'Marigot',
  population: 31496,
  aliases: [],
})

const SINT_MAARTEN = country({
  admin: 'Sint Maarten',
  isoA2: 'SX',
  isoA3: 'SXM',
  center: [-63.066, 18.034],
  difficulty: 'Impossible',
  capital: 'Philipsburg',
  population: 41349,
  aliases: ['Saint-Martin (partie néerlandaise)', 'Saint-Martin néerlandais', 'Saint-Martin'],
})

export const SAINT_MARTIN_COUNTRIES = [...FIXTURE_COUNTRIES, SAINT_MARTIN, SINT_MAARTEN]

export const saintMartinByName = (admin) => SAINT_MARTIN_COUNTRIES.find((c) => c.properties.ADMIN === admin)

export default { type: 'FeatureCollection', features: SAINT_MARTIN_COUNTRIES }
