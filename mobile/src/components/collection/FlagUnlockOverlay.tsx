// Full-screen reward when the server unlocks flags (onXpClaimed in @shared/utils/xp): the flag's pieces fly together,
// a burst in the rarity color, then the name and a shortcut to the collection. Several flags play one after another.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, Image, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { pieceGrid, piecesFor } from '@shared/utils/flagCollection'
import { FLAG_POOL } from '@shared/utils/flagCollectionData'
import { getCountryName } from '@shared/utils/getCountryName'
import { onXpClaimed } from '@shared/utils/xp'

import { useAccount } from '@/account/auth'
import { flagsAfter, haptic, rarityColor, rarityOf, type Claim, type Rarity } from '@/components/collection/claim'
import { FlagPiece } from '@/components/collection/FlagPiece'
import { onReplayFlag } from '@/components/collection/replay'
import { Button, Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { colors, fonts, radius, space } from '@/theme'

// replay: a flag of the collection tapped again, not a new one
type Item = { id: number; iso: string; count: number | null; replay?: boolean }

const W = 240
const H = 160
const BURST_COUNT: Record<Rarity, number> = { common: 12, uncommon: 16, rare: 22, legendary: 30 }
const RAY_OPACITY: Record<Rarity, number> = { common: 0, uncommon: 0.1, rare: 0.16, legendary: 0.24 }
const STAGGER = 140
const FLIGHT = 700 // time for the last piece to settle after it took off
const START = 450 // backdrop fade, then the first piece takes off
const EXIT = 220

// A square of `size` centered on the flag (plus an offset), in the stage.
const centered = (size: number, x = 0, y = 0) => ({
  position: 'absolute' as const,
  width: size,
  height: size,
  left: W / 2 - size / 2 + x,
  top: H / 2 - size / 2 + y,
})

export function FlagUnlockOverlay() {
  const { account } = useAccount()
  const uid = account?.uid
  const [queue, setQueue] = useState<Item[]>([])
  const nextId = useRef(0)

  useEffect(
    () =>
      onXpClaimed((claim: Claim) => {
        const isos = claim.unlockedFlags ?? []
        if (isos.length === 0) return
        const flags = flagsAfter(claim, uid)
        const first = nextId.current
        nextId.current += isos.length
        // The cache already holds every flag of the claim: the n-th one from the end counts n fewer
        const items = isos.map((iso, index) => ({
          id: first + index,
          iso,
          count: flags ? flags.unlocked.length - (isos.length - 1 - index) : null,
        }))
        setQueue((current) => [...current, ...items])
      }),
    [uid],
  )
  useEffect(
    () =>
      onReplayFlag((iso) => {
        nextId.current += 1
        // Only when nothing plays: a tap must not queue behind (or interrupt) a real unlock
        setQueue((current) => (current.length > 0 ? current : [{ id: nextId.current, iso, count: null, replay: true }]))
      }),
    [],
  )

  const item = queue[0]
  if (!item) return null
  return (
    <FlagReveal
      key={item.id}
      item={item}
      onNext={() => setQueue((current) => current.slice(1))}
      onView={() => {
        setQueue([])
        router.push('/(tabs)/profile')
      }}
    />
  )
}

function FlagReveal({ item, onNext, onView }: { item: Item; onNext: () => void; onView: () => void }) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const rarity = rarityOf(item.iso)
  const color = rarityColor(rarity)
  const cost = piecesFor(rarity)
  const { cols, rows } = pieceGrid(cost)
  const name = (getCountryName(item.iso, i18n.language) as string) || item.iso
  const rarityLabel = t(`collection.rarity.${rarity}`)
  const source = getFlag(item.iso)
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // Where each piece flies in from
  const [scatter] = useState(() =>
    Array.from({ length: cost }, () => ({ x: (Math.random() * 2 - 1) * 180, y: (Math.random() * 2 - 1) * 260, rotation: (Math.random() * 2 - 1) * 45 })),
  )

  // Moment the last piece has landed
  const landed = reduced ? 0 : START + (cost - 1) * STAGGER + FLIGHT
  const backdrop = useSharedValue(0)
  const exit = useSharedValue(0)
  const done = useSharedValue(reduced ? 1 : 0)
  const flagIn = useSharedValue(reduced ? 0 : 1)
  const pulse = useSharedValue(1)
  const flash = useSharedValue(0)
  const shine = useSharedValue(0)
  const ring = useSharedValue(0)
  const ring2 = useSharedValue(0)
  const burst = useSharedValue(0)
  const glow = useSharedValue(1)
  const spin = useSharedValue(0)
  const textIn = useSharedValue(0)
  const buttonsIn = useSharedValue(0)

  useEffect(() => {
    backdrop.set(withTiming(1, { duration: 250 }))
    glow.set(withRepeat(withSequence(withTiming(1.08, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1))
    const timers: ReturnType<typeof setTimeout>[] = []
    if (reduced) {
      flagIn.set(withTiming(1, { duration: 300 }))
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
    } else {
      spin.set(withRepeat(withTiming(360, { duration: 20000, easing: Easing.linear }), -1))
      for (let index = 0; index < cost; index += 1) {
        timers.push(setTimeout(() => haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), START + index * STAGGER + 300))
      }
      done.set(withDelay(landed, withTiming(1, { duration: 60 })))
      flash.set(withDelay(landed, withSequence(withTiming(0.85, { duration: 0 }), withTiming(0, { duration: 350 }))))
      pulse.set(withDelay(landed, withSequence(withTiming(1.08, { duration: 140 }), withSpring(1, { damping: 10 }))))
      shine.set(withDelay(landed + 80, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) })))
      ring.set(withDelay(landed, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) })))
      ring2.set(withDelay(landed + 200, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) })))
      burst.set(withDelay(landed, withTiming(1, { duration: 900, easing: Easing.linear })))
      timers.push(setTimeout(() => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), landed))
    }
    textIn.set(withDelay(landed + 250, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })))
    buttonsIn.set(withDelay(landed + 650, withTiming(1, { duration: 350 })))
    timers.push(setTimeout(() => setReady(true), landed + 700))
    return () => timers.forEach(clearTimeout)
  }, [backdrop, burst, buttonsIn, cost, done, flagIn, flash, glow, landed, pulse, reduced, ring, ring2, shine, spin, textIn])

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${name} – ${rarityLabel}`)
  }, [name, rarityLabel])

  const leave = (view: boolean) => {
    if (leaving) return
    setLeaving(true)
    exit.set(withTiming(1, { duration: EXIT }))
    setTimeout(view ? onView : onNext, EXIT)
  }

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }))
  const glowStyle = useAnimatedStyle(() => ({ opacity: backdrop.get(), transform: [{ scale: glow.get() }] }))
  const raysStyle = useAnimatedStyle(() => ({ opacity: backdrop.get(), transform: [{ rotate: `${spin.get()}deg` }] }))
  const piecesStyle = useAnimatedStyle(() => ({ opacity: 1 - done.get() }))
  const flagStyle = useAnimatedStyle(() => ({ opacity: done.get() * flagIn.get() }))
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }))
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }))
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.get() > 0 && shine.get() < 1 ? 1 : 0,
    transform: [{ translateX: interpolate(shine.get(), [0, 1], [-90, W + 30]) }, { rotate: '20deg' }],
  }))
  const textStyle = useAnimatedStyle(() => ({ opacity: textIn.get(), transform: [{ translateY: (1 - textIn.get()) * 16 }] }))
  const buttonsStyle = useAnimatedStyle(() => ({ opacity: buttonsIn.get(), transform: [{ translateY: (1 - buttonsIn.get()) * 12 }] }))

  return (
    <Animated.View style={[styles.root, rootStyle]} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable
        accessible={false}
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (ready) leave(false)
        }}
      />
      <View pointerEvents="box-none" style={styles.content}>
        <View pointerEvents="none" style={styles.stage}>
          <Animated.View style={[centered(380), styles.glowLayer, glowStyle]}>
            {[380, 300, 230, 170].map((size, index) => (
              <View
                key={size}
                style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.05 + index * 0.025 }}
              />
            ))}
          </Animated.View>
          {!reduced && rarity !== 'common' && (
            <Animated.View style={[centered(520), raysStyle]}>
              <Rays color={color} opacity={RAY_OPACITY[rarity]} />
            </Animated.View>
          )}

          <Animated.View style={[styles.flagBox, scaleStyle]}>
            {!reduced && (
              <Animated.View style={[StyleSheet.absoluteFill, piecesStyle]}>
                {scatter.map((from, index) => (
                  <FlyingPiece key={index} iso={item.iso} index={index} cols={cols} rows={rows} from={from} delay={START + index * STAGGER} />
                ))}
              </Animated.View>
            )}
            <Animated.View style={[styles.flag, { borderColor: color }, flagStyle]}>
              {source != null && <Image source={source} resizeMode="stretch" style={styles.flagImage} accessible={false} alt="" />}
              <Animated.View style={[styles.shine, shineStyle]} />
              <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
            </Animated.View>
          </Animated.View>

          {!reduced && (
            <>
              <Ring progress={ring} color={color} />
              {rarity === 'legendary' && <Ring progress={ring2} color={color} />}
              {Array.from({ length: BURST_COUNT[rarity] }, (_, index) => (
                <Particle key={index} burst={burst} index={index} total={BURST_COUNT[rarity]} color={color} />
              ))}
              {rarity === 'legendary' &&
                TWINKLES.map(([x, y], index) => (
                  <Twinkle key={index} x={x} y={y} delay={landed + 400 + index * 260} color={index % 2 ? '#FFFFFF' : color} />
                ))}
            </>
          )}
        </View>

        <Animated.View style={[styles.texts, textStyle]} accessibilityLiveRegion="polite">
          <View style={[styles.chip, { backgroundColor: `${color}26`, borderColor: `${color}80` }]}>
            {rarity === 'legendary' && <MaterialCommunityIcons name="star" size={14} color={color} aria-hidden />}
            <Text variant="label" color={color}>
              {rarityLabel}
            </Text>
          </View>
          {!item.replay && (
            <Text variant="bodyStrong" color={colors.textMuted}>
              {t('collection.new_flag')}
            </Text>
          )}
          <Text style={styles.name}>{name}</Text>
          {item.count != null && <Text variant="caption">{t('collection.progress', { count: item.count, total: FLAG_POOL.length })}</Text>}
        </Animated.View>

        <Animated.View style={[styles.buttons, buttonsStyle]} pointerEvents={ready ? 'auto' : 'none'}>
          {!item.replay && <Button label={t('collection.view_collection')} color={color} onPress={() => leave(true)} />}
          <Touchable accessibilityRole="button" accessibilityLabel={t('collection.tap_to_continue')} onPress={() => leave(false)} style={styles.secondary}>
            <Text variant="caption">{t('collection.tap_to_continue')}</Text>
          </Touchable>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

// One piece that flies from a random spot and lands in its cell.
function FlyingPiece({
  iso,
  index,
  cols,
  rows,
  from,
  delay,
}: {
  iso: string
  index: number
  cols: number
  rows: number
  from: { x: number; y: number; rotation: number }
  delay: number
}) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.set(withDelay(delay, withSpring(1, { damping: 14, stiffness: 110 })))
  }, [delay, progress])
  const style = useAnimatedStyle(() => {
    const p = progress.get()
    return {
      opacity: interpolate(p, [0, 0.25], [0, 1], 'clamp'),
      transform: [{ translateX: from.x * (1 - p) }, { translateY: from.y * (1 - p) }, { rotate: `${from.rotation * (1 - p)}deg` }, { scale: 0.5 + 0.5 * p }],
    }
  })
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: (index % cols) * (W / cols), top: Math.floor(index / cols) * (H / rows), width: W / cols, height: H / rows },
        style,
      ]}>
      <FlagPiece iso={iso} index={index} cols={cols} rows={rows} />
    </Animated.View>
  )
}

// 12 tapered bars around the center, the tip outward.
function Rays({ color, opacity }: { color: string; opacity: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]}>
      {Array.from({ length: 12 }, (_, index) => (
        <View key={index} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${index * 30}deg` }] }]}>
          <View
            style={{
              position: 'absolute',
              left: 260 - 10,
              top: 6,
              width: 0,
              height: 0,
              borderLeftWidth: 10,
              borderRightWidth: 10,
              borderBottomWidth: 250,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
        </View>
      ))}
    </View>
  )
}

