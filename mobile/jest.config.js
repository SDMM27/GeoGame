// Unit tests of the app's pure logic (jest-expo preset). Run with `npx jest` (or `npm run test:mobile` at the repo root).
// Not a "test" script in package.json on purpose: @expo/fingerprint hashes package.json scripts, and adding one would
// change the native runtime version the installed APK listens to for OTA updates.
const path = require('path')

const sharedRoot = path.resolve(__dirname, '../src')
const shim = (name) => path.resolve(__dirname, 'src/shims', name)

module.exports = {
  preset: 'jest-expo',
  // Same redirections as metro.config.js (aliases from tsconfig.json: @/* and @shared/*)
  moduleNameMapper: {
    '^react-router-dom$': shim('react-router-dom.ts'),
    '^react-toastify$': shim('react-toastify.ts'),
    '^i18next-browser-languagedetector$': shim('language-detector.ts'),
    '^leaflet$': shim('leaflet.ts'),
    // Full-resolution dataset (~90 MB) -> simplified bundle used by the app
    'countriesWithDifficulty_FR\.json$': path.resolve(__dirname, 'assets/data/countries.json'),
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': `${sharedRoot}/$1`,
  },
  // Bare imports from ../src resolve from the app's node_modules (React 19), like metro.config.js does
  resolver: path.resolve(__dirname, 'jest.resolver.js'),
  // ../src is outside rootDir: let jest transform it (the preset only skips node_modules)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
}
