// Full-screen reward when the server unlocks scrolls (onXpClaimed in @shared/utils/xp): the sealed scroll, then a tap on
// the seal opens it onto its map and title, with a link to its sheet. Several scrolls play one after another, and after
// the flag overlay when the same claim unlocked flags too.
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { onXpClaimed } from '@shared/utils/xp'
import { scrollById, scrollsAfter, SCROLLS } from '@shared/utils/scrollCollectionData'

import { useAccount } from '@/account/auth'
import { isFlagOverlayOpen, onFlagOverlayChange } from '@/components/collection/busy'
import { haptic, type Claim } from '@/components/collection/claim'
import { ScrollImage, parchment } from '@/components/scrolls/ScrollImage'
import { ScrollSeal } from '@/components/scrolls/ScrollSeal'
import { Button, Text, Touchable } from '@/components/ui'
import { colors, fonts, radius, space } from '@/theme'

type Item = { id: number; scrollId: string; count: number | null }

const W = 280
const H = 210
const EXIT = 220

export function ScrollUnlockOverlay() {
  const { account } = useAccount()
  const uid = account?.uid
  const [queue, setQueue] = useState<Item[]>([])
  const [flagOpen, setFlagOpen] = useState(isFlagOverlayOpen)
  const nextId = useRef(0)

  useEffect(
    () =>
      onXpClaimed((claim: Claim) => {
        const ids = (claim.unlockedScrolls ?? []).filter((id) => scrollById(id))
        if (ids.length === 0) return
        const scrolls = scrollsAfter(claim, uid) as { unlocked: string[] } | null
        const first = nextId.current
        nextId.current += ids.length
        // The account already holds every scroll of the claim: the n-th one from the end counts n fewer
        setQueue((current) => [
          ...current,
          ...ids.map((scrollId, index) => ({ id: first + index, scrollId, count: scrolls ? scrolls.unlocked.length - (ids.length - 1 - index) : null })),
        ])
      }),
    [uid],
  )
  useEffect(() => onFlagOverlayChange(setFlagOpen), [])

  const item = queue[0]
  if (!item || flagOpen) return null
  return (
    <ScrollReveal
      key={item.id}
      item={item}
      onNext={() => setQueue((current) => current.slice(1))}
      onView={() => {
        setQueue([])
        router.push({ pathname: '/parchments', params: { open: item.scrollId } })
      }}
    />
  )
}

function ScrollReveal({ item, onNext, onView }: { item: Item; onNext: () => void; onView: () => void }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [opened, setOpened] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const title = t(`scrolls.title_${item.scrollId}`)
  const backdrop = useSharedValue(0)
  const exit = useSharedValue(0)
  const rise = useSharedValue(reduced ? 1 : 0)
  const pulse = useSharedValue(1)
  const unroll = useSharedValue(0)

  useEffect(() => {
    backdrop.set(withTiming(1, { duration: 250 }))
    rise.set(withTiming(1, { duration: reduced ? 0 : 450 }))
    if (!reduced) pulse.set(withRepeat(withSequence(withTiming(1.08, { duration: 800 }), withTiming(1, { duration: 800 })), -1))
  }, [backdrop, pulse, reduced, rise])

  const open = () => {
    if (opened) return
    setOpened(true)
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
    unroll.set(withDelay(0, withTiming(1, { duration: reduced ? 0 : 600 })))
    AccessibilityInfo.announceForAccessibility(title)
  }
  const leave = (view: boolean) => {
    if (leaving) return
    setLeaving(true)
    exit.set(withTiming(1, { duration: EXIT }))
    setTimeout(view ? onView : onNext, EXIT)
  }

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }))
  const scrollStyle = useAnimatedStyle(() => ({ opacity: rise.get(), transform: [{ translateY: (1 - rise.get()) * 18 }] }))
  const sealStyle = useAnimatedStyle(() => ({ opacity: 1 - unroll.get(), transform: [{ scale: pulse.get() }] }))
  const closedStyle = useAnimatedStyle(() => ({ opacity: 1 - unroll.get() }))
  const mapStyle = useAnimatedStyle(() => ({ opacity: unroll.get(), transform: [{ scaleX: 0.4 + 0.6 * unroll.get() }] }))

  return (
    <Animated.View style={[styles.root, rootStyle]} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => opened && leave(false)} />
      <View pointerEvents="box-none" style={styles.content}>
        <Text variant="bodyStrong" color={colors.textMuted}>
          {t('scrolls.new_scroll')}
        </Text>
        <Animated.View style={[styles.stage, scrollStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, mapStyle]}>
            <ScrollImage id={item.scrollId} style={styles.map} />
          </Animated.View>
          {!opened && (
            <Animated.View style={[StyleSheet.absoluteFill, styles.closed, closedStyle]}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('scrolls.open_seal')} onPress={open} style={styles.sealHit}>
                <Animated.View style={sealStyle}>
                  <ScrollSeal size={72} />
                </Animated.View>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.texts} accessibilityLiveRegion="polite">
          {opened ? (
            <>
              <Text style={styles.name}>{title}</Text>
              {item.count != null && <Text variant="caption">{t('scrolls.progress', { count: item.count, total: SCROLLS.length })}</Text>}
            </>
          ) : (
            <>
              <Text style={styles.name}>{t('scrolls.sealed')}</Text>
              <Text variant="caption">{t('scrolls.tap_seal')}</Text>
            </>
          )}
        </View>

        {opened && (
          <View style={styles.buttons}>
            <Button label={t('scrolls.view_scroll')} onPress={() => leave(true)} />
            <Touchable accessibilityRole="button" accessibilityLabel={t('collection.tap_to_continue')} onPress={() => leave(false)} style={styles.secondary}>
              <Text variant="caption">{t('collection.tap_to_continue')}</Text>
            </Touchable>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
  backdrop: { backgroundColor: 'rgba(6,10,22,0.94)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl },
  stage: { width: W, height: H },
  map: { width: W, height: H, borderRadius: radius.md },
  closed: { borderRadius: radius.md, backgroundColor: parchment.mid, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: parchment.edge },
  sealHit: { padding: space.xl },
  texts: { alignItems: 'center', gap: space.sm, minHeight: 72 },
  name: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.5, color: colors.text, textAlign: 'center' },
  buttons: { alignItems: 'stretch', gap: space.sm, alignSelf: 'stretch' },
  secondary: { alignSelf: 'center', paddingVertical: space.sm, paddingHorizontal: space.lg },
})
