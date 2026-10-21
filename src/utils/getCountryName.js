import capitalNames from '../data/capitalNames.json'
import countryAliases from '../data/countryAliases.json'
import { LANGUAGE_CODES, toLanguage } from '../i18n/languages'

const cache = {}

// Overrides for names where Intl.DisplayNames uses an unwanted form (e.g. "Congo-Kinshasa", "RAE de Hong Kong (China)")
const nameOverrides = {
  CD: {
    fr: 'République démocratique du Congo', en: 'Democratic Republic of the Congo', ru: 'Демократическая Республика Конго',
    es: 'República Democrática del Congo', pt: 'República Democrática do Congo', de: 'Demokratische Republik Kongo',
    it: 'Repubblica Democratica del Congo', uk: 'Демократична Республіка Конго',
  },
  CG: { fr: 'Congo', en: 'Congo', ru: 'Конго', es: 'Congo', pt: 'Congo', de: 'Kongo', it: 'Congo', uk: 'Конго' },
  HK: { es: 'Hong Kong', pt: 'Hong Kong', de: 'Hongkong', it: 'Hong Kong', uk: 'Гонконг' },
  MO: { es: 'Macao', pt: 'Macau', de: 'Macau', it: 'Macao', uk: 'Макао' },
  MM: { es: 'Myanmar', pt: 'Mianmar', de: 'Myanmar', it: 'Myanmar', uk: 'Мʼянма' },
  CI: { es: 'Costa de Marfil', de: 'Elfenbeinküste' },
  CV: { de: 'Kap Verde' },
  BN: { de: 'Brunei' },
  TL: { es: 'Timor Oriental', de: 'Osttimor' },
  PS: { es: 'Palestina', pt: 'Palestina', de: 'Palästina', it: 'Palestina', uk: 'Палестина' },
}

// Languages other than French, whose names are accepted as answers too (French: the dataset's ADMIN and aliases)
const OTHER_LANGUAGES = LANGUAGE_CODES.filter((lang) => lang !== 'fr')

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
  const locale = toLanguage(lang, 'fr')
  const override = nameOverrides[isoA2.toUpperCase()]?.[locale]
  if (override) return override
  try {
    const dn = displayNames(locale)
    return dn?.of(isoA2.toUpperCase()) || null
  } catch {
    return null
  }
}

// Returns all accepted names (FR admin + data aliases + every language + abbreviation aliases) for multi-language input matching
export function getAllCountryNames(isoA2, frenchName, aliases = []) {
  const names = new Set([frenchName, ...aliases])
  // Add Intl.DisplayNames for all supported languages
  for (const lang of OTHER_LANGUAGES) {
    const name = getCountryName(isoA2, lang)
    if (name) names.add(name)
  }
  // Add curated abbreviations and colloquial names (USA, UK, UAE, РФ, Голландия, EE. UU., etc.)
  const extra = isoA2 ? countryAliases[isoA2.toUpperCase()] : null
  if (extra) {
    for (const alias of extra) names.add(alias)
  }
  return [...names]
}

// null in French: the dataset's `capital` is the French name
export function getCapitalName(isoA2, lang) {
  const locale = toLanguage(lang, 'fr')
  if (!isoA2 || locale === 'fr') return null
  return capitalNames[isoA2]?.[locale] || null
}

// Returns all accepted capital names (FR + every other language) for multi-language input matching
export function getAllCapitalNames(isoA2, frenchCapital, aliases = []) {
  const names = new Set([frenchCapital, ...aliases])
  const entry = capitalNames[isoA2]
  if (entry) {
    for (const lang of OTHER_LANGUAGES) if (entry[lang]) names.add(entry[lang])
  }
  return [...names]
}
