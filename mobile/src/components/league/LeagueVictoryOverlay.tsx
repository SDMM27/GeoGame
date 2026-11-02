// Full-screen reward on the Play tab when the player finished on the podium of the league week that just ended
// (useLeagueVictory): a burst and the trophy for the winner, a medal for 2nd and 3rd, with what it paid.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { useLeagueVictory } from '@shared/hooks/useLeagueVictory'
import { TIER_COLORS } from '@shared/utils/achievements'

import { haptic } from '@/components/collection/claim'
import { Button, Text, Touchable } from '@/components/ui'
import { colors, fonts, space } from '@/theme'

type Result = { week: string; rank: number; points: number; reward: number }

const BURST_COUNT = 24
const STAGE = 160

// `uid`: the signed-in account's, undefined for a visitor.
export function LeagueVictoryOverlay({ uid }: { uid?: string }) {
  const { result, dismiss } = useLeagueVictory(uid ?? null) as { result: Result | null; dismiss: () => void }
  if (!result) return null
  return <Victory result={result} onClose={dismiss} />
}

function Victory({ result, onClose }: { result: Result; onClose: () => void }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const champion = result.rank === 1
  const color = champion ? TIER_COLORS.gold : result.rank === 2 ? TIER_COLORS.silver : TIER_COLORS.bronze
  const title = champion ? t('league.win_title') : t('league.podium_title', { rank: result.rank })
  const reward = t('league.win_reward', { count: result.reward })

  const backdrop = useSharedValue(0)
  const icon = useSharedValue(reduced ? 1 : 0)
  const ring = useSharedValue(0)
  const burst = useSharedValue(0)
  const textIn = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    backdrop.set(withTiming(1, { duration: 250 }))
    icon.set(withDelay(200, reduced ? withTiming(1, { duration: 300 }) : withSpring(1, { damping: 9 })))
    textIn.set(withDelay(500, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })))
    if (champion && !reduced) {
      ring.set(withDelay(350, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) })))
      burst.set(withDelay(350, withTiming(1, { duration: 950, easing: Easing.linear })))
    }
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
    AccessibilityInfo.announceForAccessibility(`${title} ${reward}`)
  }, [backdrop, burst, champion, icon, reduced, reward, ring, textIn, title])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }))
  const iconStyle = useAnimatedStyle(() => ({ opacity: icon.get(), transform: [{ scale: 0.4 + 0.6 * icon.get() }] }))
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.get(), [0, 0.05, 1], [0, 0.9, 0]),
    transform: [{ scale: interpolate(ring.get(), [0, 1], [0.7, 2.8]) }],
  }))
  const textStyle = useAnimatedStyle(() => ({ opacity: textIn.get(), transform: [{ translateY: (1 - textIn.get()) * 16 }] }))

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View pointerEvents="box-none" style={styles.content}>
          <View pointerEvents="none" style={styles.stage}>
            <View style={[styles.glow, { backgroundColor: color }]} />
            {champion && !reduced && (
              <>
                <Animated.View style={[styles.ring, { borderColor: color }, ringStyle]} />
                {Array.from({ length: BURST_COUNT }, (_, index) => (
                  <Particle key={index} burst={burst} index={index} color={index % 3 === 0 ? '#FFFFFF' : color} />
                ))}
              </>
            )}
            <Animated.View style={iconStyle}>
              <MaterialCommunityIcons name={champion ? 'trophy' : 'medal'} size={110} color={color} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.texts, textStyle]} accessibilityLiveRegion="polite">
            <Text style={styles.title}>{title}</Text>
            <View style={[styles.chip, { backgroundColor: `${color}26`, borderColor: `${color}80` }]}>
              <Text variant="label" color={color}>
                {reward}
              </Text>
            </View>
            {champion && (
              <View style={[styles.chip, { backgroundColor: `${color}26`, borderColor: `${color}80` }]}>
                <Text variant="label" color={color}>
                  {t('league.win_champion')}
                </Text>
              </View>
            )}
            <Text variant="caption">{t('league.last_rank', { rank: result.rank, points: result.points })}</Text>
          </Animated.View>

          <Animated.View style={[styles.buttons, textStyle]}>
            <Button
              label={t('league.win_cta')}
              color={color}
              onPress={() => {
                onClose()
                router.push('/league')
              }}
            />
            <Touchable accessibilityRole="button" accessibilityLabel={t('league.win_close')} onPress={onClose} style={styles.secondary}>
              <Text variant="caption">{t('league.win_close')}</Text>
            </Touchable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  )
}

// Dot thrown out of the icon's center; angle and reach are fixed per particle.
function Particle({ burst, index, color }: { burst: SharedValue<number>; index: number; color: string }) {
  const [shape] = useState(() => ({
    angle: (index / BURST_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
    dist: 110 + Math.random() * 100,
    size: 5 + Math.random() * 6,
  }))
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
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: STAGE / 2 - shape.size / 2, top: STAGE / 2 - shape.size / 2, width: shape.size, height: shape.size, borderRadius: shape.size / 2, backgroundColor: color },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(6,10,22,0.94)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxl },
  stage: { width: STAGE, height: STAGE, marginBottom: space.xxl, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.18 },
  ring: { position: 'absolute', width: STAGE, height: STAGE, borderRadius: STAGE / 2, borderWidth: 3 },
  texts: { alignItems: 'center', gap: space.sm },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.5, color: colors.text, textAlign: 'center' },
  chip: { paddingHorizontal: space.md, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  buttons: { alignItems: 'stretch', gap: space.sm, marginTop: space.xl, alignSelf: 'stretch' },
  secondary: { alignSelf: 'center', paddingVertical: space.sm, paddingHorizontal: space.lg },
})
