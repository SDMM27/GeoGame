import '@testing-library/jest-dom'
import { vi } from 'vitest'

const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

// Deterministic i18n for component tests: French, no language detection
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './i18n/locales/fr.json'

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})
