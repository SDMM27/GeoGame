// Metro config: lets the app import the website's game logic from ../src
// and swaps web-only dependencies for mobile shims.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '../src')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]
// Packages imported by shared files must come from the app's node_modules (React 19),
// never from the website's (React 18): resolve them as if imported from the app root.
const appOrigin = path.join(projectRoot, 'package.json')
const isBareImport = (name) => !name.startsWith('.') && !path.isAbsolute(name)

const shim = (name) => path.resolve(projectRoot, 'src/shims', name)

const REDIRECTS = {
  'react-router-dom': shim('react-router-dom.ts'),
  'react-toastify': shim('react-toastify.ts'),
  'i18next-browser-languagedetector': shim('language-detector.ts'),
  leaflet: shim('leaflet.ts'),
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (REDIRECTS[moduleName]) {
    return { type: 'sourceFile', filePath: REDIRECTS[moduleName] }
  }
  // Full-resolution dataset (~90 MB) -> simplified bundle built by scripts/build-countries.mjs
  if (moduleName.endsWith('countriesWithDifficulty_FR.json')) {
    return { type: 'sourceFile', filePath: path.resolve(projectRoot, 'assets/data/countries.json') }
  }
  // The site key comes from import.meta.env on the website, from EXPO_PUBLIC_* in the app
  if (moduleName === './appCheckKey' && context.originModulePath.endsWith('Firebase.js')) {
    return { type: 'sourceFile', filePath: shim('app-check-key.ts') }
  }
  if (moduleName.startsWith('@shared/')) {
    return context.resolveRequest(context, path.join(sharedRoot, moduleName.slice('@shared/'.length)), platform)
  }
  if (context.originModulePath.startsWith(sharedRoot) && isBareImport(moduleName)) {
    return context.resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
