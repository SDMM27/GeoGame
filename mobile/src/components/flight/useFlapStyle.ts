import { useEffect } from 'react'
import { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

/** The globe board's top-hinged flap, replayed whenever a departure opens. */
export function useFlapStyle(open: boolean, reduced: boolean) {
  const flap = useSharedValue(0)

  useEffect(() => {
    flap.value = withTiming(open ? 1 : 0, {
      duration: reduced ? 0 : open ? 620 : 200,
      easing: Easing.linear,
    })
  }, [open, reduced, flap])

  return useAnimatedStyle(() => ({
    opacity: reduced ? 1 : interpolate(flap.value, [0, 0.35, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: reduced
      ? []
      : [
          { perspective: 700 },
          { rotateX: `${interpolate(flap.value, [0, 0.7, 1], [-100, 14, 0], Extrapolation.CLAMP)}deg` },
        ],
  }))
}
