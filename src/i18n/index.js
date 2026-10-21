import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from './languages'

// French and English ship with the page (most players, and the fallback); the other languages are loaded the first time
// they are used. Explicit imports rather than a template: Metro (the app) only follows static paths.
const LAZY_LOCALES = {
  es: () => import('./locales/es.json'),
  pt: () => import('./locales/pt.json'),
  de: () => import('./locales/de.json'),
  it: () => import('./locales/it.json'),
  ru: () => import('./locales/ru.json'),
  uk: () => import('./locales/uk.json'),
}

const lazyBackend = {
  type: 'backend',
  init() {},
  read(lng, _ns, callback) {
    const load = LAZY_LOCALES[lng]
    if (!load) return callback(null, {})
    load().then((module) => callback(null, module.default ?? module), (error) => callback(error, null))
  },
}

// Resolves once the player's language is loaded: the website renders after it (src/main.jsx).
export const i18nReady = i18n
  .use(lazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    partialBundledLanguages: true,
    supportedLngs: LANGUAGE_CODES,
    // 'es-MX' → 'es': i18n.language is always one of LANGUAGE_CODES
    load: 'languageOnly',
    fallbackLng: DEFAULT_LANGUAGE,
    detection: {
      // The language picked in the menu, else the browser's
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'geogame-lang',
      caches: ['localStorage'],
      convertDetectedLanguage: (lng) => lng.slice(0, 2).toLowerCase(),
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
