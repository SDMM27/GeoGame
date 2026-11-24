import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ARCHIVE_CRACK, ARCHIVE_CRACK_DURATION, ARCHIVE_DETAILS, ARCHIVE_IMPACT, ARCHIVE_MOTES, ARCHIVE_OPEN_DURATION, ARCHIVE_PACK_INTRO, ARCHIVE_SHEEN, ARCHIVE_SPARKS } from '@shared/components/collection/historicalFlagSparks'
import ArchiveSigil from '@/components/collection/ArchiveSigil'
import type { HistoricalCard } from '@/components/profile/HistoricalFlagAlbum'
import { Button, Text, Touchable } from '@/components/ui'
import { getHistoricalFlag } from '@/historicalFlags'
import { space } from '@/theme'

const GOLD = '#EFCA84'
const PAPER = '#FFF1D7'
const INK = '#211717'
const FRAME_WIDTH = 276
const SHUTTER_SIGIL = 56
const BAR_HEIGHT = 56
const SPARK_BURST_DURATION = Math.max(...ARCHIVE_SPARKS.map(({ delay, duration }) => delay + duration))

type Props = {
  flag: HistoricalCard
  replay?: boolean
  onNext: () => void
  onView?: () => void
  onSkip?: () => void
}

export function HistoricalFlagReveal({ flag, replay, onNext, onView, onSkip }: Props) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const name = flag.name[language]
  const label = t('collection.historical.title')
  const continueLabel = t(replay ? 'collection.historical.close_details' : 'collection.tap_to_continue')
  const [animated, setAnimated] = useState(false)
  const intro = reduced ? 0 : ARCHIVE_PACK_INTRO
  const [revealStage, setRevealStage] = useState(0)
  const showArtwork = !intro || revealStage >= 1
  const showIdentity = !intro || revealStage >= 2
  const ready = reduced || animated
  const canClose = replay || ready
  const source = getHistoricalFlag(flag.id)
  const { source: reference, artwork } = flag
  const opening = useSharedValue(reduced ? 1 : 0)
  const frame = useSharedValue(reduced ? 1 : 0)
  const details = useSharedValue(reduced ? 1 : 0)
  const sparkTime = useSharedValue(0)
  const tunnel = useSharedValue(0)
  const impact = useSharedValue(0)
  const sheen = useSharedValue(0)
  const bars = useSharedValue(0)
  const kenburns = useSharedValue(1)
  const pulse = useSharedValue(0)
  const dust = useSharedValue(0)

  useEffect(() => {
    if (reduced) return
    tunnel.set(withTiming(1, { duration: intro, easing: Easing.linear }))
    bars.set(withSequence(
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withDelay(intro + ARCHIVE_DETAILS, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })),
    ))
    kenburns.set(withDelay(intro + ARCHIVE_IMPACT, withTiming(1.07, { duration: 10000, easing: Easing.out(Easing.quad) })))
    pulse.set(withDelay(intro + ARCHIVE_DETAILS, withSequence(
      withTiming(0.6, { duration: 400, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 1400, easing: Easing.in(Easing.quad) }),
    )))
    dust.set(withDelay(intro + ARCHIVE_IMPACT + 300, withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.quad) }), -1, false)))
    frame.set(withDelay(intro * 0.8, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })))
    opening.set(withDelay(intro + ARCHIVE_CRACK, withSequence(
      withTiming(0.08, { duration: ARCHIVE_CRACK_DURATION, easing: Easing.out(Easing.cubic) }),
      withDelay(ARCHIVE_IMPACT - ARCHIVE_CRACK - ARCHIVE_CRACK_DURATION, withTiming(1, {
        duration: ARCHIVE_OPEN_DURATION, easing: Easing.bezier(0.22, 0.85, 0.27, 1),
      })),
    )))
    impact.set(withDelay(intro + ARCHIVE_IMPACT, withTiming(1, { duration: 620, easing: Easing.linear })))
    sparkTime.set(withDelay(intro + ARCHIVE_IMPACT, withTiming(SPARK_BURST_DURATION, { duration: SPARK_BURST_DURATION, easing: Easing.linear })))
    sheen.set(withDelay(intro + ARCHIVE_SHEEN, withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) })))
    details.set(withDelay(intro + ARCHIVE_DETAILS, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })))
    const artworkTimer = setTimeout(() => setRevealStage(1), intro + ARCHIVE_CRACK)
    const identityTimer = setTimeout(() => setRevealStage(2), intro + ARCHIVE_DETAILS)
    const readyTimer = setTimeout(() => setAnimated(true), intro + ARCHIVE_DETAILS + 240)
    return () => {
      clearTimeout(artworkTimer)
      clearTimeout(identityTimer)
      clearTimeout(readyTimer)
    }
  }, [bars, details, dust, frame, impact, intro, kenburns, opening, pulse, reduced, sheen, sparkTime, tunnel])

  useEffect(() => {
    if (showIdentity) AccessibilityInfo.announceForAccessibility(`${name} · ${label}`)
  }, [name, label, showIdentity])

  const frameStyle = useAnimatedStyle(() => ({
    opacity: frame.get(),
    transform: [
      { translateY: (1 - frame.get()) * 12 },
      { scale: 0.97 + 0.03 * frame.get() + interpolate(impact.get(), [0, 0.28, 1], [0, 0.055, 0]) },
    ],
  }))
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -FRAME_WIDTH * 0.53 * opening.get() }] }))
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: FRAME_WIDTH * 0.53 * opening.get() }] }))
  // The shutter sigil halves fade out as the shutters slide off.
  const shutterSigilStyle = useAnimatedStyle(() => ({ opacity: interpolate(opening.get(), [0, 0.45, 0.9], [1, 1, 0]) }))
  const flareStyle = useAnimatedStyle(() => ({ opacity: interpolate(impact.get(), [0, 0.18, 0.86, 1], [0, 0.42, 0, 0]) }))
  const sheenStyle = useAnimatedStyle(() => {
    const progress = sheen.get()
    return {
      opacity: interpolate(progress, [0, 0.24, 0.72, 1], [0, 0.64, 0.64, 0]),
      transform: [{ translateX: (FRAME_WIDTH + 115) * progress }, { rotate: '18deg' }],
    }
  })
  const detailsStyle = useAnimatedStyle(() => ({
    opacity: details.get(),
    transform: [{ translateY: (1 - details.get()) * 16 }],
  }))
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ scale: kenburns.get() }] }))
  const barTopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bars.get(), [0, 1], [-BAR_HEIGHT, 0]) }] }))
  const barBottomStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bars.get(), [0, 1], [BAR_HEIGHT, 0]) }] }))
  const beamStyle = useAnimatedStyle(() => ({ opacity: interpolate(impact.get(), [0, 0.3, 1], [0, 0.85, 0.5]) }))
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }))

  return (
    <View style={styles.root} accessibilityViewIsModal onAccessibilityEscape={canClose ? onNext : undefined}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={canClose ? onNext : undefined} />
      {!reduced && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pulse, pulseStyle]} />}
      {intro > 0 && <ArchiveTunnel clock={tunnel} />}
      {intro > 0 && (
        <>
          <Animated.View pointerEvents="none" style={[styles.bar, styles.barTop, barTopStyle]} />
          <Animated.View pointerEvents="none" style={[styles.bar, styles.barBottom, barBottomStyle]} />
        </>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}
      >
        <Animated.View testID="historical-flag-frame" style={[styles.frame, frameStyle]}>
          <View style={styles.window}>
            {showArtwork && source != null && <Animated.Image source={source} resizeMode="contain" style={[styles.image, imageStyle]} accessible={false} alt="" />}
            {!reduced && <Animated.View pointerEvents="none" style={[styles.beam, beamStyle]}><View style={styles.beamCore} /></Animated.View>}
            {!reduced && (
              <>
                <Animated.View style={[styles.shutter, styles.leftShutter, leftStyle]}>
                  <Animated.View pointerEvents="none" style={[styles.shutterSigil, styles.shutterSigilLeft, shutterSigilStyle]}>
                    <ArchiveSigil size={SHUTTER_SIGIL} color={GOLD} />
                  </Animated.View>
                </Animated.View>
                <Animated.View style={[styles.shutter, styles.rightShutter, rightStyle]}>
                  <Animated.View pointerEvents="none" style={[styles.shutterSigil, styles.shutterSigilRight, shutterSigilStyle]}>
                    <View style={{ marginLeft: -SHUTTER_SIGIL / 2 }}><ArchiveSigil size={SHUTTER_SIGIL} color={GOLD} /></View>
                  </Animated.View>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.flare, flareStyle]} />
                <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
                  <View style={styles.sheenCore} />
                </Animated.View>
                {[0, 1, 2].map((index) => <DustMote key={index} index={index} time={dust} />)}
              </>
            )}
          </View>
          {!reduced && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="historical-flag-sparks">
              {ARCHIVE_SPARKS.map((spark, index) => <ArchiveSpark key={index} spark={spark} time={sparkTime} />)}
            </View>
          )}
        </Animated.View>
        <Animated.View style={[styles.details, detailsStyle]}>
          <Text variant="caption" style={styles.label} color={GOLD}>{label}</Text>
          {!replay && <Text variant="caption" color={PAPER}>{t('collection.new_flag')}</Text>}
          {/* The letters are always laid out (invisible until `details` progresses), so the heading keeps its
              final height from the start and the frame never shifts; the placeholder overlays them until then. */}
          <View style={styles.nameWrap}>
            <Text accessibilityRole="header" accessibilityLabel={showIdentity ? name : t('collection.historical.current')} style={styles.name} color={PAPER}>
              {Array.from(name).map((letter, index) => <CascadeLetter key={index} letter={letter} index={index} details={details} />)}
            </Text>
            {!showIdentity && (
              <Text aria-hidden pointerEvents="none" style={[styles.name, styles.namePlaceholder]} color={PAPER}>
                {t('collection.historical.current')}
              </Text>
            )}
          </View>
          {/* Always in the layout (invisible until revealed) so the frame never shifts at the end. */}
          <View
            testID="reveal-history-details"
            style={{ opacity: showIdentity ? 1 : 0 }}
            accessible={showIdentity}
            accessibilityElementsHidden={!showIdentity}
            importantForAccessibility={showIdentity ? 'auto' : 'no-hide-descendants'}
          >
            <Text variant="bodyStrong" style={styles.period} color={GOLD}>{flag.years}</Text>
            <Text style={styles.description} color={PAPER}>{flag.description[language]}</Text>
            <View style={styles.sources}>
            {reference && (
              <Touchable accessibilityRole="link" onPress={() => Linking.openURL(reference).catch(() => {})}>
                <Text variant="caption" color={GOLD}>{t('collection.historical.source')}</Text>
              </Touchable>
            )}
            {artwork && (
              <Touchable accessibilityRole="link" onPress={() => Linking.openURL(artwork.url).catch(() => {})}>
                <Text variant="caption" color={GOLD}>{artwork.credit}</Text>
              </Touchable>
            )}
            </View>
          </View>
        </Animated.View>
        {/* Reserved from the start (invisible until ready) so the frame never shifts at the end. */}
        <View testID="reveal-buttons" style={[styles.buttons, { opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none' }]}>
          {!replay && onView && <Button label={t('collection.view_collection')} color={GOLD} onPress={onView} />}
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={continueLabel}
            onPress={canClose ? onNext : undefined}
            disabled={!canClose}
            style={[styles.secondary, { opacity: canClose ? 1 : 0 }]}
          >
            <Text variant="bodyStrong" color={PAPER}>{continueLabel}</Text>
          </Touchable>
          {onSkip && (
            <Touchable accessibilityRole="button" onPress={onSkip} style={styles.secondary}>
              <Text variant="caption" color={PAPER}>{t('collection.skip_remaining')}</Text>
            </Touchable>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function ArchiveTunnel({ clock }: { clock: SharedValue<number> }) {
  const spin = useSharedValue(0)
  useEffect(() => {
    spin.set(withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false))
  }, [spin])
  const seal = useAnimatedStyle(() => {
    const p = clock.get()
    return {
      opacity: interpolate(p, [0, 0.18, 0.75, 1], [0, 1, 1, 0]),
      transform: [
        { rotate: '45deg' },
        { scale: interpolate(p, [0, 0.42, 0.58, 0.75, 1], [0.36, 0.98, 1.07, 1.05, 1.33]) },
      ],
    }
  })
  const sigil = useAnimatedStyle(() => ({ transform: [{ rotate: `${-45 + spin.get()}deg` }] }))
  const ring = useAnimatedStyle(() => {
    const p = clock.get()
    return {
      opacity: interpolate(p, [0.84, 0.92, 1], [0, 0.85, 0]),
      transform: [{ scale: interpolate(p, [0.84, 1], [1, 2.15]) }],
    }
  })
  return (
    <View style={styles.tunnel} pointerEvents="none" aria-hidden>
      {[0, 1, 2, 3, 4].map((index) => <ArchivePortal key={index} clock={clock} index={index} />)}
      {ARCHIVE_MOTES.map((mote, index) => <ArchiveMote key={index} mote={mote} clock={clock} />)}
      <Animated.View style={[styles.seal, seal]}>
        <Animated.View style={sigil}><ArchiveSigil size={40} color={PAPER} /></Animated.View>
        <Animated.View pointerEvents="none" style={[styles.sealRing, ring]} />
      </Animated.View>
    </View>
  )
}

function ArchivePortal({ clock, index }: { clock: SharedValue<number>; index: number }) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (clock.get() * ARCHIVE_PACK_INTRO - index * 180) / 1040))
    return {
      opacity: interpolate(p, [0, 0.24, 1], [0, 0.88, 0]),
      transform: [{ scale: interpolate(p, [0, 1], [0.13, 2.6]) }],
    }
  })
  return <Animated.View style={[styles.portal, style]} />
}

