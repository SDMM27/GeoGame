// Card sliding in from the top when a claim pays flag fragments (and unlocks no flag, see FlagUnlockOverlay): the flag
// being rebuilt with the new pieces popping in, and its progress bar. Falls back to a plain toast without the data.
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Animated, {
  FadeInUp,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { pieceGrid, piecesFor } from '@shared/utils/flagCollection'
import { onXpClaimed } from '@shared/utils/xp'

import { useAccount } from '@/account/auth'
import { flagsAfter, haptic, rarityColor, rarityOf, rewardLines, type Claim } from '@/components/collection/claim'
import { FlagPiece } from '@/components/collection/FlagPiece'
import { Text } from '@/components/ui'
import { toast } from '@/shims/react-toastify'
import { colors, radius, space } from '@/theme'

type Card = { id: number; iso: string; pieces: number; added: number; fragments: number; lines: string[] }

const W = 60
const H = 40
const DURATION = 3200

export function FragmentToast() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const uid = account?.uid
  const insets = useSafeAreaInsets()
  const [card, setCard] = useState<Card | null>(null)
  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () =>
      onXpClaimed((claim: Claim) => {
        const fragments = claim.fragments ?? 0
        if (fragments <= 0 || (claim.unlockedFlags?.length ?? 0) > 0) return
        const flags = flagsAfter(claim, uid)
        if (!flags?.current) {
          toast.success(t('level.fragments', { count: fragments }))
          rewardLines(t, claim).forEach((line) => toast.success(line))
          return
        }
        const cost = piecesFor(rarityOf(flags.current))
        nextId.current += 1
        setCard({ id: nextId.current, iso: flags.current, pieces: flags.pieces, added: Math.min(fragments, flags.pieces, cost), fragments, lines: rewardLines(t, claim) })
        haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCard(null), DURATION)
      }),
    [uid, t],
  )
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  if (!card) return null
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + space.sm + 56 }]}>
      <Animated.View key={card.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)} style={styles.card} accessibilityLiveRegion="polite">
        <MiniFlag card={card} />
        <FragmentText card={card} />
      </Animated.View>
    </View>
  )
}

// The flag in W x H: owned pieces visible, new ones popping in, the others covered.
function MiniFlag({ card }: { card: Card }) {
  const rarity = rarityOf(card.iso)
  const cost = piecesFor(rarity)
  const { cols, rows } = pieceGrid(cost)
  const firstNew = card.pieces - card.added
  return (
    <View testID="fragment-flag" style={styles.flag}>
      {Array.from({ length: cost }, (_, index) => (
        <View
          key={index}
          style={{ position: 'absolute', left: (index % cols) * (W / cols), top: Math.floor(index / cols) * (H / rows), width: W / cols, height: H / rows }}>
          {index < firstNew && <FlagPiece iso={card.iso} index={index} cols={cols} rows={rows} />}
          {index >= firstNew && index < card.pieces && (
            <PopPiece iso={card.iso} index={index} cols={cols} rows={rows} delay={250 + (index - firstNew) * 130} color={rarityColor(rarity)} />
          )}
          {index >= card.pieces && <View style={[StyleSheet.absoluteFill, styles.cover]} />}
        </View>
      ))}
    </View>
  )
}

function PopPiece({ iso, index, cols, rows, delay, color }: { iso: string; index: number; cols: number; rows: number; delay: number; color: string }) {
  const pop = useSharedValue(0)
  const glow = useSharedValue(0)
  useEffect(() => {
    pop.set(withDelay(delay, withSequence(withTiming(1.15, { duration: 160 }), withSpring(1, { damping: 10 }))))
    glow.set(withDelay(delay, withSequence(withTiming(0.8, { duration: 160 }), withTiming(0, { duration: 500 }))))
  }, [delay, glow, pop])
  const style = useAnimatedStyle(() => ({ opacity: interpolate(pop.get(), [0, 0.4], [0, 1], 'clamp'), transform: [{ scale: pop.get() }] }))
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }))
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <FlagPiece iso={iso} index={index} cols={cols} rows={rows} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color }, glowStyle]} />
    </Animated.View>
  )
}

function FragmentText({ card }: { card: Card }) {
  const { t } = useTranslation()
  const rarity = rarityOf(card.iso)
  const cost = piecesFor(rarity)
  const bar = useSharedValue((card.pieces - card.added) / cost)
  useEffect(() => {
    bar.set(withDelay(400, withTiming(card.pieces / cost, { duration: 600 })))
  }, [bar, card.pieces, cost])
  const fillStyle = useAnimatedStyle(() => ({ width: `${bar.get() * 100}%` }))
  return (
    <View style={styles.texts}>
      <Text variant="bodyStrong">{t('level.fragments', { count: card.fragments })}</Text>
      {card.lines.map((line) => (
        <Text key={line} variant="caption" color={colors.accent} style={{ fontSize: 12 }}>
          {line}
        </Text>
      ))}
      <Text variant="caption" style={{ fontSize: 12 }}>
        {t('collection.pieces', { count: card.pieces, total: cost })}
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: rarityColor(rarity) }, fillStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', zIndex: 101 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    maxWidth: '100%',
  },
  flag: { width: W, height: H, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surface },
  cover: { backgroundColor: colors.borderStrong },
  texts: { gap: 3, minWidth: 120, flexShrink: 1 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginTop: 2 },
  fill: { height: 4, borderRadius: 2 },
})
