import countries from '../data/countriesWithDifficulty_FR.json'
import { getAllCountryNames, getAllCapitalNames } from './getCountryName'
import { matchAnswer } from './normalizeAnswer'

let knownAnswers = null

// Tous les noms de pays et de capitales (FR/EN/RU + alias), construits une seule fois à la demande
export function getKnownAnswers() {
  if (knownAnswers) return knownAnswers
  const names = new Set()
  for (const { properties: p } of countries.features) {
    if (!p.ADMIN) continue
    for (const name of getAllCountryNames(p.ISO_A2, p.ADMIN, p.aliases ?? [])) names.add(name)
    if (p.capital) {
      for (const name of getAllCapitalNames(p.ISO_A2, p.capital, p.capitalAliases ?? [])) names.add(name)
    }
  }
  knownAnswers = [...names]
  return knownAnswers
}

// matchAnswer avec la règle anti-confusion appliquée sur l'ensemble des pays et capitales
export function matchKnownAnswer(input, accepted, options) {
  return matchAnswer(input, accepted, getKnownAnswers(), options)
}
