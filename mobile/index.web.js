// Web (dev preview only): CanvasKit must be loaded before any Skia module is evaluated.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'

LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' }).then(() => {
  require('expo-router/entry')
})
