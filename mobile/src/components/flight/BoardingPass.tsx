// Boarding pass: main content (children) and a detachable stub with a dashed left edge (CODE, PORTE, barcode).
// Props:
//   children   main content of the card (kicker, title, text, button...)
//   code       flight code in the stub (« DEF »), colored with codeColor (default gold)
//   gate       gate (« A1 »), in menthe
//   codeLabel / gateLabel  stub labels (default « CODE » / « PORTE »): pass translated strings
//   accessibilityLabel     label of the whole card (the stub is decorative and hidden from screen readers)
//   style      container style
// Barcode (exported too): the decorative bars alone. Props: width (58), height (28), color (text).
import type { ReactNode } from 'react'
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { fonts, makeStyles, useColors } from '@/theme'

const BARCODE =
  'M1 0v28M4 0v28M6 0v28M10 0v28M13 0v28M15 0v28M19 0v28M23 0v28M25 0v28M28 0v28M32 0v28M34 0v28M37 0v28M41 0v28M44 0v28M46 0v28M50 0v28M53 0v28M56 0v28'

export function Barcode({ width = 58, height = 28, color }: { width?: number; height?: number; color?: string }) {
  const colors = useColors()
  return (
    <Svg width={width} height={height} viewBox="0 0 58 28" preserveAspectRatio="none">
      <Path d={BARCODE} stroke={color ?? colors.text} strokeWidth={1.4} />
    </Svg>
  )
}

type Props = {
  children: ReactNode
  code: string
  gate: string
  codeColor?: string
  codeLabel?: string
  gateLabel?: string
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

export function BoardingPass({ children, code, gate, codeColor, codeLabel = 'CODE', gateLabel = 'PORTE', accessibilityLabel, style }: Props) {
  const colors = useColors()
  const styles = useStyles()
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
      <View style={styles.main}>{children}</View>
      <View style={styles.stub} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ gap: 2 }}>
          <Text style={styles.label}>{codeLabel}</Text>
          <Text style={[styles.value, { color: codeColor ?? colors.gold }]}>{code}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.label}>{gateLabel}</Text>
          <Text style={[styles.value, { color: colors.accent }]}>{gate}</Text>
        </View>
        <Barcode />
      </View>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  card: { flexDirection: 'row', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  main: { flex: 1, minWidth: 0, padding: 16, gap: 10 },
  stub: {
    width: 84,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    borderLeftWidth: 2,
    borderLeftColor: colors.stub,
    borderStyle: 'dashed',
  },
  label: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 12, letterSpacing: 1.08, color: colors.textMuted },
  value: { fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 26 },
}))