function ArchiveMote({ mote, clock }: { mote: (typeof ARCHIVE_MOTES)[number]; clock: SharedValue<number> }) {
  const { x, y, dx, dy, size, delay } = mote
  const style = useAnimatedStyle(() => {
    const progress = Math.max(0, (clock.get() * ARCHIVE_PACK_INTRO - delay) / (ARCHIVE_PACK_INTRO - delay))
    return {
      opacity: interpolate(progress, [0, 0.32, 0.68, 1], [0, 0.72, 0.49, 0]),
      transform: [{ translateX: dx * progress }, { translateY: dy * progress }, { scale: 0.4 + 0.7 * progress }],
    }
  })
  return <Animated.View style={[styles.mote, { left: `${x}%`, top: `${y}%`, width: size, height: size }, style]} />
}

// One letter of the revealed name, rising from a blur into place as `details` progresses.
function CascadeLetter({ letter, index, details }: { letter: string; index: number; details: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const start = 0.15 + index * 0.04
    const progress = interpolate(details.get(), [start, start + 0.3], [0, 1], Extrapolation.CLAMP)
    return { opacity: progress, transform: [{ translateY: (1 - progress) * 14 }] }
  })
  return <Animated.Text accessible={false} style={[styles.nameLetter, style]}>{letter === ' ' ? ' ' : letter}</Animated.Text>
}

