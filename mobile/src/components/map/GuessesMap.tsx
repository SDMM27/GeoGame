// Static world map highlighting the countries guessed in a round (wrong in red, answer in green).
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, radius } from '@/theme'
import { allCountries } from './geometry'
import { WorldMap, type Overlay, type WorldMapHandle } from './WorldMap'

const WRONG = { fillColor: colors.danger, fillOpacity: 0.55, color: colors.danger, weight: 2 }
const CORRECT = { fillColor: colors.accent, fillOpacity: 0.6, color: colors.accent, weight: 2 }

const CENTERS = new Map(
  allCountries.map((feature) => [feature.properties.ADMIN, feature.properties.center as [number, number] | undefined])
)

export function GuessesMap({
  guesses,
  style,
}: {
  guesses: { name: string; correct: boolean }[]
  style?: StyleProp<ViewStyle>
}) {
  const mapRef = useRef<WorldMapHandle>(null)
  const [ready, setReady] = useState(false)
  const signature = guesses.map((guess) => `${guess.name}:${guess.correct}`).join('|')

  // A dot on each guess keeps tiny countries visible at world scale.
  const overlays = useMemo<Overlay[]>(
    () =>
      guesses.flatMap((guess) => {
        const center = CENTERS.get(guess.name)
        return center ? [{ type: 'circle' as const, center: [center[1], center[0]] as [number, number], radius: 4, color: guess.correct ? colors.accent : colors.danger }] : []
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  )

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const byName = new Map(guesses.map((guess) => [guess.name, guess.correct]))
    map.geoJson.resetStyle()
    for (const layer of map.geoJson.getLayers()) {
      const correct = byName.get(layer.feature.properties.ADMIN)
      if (correct !== undefined) layer.setStyle(correct ? CORRECT : WRONG)
    }
    map.fitCountries([...byName.keys()], { animate: false, maxZoom: 5 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature])

  return (
    <View style={[styles.frame, style]}>
      <WorldMap ref={mapRef} interactive={false} showSmallCountryMarkers={false} overlays={overlays} onReady={() => setReady(true)} />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ocean,
  },
})
