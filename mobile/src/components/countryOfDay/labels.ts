// What the Country of the Day shows for a country: its name and capital in the player's language.
import { getCapitalName, getCountryName } from '@shared/utils/getCountryName'

export type Feature = { properties: Record<string, any> }

export const countryLabel = (feature: Feature, lang: string): string =>
  getCountryName(feature.properties.ISO_A2, lang) || feature.properties.ADMIN

export const capitalLabel = (feature: Feature, lang: string): string =>
  getCapitalName(feature.properties.ISO_A2, lang) || feature.properties.capital || ''

// The answer of a step, as written once it is over
export const answerLabel = (step: string, feature: Feature, lang: string): string =>
  step === 'capital' ? capitalLabel(feature, lang) : countryLabel(feature, lang)
