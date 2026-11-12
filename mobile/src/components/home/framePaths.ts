import { Skia, type SkPath, type SkPathBuilder } from '@shopify/react-native-skia'
import { Platform } from 'react-native'
import { isRNRuntime } from 'react-native-worklets'

const KEPT = 3
const NATIVE = Platform.OS !== 'web'

export type PathRing = { builder: SkPathBuilder; paths: (SkPath | null)[]; next: number }

/** Store in a shared value: only the UI runtime may mutate this state. */
export function createPathRing(): PathRing {
  return { builder: Skia.PathBuilder.Make(), paths: Array.from({ length: KEPT }, () => null), next: 0 }
}

/** Reuse the builder, never a path that the renderer may still be drawing. */
export function framePath(ring: PathRing): SkPathBuilder {
  'worklet'
  ring.builder.reset()
  return ring.builder
}

/** Bound native allocations as well as CanvasKit allocations between GC runs.
 * Keep the current and previous snapshots alive. Native draw commands retain
 * their own SkPath copies, so releasing an older wrapper does not alter them.
 */
export function finishFramePath(ring: PathRing): SkPath {
  'worklet'
  const path = ring.builder.build()
  // useDerivedValue also runs its initializer on RN during render. That copy
  // was frozen when the ring was sent to UI; only the UI copy owns the mutable
  // retention queue. The initial RN snapshot is released by its normal owner.
  if (NATIVE && isRNRuntime()) return path
  ring.paths[ring.next]?.dispose()
  ring.paths[ring.next] = path
  ring.next = (ring.next + 1) % KEPT
  return path
}
