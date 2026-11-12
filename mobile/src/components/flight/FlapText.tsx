import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

import { fonts } from '@/theme'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function flapFrame(text: string, progress: number, spin: number): string {
  if (progress >= 1) return text
  const characters = Array.from(text)
  const settled = Math.max(0, Math.floor(characters.length * progress))
  return characters.map((ch, i) => i < settled || /[\s·.\-'’]/.test(ch) ? ch : GLYPHS[(i * 7 + spin) % GLYPHS.length]).join('')
}

/** The original globe board's letter sequence, shared by both kinds of card. */
export function useFlapText(text: string, { delay = 0, duration = 900, reduced = false } = {}) {
  const [shown, setShown] = useState(() => ({ text, reduced, value: flapFrame(text, 0, 0) }))
  // Reset before painting a new title or reopening, without showing the previous completed frame.
  if (shown.text !== text || shown.reduced !== reduced) {
    setShown({ text, reduced, value: flapFrame(text, 0, 0) })
  }
  useEffect(() => {
    if (reduced) return
    let frame = 0
    let start: number | null = null
    const tick = (now: number) => {
      start ??= now
      const progress = (now - start - delay) / duration
      const value = flapFrame(text, progress, Math.floor((now - start) / 45))
      setShown((previous) => previous.text === text && previous.value === value ? previous : { text, reduced, value })
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, delay, duration, reduced])
  return reduced ? text : shown.text === text ? shown.value : flapFrame(text, 0, 0)
}

/** Identical timing, font and letter widths for the globe offer and the dailies.
 * Reserve the final title's height, keeping the board stable while letters roll.
 */
export function FlapText({ text, active = true, color, numberOfLines }: { text: string; active?: boolean; color: string; numberOfLines?: number }) {
  const reduced = useReducedMotion()
  const shown = useFlapText(text, { delay: 260, reduced: reduced || !active })
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={styles.wrap}>
      <Text numberOfLines={numberOfLines} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.text, styles.reserve]}>{text}</Text>
      <Text numberOfLines={numberOfLines} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.text, styles.animated, { color }]}>{shown}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0, overflow: 'hidden' },
  text: { fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: 1 },
  reserve: { opacity: 0 },
  animated: { position: 'absolute', top: 0, left: 0, right: 0 },
})
