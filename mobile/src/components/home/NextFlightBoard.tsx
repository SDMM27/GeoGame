// Shown over the home globe when the player puts the city in the reticle (port of the website's NextFlightBoard): a
// departures-board flap swings down and its letters roll to the next flight, a daily not played today or else a game not
// played today (@shared/utils/nextFlight). `flight` null: every flight of the day was played.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import Animated, { Keyframe, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import GameEmblem, { flightCode } from '@/components/GameEmblem'
import { Button } from '@/components/ui'
import { fonts, makeStyles, radius, useColors } from '@/theme'

export type NextFlight = { game: string; title: string; daily: boolean }

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** The split-flap letters of `text`: they spin through the alphabet, then settle from left to right (like FlapText.jsx). */
export function useFlapText(text: string, { delay = 0, duration = 900, reduced = false } = {}) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (reduced) return undefined
    let frame = 0
    let start: number | null = null
    const tick = (now: number) => {
      start ??= now
      const k = (now - start - delay) / duration
      if (k >= 1) {
        setShown(text)
        return
      }
      const settled = Math.max(0, Math.floor(text.length * k))
      const spin = Math.floor((now - start) / 45)
      setShown(
        [...text].map((ch, i) => (i < settled || /[\s·.\-'’]/.test(ch) ? ch : GLYPHS[(i * 7 + spin) % GLYPHS.length])).join(''),
      )
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, delay, duration, reduced])
  return reduced ? text : shown
}

// The flap swings down from its top edge, overshoots a little and settles
const flapIn = new Keyframe({
  0: { opacity: 0, transform: [{ perspective: 700 }, { rotateX: '-100deg' }] },
  35: { opacity: 1 },
  70: { transform: [{ perspective: 700 }, { rotateX: '14deg' }] },
  100: { opacity: 1, transform: [{ perspective: 700 }, { rotateX: '0deg' }] },
}).duration(620)

export function NextFlightBoard({ flight, onBoard, onClose }: { flight: NextFlight | null; onBoard: () => void; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const colors = useColors()
  const styles = useStyles()
  const reduced = useReducedMotion()
  const upper = (text: string) => text.toLocaleUpperCase(i18n.resolvedLanguage)
  const title = useFlapText(upper(flight ? flight.title : t('globe.all_done')), { delay: 260, reduced })
  const code = flight ? flightCode(flight.game) : ''

  // The boarding light blinks
  const blink = useSharedValue(1)
  useEffect(() => {
    if (!reduced) blink.set(withRepeat(withSequence(withTiming(0.2, { duration: 550 }), withTiming(1, { duration: 550 })), -1))
  }, [blink, reduced])
  const dotStyle = useAnimatedStyle(() => ({ opacity: blink.get() }))

  return (
    <Animated.View
      entering={reduced ? undefined : flapIn}
      accessibilityLiveRegion="polite"
      accessibilityLabel={flight ? `${t('home.next_departure')}, ${flight.title}` : t('globe.all_done')}
      style={styles.board}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{upper(t('home.next_departure'))}</Text>
        {!!code && <Text style={styles.code}>{code}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={t('globe.close')} hitSlop={8} onPress={onClose} style={styles.close}>
          <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.body}>
        {flight && <GameEmblem game={flight.game} size={34} />}
        <Text style={styles.title} numberOfLines={2}>
          {title || ' '}
        </Text>
      </View>
      <View style={styles.foot}>
        <View style={styles.status}>
          {flight && <Animated.View style={[styles.dot, dotStyle]} />}
          <Text style={styles.statusText} numberOfLines={2}>
            {flight ? t(flight.daily ? 'globe.offer_daily' : 'globe.offer_game') : t('globe.all_done_hint')}
          </Text>
        </View>
        {flight && <Button label={t('home.board')} onPress={onBoard} style={styles.button} />}
      </View>
    </Animated.View>
  )
}

const useStyles = makeStyles((colors) => ({
  board: {
    width: '92%',
    maxWidth: 340,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.boardLine,
    backgroundColor: colors.board,
    overflow: 'hidden',
    transformOrigin: 'top',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.boardLine,
  },
  kicker: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  code: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.2, color: colors.gold },
  close: { marginLeft: 'auto', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, minHeight: 52 },
  title: { flex: 1, fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: 1, color: colors.gold },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 8, paddingBottom: 8, paddingTop: 4 },
  status: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  statusText: { flexShrink: 1, fontFamily: fonts.mono, fontSize: 11, color: colors.accent },
  button: { minHeight: 44, paddingHorizontal: 16 },
}))
