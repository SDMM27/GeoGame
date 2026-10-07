// Mobile stand-in for i18next-browser-languagedetector, used by ../src/i18n.
// Picks the saved language, then the device language, then French.
import { getLocales } from 'expo-localization'

const SUPPORTED = ['fr', 'en', 'ru']
const STORAGE_KEY = 'geogame-lang'

const LanguageDetector = {
  type: 'languageDetector' as const,
  init() {},
  detect() {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
    const device = getLocales()[0]?.languageCode ?? 'fr'
    return SUPPORTED.includes(device) ? device : 'fr'
  },
  cacheUserLanguage(lng: string) {
    globalThis.localStorage?.setItem(STORAGE_KEY, lng)
  },
}

export default LanguageDetector
