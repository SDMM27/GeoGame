// Web: CanvasKit must be loaded before any Skia module is evaluated.
// First of all: Symbol.dispose, which Skia's objects need to free their memory and Safari lacks
import './src/symbolDispose.web'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'

LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' }).then(() => {
  // Installs Skia's web view API, then frees the pictures it replaces (see src/skiaWebPictures.ts)
  require('@shopify/react-native-skia')
  require('./src/skiaWebPictures').releaseReplacedPictures()
  require('expo-router/entry')
})
