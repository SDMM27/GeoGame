// The game's languages, shared by the website, the app (../mobile) and the push API (../api).
// `locale`: BCP 47 locale for dates, numbers and sorting. `og`: Open Graph locale.
// Adding a language: an entry here, src/i18n/locales/<code>.json, the app strings (mobile/src/i18n.ts), the game data
// (capitals, geo features, curated quiz questions, country aliases) and the legal documents. src/i18n/languages.test.js
// lists everything that must be there.
export const LANGUAGES = [
  { code: 'fr', label: 'Français', locale: 'fr-FR', og: 'fr_FR' },
  { code: 'en', label: 'English', locale: 'en-US', og: 'en_US' },
  { code: 'es', label: 'Español', locale: 'es-ES', og: 'es_ES' },
  { code: 'pt', label: 'Português', locale: 'pt-BR', og: 'pt_BR' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE', og: 'de_DE' },
  { code: 'it', label: 'Italiano', locale: 'it-IT', og: 'it_IT' },
  { code: 'ru', label: 'Русский', locale: 'ru-RU', og: 'ru_RU' },
]

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)

// Shown when the device's language isn't one of ours, and for any string missing in a language.
export const DEFAULT_LANGUAGE = 'en'

/**
 * One of LANGUAGE_CODES for any language tag ('es-MX' → 'es'), `fallback` for the others.
 * The game data helpers pass 'fr', the dataset's own language, to keep their old behavior.
 */
export function toLanguage(lang, fallback = DEFAULT_LANGUAGE) {
  const code = String(lang ?? '').slice(0, 2).toLowerCase()
  return LANGUAGE_CODES.includes(code) ? code : fallback
}

/** BCP 47 locale of a language tag, for toLocaleString / Intl. */
export const localeOf = (lang, fallback = DEFAULT_LANGUAGE) =>
  LANGUAGES.find((language) => language.code === toLanguage(lang, fallback)).locale
