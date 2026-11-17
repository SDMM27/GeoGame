// Web: CanvasKit must be loaded before any Skia module is evaluated.
// First of all: Symbol.dispose, which Skia's objects need to free their memory and Safari lacks
import './src/symbolDispose.web'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'

LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' }).then(() => {
  // Frees the WebGL surfaces and GPU contexts Skia's web views replace (see src/skiaWebSurfaces.ts)
  require('./src/skiaWebSurfaces').releaseReplacedSurfaces(global.CanvasKit)
  // Installs Skia's web view API, then frees the pictures it replaces and the paints of each frame
  // (see src/skiaWebPictures.ts and src/skiaWebPaints.ts)
  const { Skia } = require('@shopify/react-native-skia')
  require('./src/skiaWebPictures').releaseReplacedPictures()
  require('./src/skiaWebPaints').releaseFramePaints(Skia)
  require('expo-router/entry')
})