// A dust mote drifting up in the light shaft, looping with a per-mote offset.
function DustMote({ index, time }: { index: number; time: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const progress = (time.get() + index * 0.33) % 1
    return {
      opacity: interpolate(progress, [0, 0.25, 0.8, 1], [0, 0.85, 0.4, 0]),
      transform: [{ translateX: -14 * progress }, { translateY: -90 * progress }],
    }
  })
  const left = [30, 56, 73][index]
  const top = [72, 82, 64][index]
  return <Animated.View pointerEvents="none" style={[styles.dust, { left: `${left}%`, top: `${top}%` }, style]} />
}

function ArchiveSpark({ spark, time }: { spark: (typeof ARCHIVE_SPARKS)[number]; time: SharedValue<number> }) {
  const { x, y, dx, dy, delay, duration, length, angle, color } = spark
  const motion = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, (time.get() - delay) / duration))
    const travel = 1 - (1 - progress) ** 2
    return {
      opacity: interpolate(progress, [0, 0.12, 0.6, 1], [0, 1, 0.88, 0]),
      transform: [
        { translateX: dx * travel },
        { translateY: dy * travel + 18 * progress ** 2 },
        { rotate: `${angle}deg` },
        { scaleX: interpolate(progress, [0, 0.36, 1], [0.25, 1, 0.36]) },
      ],
    }
  })
  return (
    <Animated.View style={[styles.spark, { left: `${x}%`, top: `${y}%`, width: length, height: length <= 4 ? length : 2, backgroundColor: color }, motion]}>
      {length > 4 && <View style={styles.sparkTip} />}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000, justifyContent: 'center', backgroundColor: INK },
  tunnel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mote: { position: 'absolute', borderRadius: 3, backgroundColor: '#FFE4A5' },
  portal: { position: 'absolute', width: '72%', height: '50%', borderWidth: 2, borderColor: GOLD, borderRadius: 7 },
  seal: { width: 74, height: 74, justifyContent: 'center', alignItems: 'center', borderColor: GOLD, borderWidth: 2, backgroundColor: '#3D2B23' },
  sealRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderColor: GOLD, borderWidth: 2 },
  shutterSigil: { position: 'absolute', top: '50%', marginTop: -SHUTTER_SIGIL / 2, width: SHUTTER_SIGIL / 2, height: SHUTTER_SIGIL, overflow: 'hidden' },
  shutterSigilLeft: { right: 0 },
  shutterSigilRight: { left: 0 },
  scroll: { flexGrow: 0 },
  content: { alignItems: 'center', paddingHorizontal: space.lg, gap: space.lg },
  frame: {
    width: FRAME_WIDTH,
    maxWidth: '100%',
    aspectRatio: 1.5,
    padding: 10,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: '#332322',
  },
  window: { flex: 1, borderWidth: 1, borderColor: '#A48052', overflow: 'hidden', backgroundColor: '#151216' },
  image: { width: '100%', height: '100%' },
  flare: { ...StyleSheet.absoluteFill, backgroundColor: '#FFF1CB' },
  sheen: { position: 'absolute', top: '-25%', bottom: '-25%', left: -85, width: 50, backgroundColor: '#FFE0A050' },
  sheenCore: { alignSelf: 'center', width: 18, flex: 1, backgroundColor: '#FFF1CB88' },
  shutter: { position: 'absolute', top: 0, bottom: 0, width: '51%', backgroundColor: '#412E2B', borderColor: GOLD },
  leftShutter: { left: 0, borderRightWidth: 2 },
  rightShutter: { right: 0, borderLeftWidth: 2 },
  spark: { position: 'absolute', height: 2, borderRadius: 1 },
  sparkTip: { position: 'absolute', right: 0, width: 3, height: 2, borderRadius: 1, backgroundColor: '#FFF7DF' },
  details: { width: '100%', maxWidth: 410, alignItems: 'center', gap: space.xs },
  label: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderWidth: 1,
    borderColor: '#A48052',
    borderRadius: 20,
    backgroundColor: '#3D2B24',
  },
  nameWrap: { alignSelf: 'stretch', position: 'relative', alignItems: 'center' },
  name: { fontFamily: 'serif', fontSize: 32, lineHeight: 36, textAlign: 'center' },
  namePlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, textAlign: 'center' },
  nameLetter: { fontFamily: 'serif', fontSize: 32, lineHeight: 36 },
  bar: { position: 'absolute', left: 0, right: 0, height: BAR_HEIGHT, backgroundColor: '#0B090A' },
  barTop: { top: 0 },
  barBottom: { bottom: 0 },
  pulse: { backgroundColor: '#F6A95930' },
  beam: { position: 'absolute', top: '-14%', left: '-17.5%', width: '135%', height: '135%', backgroundColor: '#FFE7B229' },
  beamCore: { position: 'absolute', top: 0, bottom: 0, left: '32%', width: '36%', backgroundColor: '#FFF4CF26' },
  dust: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFEDBE', opacity: 0 },
  period: { letterSpacing: 2, textAlign: 'center' },
  description: { alignSelf: 'stretch', textAlign: 'center', borderTopWidth: 1, borderTopColor: '#715840', paddingTop: space.sm, marginTop: space.sm },
  sources: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  buttons: { width: '100%', maxWidth: 320, gap: space.xs },
  secondary: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: space.sm, minHeight: 44 },
})
