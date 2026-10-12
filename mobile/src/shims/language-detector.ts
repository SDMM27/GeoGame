// Mobile stand-in for i18next-browser-languagedetector, used by ../src/i18n.
// Picks the saved language, then the device language, then English.
import { getLocales } from 'expo-localization'

import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@shared/i18n/languages'

const STORAGE_KEY = 'geogame-lang'

const LanguageDetector = {
  type: 'languageDetector' as const,
  init() {},
  detect() {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (saved && LANGUAGE_CODES.includes(saved)) return saved
    const device = getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE
    return LANGUAGE_CODES.includes(device) ? device : DEFAULT_LANGUAGE
  },
  cacheUserLanguage(lng: string) {
    globalThis.localStorage?.setItem(STORAGE_KEY, lng)
  },
}

export default LanguageDetector