function Ring({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.05, 1], [0, 0.9, 0]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.7, 2.8]) }],
  }))
  return <Animated.View style={[centered(W), { borderRadius: W / 2, borderWidth: 3, borderColor: color }, style]} />
}

// Four-point star: two thin bars crossing.
function Sparkle({ size, color }: { size: number; color: string }) {
  const bar = { position: 'absolute' as const, backgroundColor: color, borderRadius: 1 }
  return (
    <View style={{ width: size, height: size }}>
      <View style={[bar, { left: 0, right: 0, top: size / 2 - 1, height: 2 }]} />
      <View style={[bar, { top: 0, bottom: 0, left: size / 2 - 1, width: 2 }]} />
    </View>
  )
}

// Dot or sparkle thrown out of the flag's center; angle and reach are fixed per particle.
function Particle({ burst, index, total, color }: { burst: SharedValue<number>; index: number; total: number; color: string }) {
  const [shape] = useState(() => ({
    angle: (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
    dist: 120 + Math.random() * 110,
    size: 5 + Math.random() * 5,
  }))
  const tint = index % 3 === 0 ? '#FFFFFF' : color
  const style = useAnimatedStyle(() => {
    const p = burst.get()
    const travel = 1 - (1 - p) * (1 - p) * (1 - p)
    return {
      opacity: interpolate(p, [0, 0.08, 0.7, 1], [0, 1, 0.8, 0]),
      transform: [
        { translateX: Math.cos(shape.angle) * shape.dist * travel },
        { translateY: Math.sin(shape.angle) * shape.dist * travel },
        { scale: interpolate(p, [0, 0.2, 1], [0.3, 1, 0.4]) },
      ],
    }
  })
  const box = shape.size * 2
  return (
    <Animated.View style={[centered(box), { alignItems: 'center', justifyContent: 'center' }, style]}>
      {index % 2 === 0 ? (
        <Sparkle size={box} color={tint} />
      ) : (
        <View style={{ width: shape.size, height: shape.size, borderRadius: shape.size / 2, backgroundColor: tint }} />
      )}
    </Animated.View>
  )
}

// Sparkles around the flag (offsets from its center) that keep twinkling: legendary only.
const TWINKLES = [
  [-150, -70],
  [155, -85],
  [-135, 80],
  [145, 70],
  [-20, -118],
  [30, 118],
] as const

function Twinkle({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const level = useSharedValue(0)
  useEffect(() => {
    level.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1)))
  }, [delay, level])
  const style = useAnimatedStyle(() => ({
    opacity: level.get(),
    transform: [{ scale: 0.4 + 0.8 * level.get() }, { rotate: `${level.get() * 45}deg` }],
  }))
  return (
    <Animated.View style={[centered(20, x, y), style]}>
      <Sparkle size={20} color={color} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
  backdrop: { backgroundColor: 'rgba(6,10,22,0.94)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxl * 2 },
  stage: { width: W, height: H, marginBottom: space.xxl },
  glowLayer: { alignItems: 'center', justifyContent: 'center' },
  flagBox: { width: W, height: H },
  flag: { ...StyleSheet.absoluteFill, borderRadius: radius.md, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  // Explicit size: react-native-web draws an absolute-fill Image at its natural size
  flagImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  shine: { position: 'absolute', top: -40, width: 50, height: H + 80, backgroundColor: 'rgba(255,255,255,0.4)' },
  flash: { backgroundColor: '#FFFFFF' },
  texts: { alignItems: 'center', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6, color: colors.text, textAlign: 'center' },
  buttons: { alignItems: 'stretch', gap: space.sm, marginTop: space.xl, alignSelf: 'stretch' },
  secondary: { alignSelf: 'center', paddingVertical: space.sm, paddingHorizontal: space.lg },
})
