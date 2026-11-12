// « Tableau des départs » accordion: a departure row that unfolds in place into its boarding pass.
// ExpandableDeparture props:
//   game, code, name, status, statusTone, statusColor   as DepartureRow (code also appears in the pass stub)
//   expanded / onToggle   controlled by the parent (see useAccordion: one open row at a time)
//   gate, codeLabel, gateLabel, codeColor   the pass stub (CODE / PORTE)
//   children   main part of the pass; each direct child is revealed in turn (fade + rise)
//   accessibilityLabel   label of the row button (default « name, status »)
//   last       hides the bottom divider
// The pass uses the same flap motion as the globe's next-flight board. Android
// animates final bounds with Fabric LayoutAnimation; iOS uses a shared height.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { Children, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from 'react'
import { Animated as NativeAnimated, Easing as NativeEasing, LayoutAnimation, Platform, Pressable, StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native'
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
import { useFlapStyle } from './useFlapStyle'

const ANDROID = Platform.OS === 'android'
// Each platform supplies only its own driver's style handles to these hosts.
type MotionViewProps = Omit<ViewProps, 'style'> & { style?: ComponentProps<typeof NativeAnimated.View>['style'] | ComponentProps<typeof Animated.View>['style'] }
type MotionTextProps = Omit<TextProps, 'style'> & { style?: ComponentProps<typeof NativeAnimated.Text>['style'] | ComponentProps<typeof Animated.Text>['style'] }
const MotionView = (ANDROID ? NativeAnimated.View : Animated.View) as ComponentType<MotionViewProps>
const MotionText = (ANDROID ? NativeAnimated.Text : Animated.Text) as ComponentType<MotionTextProps>

/** Single-open accordion state: toggling the open id closes it, toggling another one switches. */
export function useAccordion<T = string>(initial: T | null = null) {
  const [openId, setOpenId] = useState<T | null>(initial)
  const reduced = useReducedMotion()
  const toggle = useCallback((id: T) => {
    // Fabric animates the final native bounds and positions of the whole board.
    // Yoga lays out once rather than recalculating the page at every spring frame.
    if (ANDROID && !reduced) LayoutAnimation.configureNext({ duration: 320, update: { type: LayoutAnimation.Types.easeInEaseOut } })
    setOpenId((current) => (current === id ? null : id))
  }, [reduced])
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

function Reveal({ progress, nativeProgress, index, reduce, children }: { progress: SharedValue<number>; nativeProgress: NativeAnimated.Value; index: number; reduce: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const start = 0.15 + index * 0.12
    const o = interpolate(progress.value, [start, start + 0.4], [0, 1], Extrapolation.CLAMP)
    return { opacity: o, transform: reduce ? [] : [{ translateY: (1 - o) * 10 }] }
  })
  const nativeStyle = useMemo(() => {
    const start = 0.15 + index * 0.12
    return {
      opacity: nativeProgress.interpolate({ inputRange: [start, start + 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: reduce ? [] : [{ translateY: nativeProgress.interpolate({ inputRange: [start, start + 0.4], outputRange: [10, 0], extrapolate: 'clamp' }) }],
    }
  }, [nativeProgress, index, reduce])
  return <MotionView style={ANDROID ? nativeStyle : style}>{children}</MotionView>
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
  const flapStyle = useFlapStyle(!ANDROID && expanded, reduce)
  const progress = useSharedValue(expanded ? 1 : 0)
  const measured = useSharedValue(0)
  const [nativeProgress] = useState(() => new NativeAnimated.Value(expanded ? 1 : 0))
  const [nativeFlap] = useState(() => new NativeAnimated.Value(0))
  const initialized = useRef(false)

  useEffect(() => {
    if (ANDROID) {
      // All passes arrive closed. Don't create and run a native animation graph
      // for every hidden pass during the first screen's startup.
      if (!initialized.current) {
        initialized.current = true
        if (!expanded) return
      }
      // Animated's native driver updates Android view transforms directly. It
      // avoids a Fabric shadow-tree commit for each of the reveal/flip props.
      const animation = NativeAnimated.parallel([
        reduce
          ? NativeAnimated.timing(nativeProgress, { toValue: expanded ? 1 : 0, duration: 150, useNativeDriver: true })
          : expanded
            ? NativeAnimated.spring(nativeProgress, { toValue: 1, damping: 18, stiffness: 170, mass: 0.9, useNativeDriver: true })
            : NativeAnimated.timing(nativeProgress, { toValue: 0, duration: 200, useNativeDriver: true }),
        NativeAnimated.timing(nativeFlap, { toValue: expanded ? 1 : 0, duration: reduce ? 0 : expanded ? 620 : 200, easing: NativeEasing.linear, useNativeDriver: true }),
      ])
      animation.start()
      return () => animation.stop()
    }
    if (reduce) progress.value = withTiming(expanded ? 1 : 0, { duration: 150 })
    else progress.value = expanded ? withSpring(1, { damping: 18, stiffness: 170, mass: 0.9 }) : withTiming(0, { duration: 200 })
  }, [expanded, reduce, progress, nativeProgress, nativeFlap])

  const nativeStyles = useMemo(() => {
    const opacity = (from: number, to: number) => nativeProgress.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' })
    return {
      tint: { opacity: opacity(0, 1) },
      chevron: { transform: [{ rotate: nativeProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] },
      code: { transform: reduce ? [] : [{ scale: nativeProgress.interpolate({ inputRange: [0, 1.2], outputRange: [1, 1.3], extrapolate: 'clamp' }) }] },
      stub: {
        opacity: opacity(0.1, 0.6),
        transform: reduce ? [] : [
          { scale: nativeProgress.interpolate({ inputRange: [0.1, 0.6], outputRange: [0.6, 1], extrapolate: 'clamp' }) },
          { translateY: nativeProgress.interpolate({ inputRange: [0.1, 0.6], outputRange: [-14, 0], extrapolate: 'clamp' }) },
        ],
      },
      perforation: { transform: [{ scaleY: opacity(0.1, 0.8) }] },
      flap: {
        opacity: reduce ? 1 : nativeFlap.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transform: reduce ? [] : [
          { perspective: 700 },
          { rotateX: nativeFlap.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['-100deg', '14deg', '0deg'], extrapolate: 'clamp' }) },
        ],
      },
    }
  }, [nativeProgress, nativeFlap, reduce])

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
  const perforationStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: interpolate(progress.value, [0.1, 0.8], [0, 1], Extrapolation.CLAMP) }] }))

  return (
    <View style={!last && styles.divider}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={accessibilityLabel ?? `${name}, ${status}`}
        onPress={press}
        style={styles.row}>
        <MotionView pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint, ANDROID ? nativeStyles.tint : tintStyle]} />
        <GameEmblem game={game} size={30} />
        <MotionText style={[styles.code, { color: codeColor ?? colors.gold }, ANDROID ? nativeStyles.code : codeStyle]}>{code}</MotionText>
        <View style={styles.details}>
          <Text style={[styles.name, { color: codeColor ?? colors.gold }]}>{name}</Text>
          <Text style={[styles.status, { color: statusColor ?? toneColors[statusTone] }]}>{status}</Text>
        </View>
        <MotionView style={ANDROID ? nativeStyles.chevron : chevronStyle}>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
        </MotionView>
      </Pressable>

      <MotionView
        style={[styles.body, ANDROID ? (!expanded && styles.collapsed) : bodyStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}>
        <View style={[styles.measure, ANDROID && styles.naturalMeasure]} onLayout={(event) => (measured.value = event.nativeEvent.layout.height)}>
          <MotionView style={[styles.pass, ANDROID ? nativeStyles.flap : flapStyle]}>
            <View style={styles.main}>
              {Children.toArray(children).map((child, index) => (
                <Reveal key={index} progress={progress} nativeProgress={nativeProgress} index={index} reduce={reduce}>
                  {child}
                </Reveal>
              ))}
            </View>
            <View style={styles.stub} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <MotionView style={[styles.perforation, ANDROID ? nativeStyles.perforation : perforationStyle]} />
              <MotionView style={[{ gap: 2 }, ANDROID ? nativeStyles.stub : stubCodeStyle]}>
                <Text style={styles.label}>{codeLabel}</Text>
                <Text style={[styles.value, { color: codeColor ?? colors.gold }]}>{code}</Text>
              </MotionView>
              <View style={{ gap: 2 }}>
                <Text style={styles.label}>{gateLabel}</Text>
                <Text style={[styles.value, { color: colors.accent }]}>{gate}</Text>
              </View>
              <Barcode />
            </View>
          </MotionView>
        </View>
      </MotionView>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  divider: { borderBottomWidth: 1, borderBottomColor: colors.boardLine },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 10 },
  tint: { backgroundColor: colors.boardLine },
  code: { width: 34, flexShrink: 0, fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold, transformOrigin: 'left center' },
  details: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.text },
  status: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8 },
  body: { overflow: 'hidden' },
  collapsed: { height: 0 },
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
  naturalMeasure: { position: 'relative' },
  pass: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.boardLine, transformOrigin: 'top' },
  main: { flex: 1, minWidth: 0, padding: 16, gap: 10 },
  stub: { width: 84, paddingVertical: 16, paddingHorizontal: 12, justifyContent: 'space-between' },
  perforation: { position: 'absolute', left: 0, top: 0, width: 2, height: '100%', transformOrigin: 'top', borderLeftWidth: 2, borderLeftColor: colors.stub, borderStyle: 'dashed' },
  label: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 12, letterSpacing: 1.08, color: colors.textMuted },
  value: { fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 26 },
}))
