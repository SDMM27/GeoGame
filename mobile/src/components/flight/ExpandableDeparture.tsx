// « Tableau des départs » accordion: a departure row that unfolds in place into its boarding pass.
// ExpandableDeparture props:
//   game, code, name, status, statusTone, statusColor   as DepartureRow (code also appears in the pass stub)
//   expanded / onToggle   controlled by the parent (see useAccordion: one open row at a time)
//   gate, codeLabel, gateLabel, codeColor   the pass stub (CODE / PORTE)
//   children   main part of the pass; each direct child is revealed in turn (fade + rise)
//   accessibilityLabel   label of the row button (default « name, status »)
//   last       hides the bottom divider
// Everything animates on the UI thread from a single progress value (0 closed, 1 open): the height follows
// the measured content (no hard-coded height), so the rows below slide with it.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { Children, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import GameEmblem from '@/components/GameEmblem'
import { fonts, makeStyles, useColors } from '@/theme'

import { Barcode } from './BoardingPass'
import type { DepartureTone } from './DeparturesBoard'


/** Single-open accordion state: toggling the open id closes it, toggling another one switches. */
export function useAccordion<T = string>(initial: T | null = null) {
  const [openId, setOpenId] = useState<T | null>(initial)
  const toggle = useCallback((id: T) => setOpenId((current) => (current === id ? null : id)), [])
  return [openId, toggle] as const
}

type Props = {
  game: string
  code: string
  name: string
  status: string
  statusTone?: DepartureTone
  statusColor?: string
  expanded: boolean
  onToggle: () => void
  gate: string
  codeLabel?: string
  gateLabel?: string
  codeColor?: string
  accessibilityLabel?: string
  last?: boolean
  children: ReactNode
}

function Reveal({ progress, index, reduce, children }: { progress: SharedValue<number>; index: number; reduce: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const start = 0.15 + index * 0.12
    const o = interpolate(progress.value, [start, start + 0.4], [0, 1], Extrapolation.CLAMP)
    return { opacity: o, transform: reduce ? [] : [{ translateY: (1 - o) * 10 }] }
  })
  return <Animated.View style={style}>{children}</Animated.View>
}

export function ExpandableDeparture({
  game,
  code,
  name,
  status,
  statusTone = 'ontime',
  statusColor,
  expanded,
  onToggle,
  gate,
  codeLabel = 'CODE',
  gateLabel = 'PORTE',
  codeColor,
  accessibilityLabel,
  last,
  children,
}: Props) {
  const colors = useColors()
  const styles = useStyles()
  const toneColors: Record<DepartureTone, string> = { done: colors.textMuted, boarding: colors.accent, ontime: colors.text }
  const reduce = useReducedMotion()
  const progress = useSharedValue(expanded ? 1 : 0)
  const measured = useSharedValue(0)

  useEffect(() => {
    if (reduce) progress.value = withTiming(expanded ? 1 : 0, { duration: 150 })
    else progress.value = expanded ? withSpring(1, { damping: 18, stiffness: 170, mass: 0.9 }) : withTiming(0, { duration: 200 })
  }, [expanded, reduce, progress])

  const press = () => {
    if (!expanded) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      } catch {
        // no haptics here
      }
    }
    onToggle()
  }

  const bodyStyle = useAnimatedStyle(() => ({ height: measured.value * Math.max(progress.value, 0) }))
  const tintStyle = useAnimatedStyle(() => ({ opacity: Math.min(Math.max(progress.value, 0), 1) }))
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 180}deg` }] }))
  const codeStyle = useAnimatedStyle(() => ({ transform: reduce ? [] : [{ scale: 1 + 0.25 * Math.min(progress.value, 1.2) }] }))
  const stubCodeStyle = useAnimatedStyle(() => {
    const o = interpolate(progress.value, [0.1, 0.6], [0, 1], Extrapolation.CLAMP)
    return { opacity: o, transform: reduce ? [] : [{ scale: 0.6 + 0.4 * o }, { translateY: (1 - o) * -14 }] }
  })
  const perforationStyle = useAnimatedStyle(() => ({ height: `${interpolate(progress.value, [0.1, 0.8], [0, 100], Extrapolation.CLAMP)}%` }))

  return (
    <View style={!last && styles.divider}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={accessibilityLabel ?? `${name}, ${status}`}
        onPress={press}
        style={styles.row}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint, tintStyle]} />
        <GameEmblem game={game} size={30} />
        <Animated.Text style={[styles.code, codeStyle]}>{code}</Animated.Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.status, { color: statusColor ?? toneColors[statusTone] }]}>{status}</Text>
        <Animated.View style={chevronStyle}>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[styles.body, bodyStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}>
        <View style={styles.measure} onLayout={(event) => (measured.value = event.nativeEvent.layout.height)}>
          <View style={styles.pass}>
            <View style={styles.main}>
              {Children.toArray(children).map((child, index) => (
                <Reveal key={index} progress={progress} index={index} reduce={reduce}>
                  {child}
                </Reveal>
              ))}
            </View>
            <View style={styles.stub} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Animated.View style={[styles.perforation, perforationStyle]} />
              <Animated.View style={[{ gap: 2 }, stubCodeStyle]}>
                <Text style={styles.label}>{codeLabel}</Text>
                <Text style={[styles.value, { color: codeColor ?? colors.gold }]}>{code}</Text>
              </Animated.View>
              <View style={{ gap: 2 }}>
                <Text style={styles.label}>{gateLabel}</Text>
                <Text style={[styles.value, { color: colors.accent }]}>{gate}</Text>
              </View>
              <Barcode />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  divider: { borderBottomWidth: 1, borderBottomColor: colors.boardLine },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12 },
  tint: { backgroundColor: colors.boardLine },
  code: { width: 34, fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold, transformOrigin: 'left center' },
  name: { flex: 1, minWidth: 0, fontFamily: fonts.monoBold, fontSize: 12, color: colors.text },
  status: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8 },
  body: { overflow: 'hidden' },
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
  pass: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.boardLine },
  main: { flex: 1, minWidth: 0, padding: 16, gap: 10 },
  stub: { width: 84, paddingVertical: 16, paddingHorizontal: 12, justifyContent: 'space-between' },
  perforation: { position: 'absolute', left: 0, top: 0, width: 2, borderLeftWidth: 2, borderLeftColor: colors.stub, borderStyle: 'dashed' },
  label: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 12, letterSpacing: 1.08, color: colors.textMuted },
  value: { fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 26 },
}))
