// The atlas (website AtlasPage, app atlas screen): everything the game data says about a country, for its info sheet.
// Pure: names come from getCountryName (Intl), the rest from the country properties (population, GDP, area and center
// precomputed in the dataset) and the land borders. Nothing here is made up: a missing value stays null.
import countries from '../data/countriesWithDifficulty_FR.json'
import { countryBorders } from '../data/countryBorders'
import { collectCoordinates, getCountryAreaKm2, getGeographicCenter, getRingAreaKm2 } from './countryArea'
import { getCapitalName, getCountryName } from './getCountryName'
import { normalize } from './normalizeAnswer'

// Countries and territories with an ISO code: the ones the atlas names and ranks
export const ATLAS_COUNTRIES = countries.features.filter((feature) => feature.properties.ISO_A2 && feature.properties.ADMIN)

const BY_ISO = new Map(ATLAS_COUNTRIES.map((feature) => [feature.properties.ISO_A2.toUpperCase(), feature]))
const BY_ADMIN = new Map(countries.features.map((feature) => [feature.properties.ADMIN, feature]))

// 1 for the largest value
function ranks(value) {
  const sorted = ATLAS_COUNTRIES.map((feature) => [feature.properties.ADMIN, value(feature)])
    .filter(([, v]) => v != null && v > 0)
    .sort((a, b) => b[1] - a[1])
  return { byName: new Map(sorted.map(([name], index) => [name, index + 1])), total: sorted.length }
}

let rankCache = null
const getRanks = () =>
  (rankCache ??= {
    population: ranks((feature) => feature.properties.population),
    area: ranks((feature) => getCountryAreaKm2(feature)),
    gdp: ranks((feature) => feature.properties.gdp),
  })

export function flagEmoji(iso) {
  if (!iso || iso.length !== 2) return ''
  return [...iso.toUpperCase()].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('')
}

/** The country's name in `lang` (the dataset's French name when Intl has none). */
export const countryDisplayName = (feature, lang) =>
  getCountryName(feature?.properties?.ISO_A2, lang) || feature?.properties?.ADMIN || ''

export const findAtlasCountry = (admin) => BY_ADMIN.get(admin) ?? null

/** The countries sharing a land border with `feature`, by name in `lang`: [{ admin, iso, name }] ([] for an island). */
export function getNeighbors(feature, lang) {
  const iso = feature?.properties?.ISO_A2?.toUpperCase()
  return (iso ? countryBorders[iso] ?? [] : [])
    .map((code) => BY_ISO.get(code))
    .filter(Boolean)
    .map((neighbor) => ({ admin: neighbor.properties.ADMIN, iso: neighbor.properties.ISO_A2, name: countryDisplayName(neighbor, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang))
}

/**
 * The info sheet of a country (a feature of the dataset), in `lang`:
 * { admin, name, iso, flag, continent, capital, population, populationRank, areaKm2, areaRank, density, gdp (billion $),
 *   gdpRank, gdpPerCapita ($), neighbors: [{ admin, iso, name }], difficulty: { placement, flags, capitals }, center }.
 * Ranks are { rank, total } among the countries with an ISO code, 1 for the largest.
 */
export function getCountryInfo(feature, lang) {
  if (!feature) return null
  const p = feature.properties
  const iso = p.ISO_A2 ? p.ISO_A2.toUpperCase() : null
  const { population: popRanks, area: areaRanks, gdp: gdpRanks } = getRanks()
  const rankOf = (table) => (table.byName.has(p.ADMIN) ? { rank: table.byName.get(p.ADMIN), total: table.total } : null)
  const population = p.population > 0 ? p.population : null
  const areaKm2 = getCountryAreaKm2(feature) || null
  const gdp = p.gdp > 0 ? p.gdp : null
  return {
    admin: p.ADMIN,
    name: countryDisplayName(feature, lang),
    iso,
    flag: flagEmoji(iso),
    continent: p.continent ?? null,
    capital: (iso && getCapitalName(iso, lang)) || p.capital || null,
    population,
    populationRank: rankOf(popRanks),
    areaKm2,
    areaRank: rankOf(areaRanks),
    density: population && areaKm2 ? population / areaKm2 : null,
    gdp,
    gdpRank: rankOf(gdpRanks),
    gdpPerCapita: gdp && population ? (gdp * 1e9) / population : null,
    neighbors: getNeighbors(feature, lang),
    difficulty: { placement: p.Difficulty ?? null, flags: p.DifficultyFlag ?? null, capitals: p.DifficultyCapitals ?? null },
    center: getGeographicCenter(feature),
  }
}

/** Countries whose name (in any of the app's languages, or an alias) contains `query`, best matches first. */
export function searchAtlasCountries(query, lang, limit = 8) {
  const q = normalize(query ?? '')
  if (!q) return []
  const scored = []
  for (const feature of ATLAS_COUNTRIES) {
    const p = feature.properties
    const names = [countryDisplayName(feature, lang), p.ADMIN, ...(p.aliases ?? []),
      getCountryName(p.ISO_A2, 'en'), getCountryName(p.ISO_A2, 'ru'), getCountryName(p.ISO_A2, 'uk'), getCountryName(p.ISO_A2, 'nl')].filter(Boolean).map(normalize)
    const score = names.some((name) => name.startsWith(q)) ? 0 : names.some((name) => name.includes(q)) ? 1 : -1
    if (score >= 0) scored.push([score, countryDisplayName(feature, lang), feature])
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1], lang))
    .slice(0, limit)
    .map(([, , feature]) => feature)
}

/**
 * [[south, west], [north, east]] of the country's largest piece of land, to frame it on a map (France without French
 * Guiana, the United States without Alaska). Null without a geometry.
 */
export function mainPartBounds(feature) {
  const polygons = collectCoordinates(feature?.geometry)
  if (polygons.length === 0) return null
  const largest = polygons.reduce((best, polygon) => (getRingAreaKm2(polygon[0]) > getRingAreaKm2(best[0]) ? polygon : best))
  const lngs = largest[0].map(([lng]) => lng)
  const lats = largest[0].map(([, lat]) => lat)
  return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]
}

/** 1 234 567 → "1,23 Md" / "68 M" / "540 k" style, in `lang`. */
export function formatCompactNumber(value, lang) {
  if (value == null) return '—'
  return new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: value >= 1e9 ? 2 : 1 }).format(value)
}

export const formatNumber = (value, lang, digits = 0) =>
  value == null ? '—' : new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(value)
