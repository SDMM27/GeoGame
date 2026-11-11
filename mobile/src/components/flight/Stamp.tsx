// Tilted rubber stamp (« VISA OK », « REFOULÉ »), with an appearance animation (zoom + spring) that is skipped
// when the system asks to reduce motion.
// Props:
//   label    text of the stamp (mono capitals)
//   tone     'ok' (menthe, default) or 'bad' (rouge); color: free color (overrides tone)
//   rotate   tilt in degrees (default -6)
//   animate  false to render it already in place (default true)
//   size     font size (default 12)
//   style    container style
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useReducedMotion, ZoomIn } from 'react-native-reanimated'

import { fonts, useColors } from '@/theme'

export type StampTone = 'ok' | 'bad'

type Props = { label: string; tone?: StampTone; color?: string; rotate?: number; animate?: boolean; size?: number; style?: StyleProp<ViewStyle> }

export function Stamp({ label, tone = 'ok', color, rotate = -6, animate = true, size = 12, style }: Props) {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const ink = color ?? (tone === 'bad' ? colors.danger : colors.accent)
  return (
    <Animated.View
      entering={animate && !reduceMotion ? ZoomIn.springify().damping(12).stiffness(260) : undefined}
      accessible
      accessibilityLabel={label}
      style={[styles.stamp, { borderColor: ink, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Animated.Text style={{ fontFamily: fonts.monoBold, fontSize: size, letterSpacing: size * 0.12, color: ink }}>{label}</Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  stamp: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderWidth: 2, borderRadius: 8 },
})
