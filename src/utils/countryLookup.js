import { normalize } from './normalizeAnswer'
import { getCountryName } from './getCountryName'
import { LANGUAGE_CODES } from '../i18n/languages'
import countryAliases from '../data/countryAliases.json'

/**
 * Map nom normalisé -> pays, pour résoudre une saisie (toutes langues, alias, abréviations).
 *
 * Priorité : le nom canonique (ADMIN) d'un pays bat toujours l'alias d'un autre pays.
 * Exemple : « Saint-Martin » (MF) ne doit pas être écrasé par l'alias « Saint-Martin »
 * de « Sint Maarten » (SX) — sinon taper « Saint-Martin » proposerait deux fois la
 * partie néerlandaise. Les alias, noms étrangers et abréviations ne remplissent que
 * les clés encore libres.
 */
export function buildCountryLookup(countries) {
  const entries = new Map()

  // 1. Noms canoniques : prioritaires, posés en premier
  for (const country of countries) {
    const admin = country?.properties?.ADMIN
    if (admin) entries.set(normalize(admin), country)
  }

  // 2. Alias du dataset : uniquement si la clé n'est pas déjà prise
  for (const country of countries) {
    for (const alias of country?.properties?.aliases ?? []) {
      const key = normalize(alias)
      if (!entries.has(key)) entries.set(key, country)
    }
  }

  // 3. Noms EN, RU, etc. (pour taper dans ces langues)
  for (const feature of countries) {
    const iso = feature.properties.ISO_A2
    for (const lang of LANGUAGE_CODES) {
      const name = getCountryName(iso, lang)
      if (name) {
        const key = normalize(name)
        if (!entries.has(key)) entries.set(key, feature)
      }
    }
  }

  // 4. Abréviations et noms usuels (USA, UK, РФ, etc.)
  for (const feature of countries) {
    const iso = feature.properties.ISO_A2?.toUpperCase()
    if (!iso) continue
    for (const alias of countryAliases[iso] ?? []) {
      const key = normalize(alias)
      if (!entries.has(key)) entries.set(key, feature)
    }
  }

  return entries
}
