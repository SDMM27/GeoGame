// Paths rebuilt on every frame (the globe's land, graticule, routes). On the web Skia runs on CanvasKit, which frees a
// path only on dispose(): a new path per frame filled its memory in about 30 s and every frame then aborted (white globe).
// There each animated path keeps its last few paths and disposes of the oldest when it makes a new one; the drawn path
// (the latest) and the one before it are never touched. Native frees paths itself, so it only makes new ones.
import { Skia, type SkPath } from '@shopify/react-native-skia'
import { Platform } from 'react-native'

const KEPT = 3

export type PathRing = { paths: (SkPath | null)[]; next: number } | null

/** One per animated path (null on native). */
export function createPathRing(): PathRing {
  return Platform.OS === 'web' ? { paths: Array.from({ length: KEPT }, () => null), next: 0 } : null
}

/** A new empty path for this frame; on the web, frees the one made KEPT frames ago. */
export function framePath(ring: PathRing): SkPath {
  'worklet'
  const path = Skia.Path.Make()
  if (!ring) return path
  ring.paths[ring.next]?.dispose()
  ring.paths[ring.next] = path
  ring.next = (ring.next + 1) % KEPT
  return path
}
