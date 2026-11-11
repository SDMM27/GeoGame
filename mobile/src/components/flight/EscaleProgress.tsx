// Segmented progress bar, one 4 px segment per stop (escale).
// Props:
//   states  one entry per segment: 'good' (menthe), 'bad' (rouge), 'current' (or), 'todo' (stub), or a '#RRGGBB' color
//   accessibilityLabel  (e.g. « Escale 4 sur 10 »): exposes the bar as a progressbar; otherwise it is decorative
//   labels  optional mono caption under each segment (the Country of the Day's PAYS / DRAPEAU / CAPITALE / CARTE);
//           shown only when there is one per segment, and the first is left-aligned, the last right-aligned
//   style   container style
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, fonts } from '@/theme'

export type EscaleState = 'good' | 'bad' | 'current' | 'todo' | (string & {})

const STATE_COLORS: Record<string, string> = { good: colors.accent, bad: colors.danger, current: colors.gold, todo: colors.stub }

export function EscaleProgress({
  states,
  labels,
  style,
  accessibilityLabel,
}: {
  states: EscaleState[]
  labels?: string[]
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const a11y = accessibilityLabel
    ? ({ accessible: true, accessibilityRole: 'progressbar', accessibilityLabel } as const)
    : ({ accessible: false, importantForAccessibility: 'no-hide-descendants' } as const)
  const captions = labels && labels.length === states.length ? labels : null
  return (
    <View {...a11y} style={[{ flexDirection: 'row', gap: 4 }, style]}>
      {states.map((state, index) => (
        <View key={index} style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 4, borderRadius: 4, backgroundColor: STATE_COLORS[state] ?? (state.startsWith('#') ? state : colors.stub) }} />
          {captions && (
            <Text numberOfLines={1} style={{ fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.9, color: colors.textMuted, textAlign: index === 0 ? 'left' : index === states.length - 1 ? 'right' : 'center' }}>
              {captions[index]}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}
