// Card sliding in from the top when a claim pays scroll seals: "+1 seal (1/2)". The scroll the seals open has its own
// reward (ScrollUnlockOverlay). Sits under the fragment card, which can show at the same time.
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { onXpClaimed } from '@shared/utils/xp'
import { scrollsAfter, SEALS_PER_SCROLL, sealProgress } from '@shared/utils/scrollCollectionData'

import { useAccount } from '@/account/auth'
import { haptic, type Claim } from '@/components/collection/claim'
import { ScrollSeal } from '@/components/scrolls/ScrollSeal'
import { Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Card = { id: number; seals: number; progress: number }

const DURATION = 3200

export function SealToast() {
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
        const seals = claim.seals ?? 0
        if (seals <= 0) return
        const scrolls = scrollsAfter(claim, uid) as { seals: number } | null
        nextId.current += 1
        // Without the account's seals the count of this claim is all there is to show
        setCard({ id: nextId.current, seals, progress: scrolls ? sealProgress(scrolls.seals, seals) : Math.min(seals, SEALS_PER_SCROLL) })
        haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCard(null), DURATION)
      }),
    [uid],
  )
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  if (!card) return null
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + space.sm + 56 + 84 }]}>
      <Animated.View key={card.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)} style={styles.card} accessibilityLiveRegion="polite">
        <ScrollSeal size={28} />
        <Text variant="bodyStrong">{t('scrolls.seal_gain', { count: card.seals, progress: card.progress, total: SEALS_PER_SCROLL })}</Text>
      </Animated.View>
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
})
