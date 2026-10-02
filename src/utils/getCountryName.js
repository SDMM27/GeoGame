import capitalNames from '../data/capitalNames.json'
import countryAliases from '../data/countryAliases.json'

const cache = {}

// Overrides for names where Intl.DisplayNames uses an unwanted form (e.g. "Congo-Kinshasa")
const nameOverrides = {
  CD: { fr: 'République démocratique du Congo', en: 'Democratic Republic of the Congo', ru: 'Демократическая Республика Конго' },
  CG: { fr: 'Congo', en: 'Congo', ru: 'Конго' },
}

function displayNames(locale) {
  if (!cache[locale]) {
    try {
      cache[locale] = new Intl.DisplayNames([locale], { type: 'region' })
    } catch {
      cache[locale] = null
    }
  }
  return cache[locale]
}

export function getCountryName(isoA2, lang) {
  if (!isoA2 || isoA2 === '-99' || isoA2 === '-1') return null
  const locale = lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'fr'
  const override = nameOverrides[isoA2.toUpperCase()]?.[locale]
  if (override) return override
  try {
    const dn = displayNames(locale)
    return dn?.of(isoA2.toUpperCase()) || null
  } catch {
    return null
  }
}

// Returns all accepted names (FR admin + data aliases + EN + RU + abbreviation aliases) for multi-language input matching
export function getAllCountryNames(isoA2, frenchName, aliases = []) {
  const names = new Set([frenchName, ...aliases])
  // Add Intl.DisplayNames for all supported languages
  for (const lang of ['en', 'ru']) {
    const name = getCountryName(isoA2, lang)
    if (name) names.add(name)
  }
  // Add curated abbreviations and colloquial names (USA, UK, UAE, РФ, Голландия, etc.)
  const extra = isoA2 ? countryAliases[isoA2.toUpperCase()] : null
  if (extra) {
    for (const alias of extra) names.add(alias)
  }
  return [...names]
}

export function getCapitalName(isoA2, lang) {
  if (!isoA2 || lang === 'fr') return null
  return capitalNames[isoA2]?.[lang] || null
}

// Returns all accepted capital names (FR + EN + RU) for multi-language input matching
export function getAllCapitalNames(isoA2, frenchCapital, aliases = []) {
  const names = new Set([frenchCapital, ...aliases])
  const entry = capitalNames[isoA2]
  if (entry) {
    if (entry.en) names.add(entry.en)
    if (entry.ru) names.add(entry.ru)
  }
  return [...names]
}
