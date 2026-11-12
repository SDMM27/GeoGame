import { usePathname } from 'expo-router'
import { useCallback } from 'react'
import { useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

/** Opt-in UI frame measurements: start Expo with EXPO_PUBLIC_FRAME_DIAGNOSTICS=1. */
export function FrameDiagnostics() {
  const pathname = usePathname()
  const stats = useSharedValue({ elapsed: 0, frames: 0, slow: 0 })
  const report = useCallback((fps: number, slow: number) => {
    console.info(`[frame-perf] ${pathname}: ${fps.toFixed(1)} FPS, ${slow} frames over 20ms`)
  }, [pathname])
  useFrameCallback((frame) => {
    'worklet'
    if (!frame.timeSincePreviousFrame) return
    const s = stats.value
    s.elapsed += frame.timeSincePreviousFrame
    s.frames++
    if (frame.timeSincePreviousFrame > 20) s.slow++
    if (s.elapsed >= 3000) {
      scheduleOnRN(report, s.frames * 1000 / s.elapsed, s.slow)
      s.elapsed = s.frames = s.slow = 0
    }
  })
  return null
}
