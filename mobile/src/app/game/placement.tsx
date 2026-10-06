// "Trouve le pays": tap the target country on the map.
// Game rules come from the website hooks (useGameState / useAscensionState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useAscensionState from '@shared/hooks/useAscensionState'
import useGameState from '@shared/hooks/useGameState'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCountryName } from '@shared/utils/getCountryName'

import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { WorldMap, type WorldMapHandle } from '@/components/map/WorldMap'
import { allCountries } from '@/components/map/geometry'
import { Button, Text } from '@/components/ui'
import { DIFFICULTY_COLORS } from '@/games'
import { clean } from '@/i18n'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const CONTINENT_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  Amériques: { center: [10, -80], zoom: 3 },
  Afrique: { center: [10, 20], zoom: 3.6 },
  Europe: { center: [50, 20], zoom: 4 },
  Océanie: { center: [-10, 170], zoom: 3.5 },
}

type Params = { difficulty?: string; continent?: string; training?: string; ascension?: string; preset?: string }

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  return `${Math.floor(totalSeconds / 60)}m${String(totalSeconds % 60).padStart(2, '0')}s`
}

type GameState = any

// Hand the map to the website hook as if it were Leaflet (map + GeoJSON layer refs).
function attachMap(state: GameState, handle: WorldMapHandle) {
  state.geoJsonRef.current = handle.geoJson
  state.extraGeoJsonRefs.current = []
  state.setMapRef(handle)
}

function PlacementGame({
  state,
  difficulty,
  continent,
  isTraining,
  ascension,
}: {
  state: GameState
  difficulty: string | null
  continent: string | null
  isTraining: boolean
  ascension: { presetName: string | null } | null
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<WorldMapHandle>(null)
  const {
    targetCountry,
    targetCountryISO,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    seeCountry,
    restartGame,
    onCountryClick,
    currentPhase,
    phaseCountRemaining,
    totalPhaseCount,
    phaseStats,
  } = state

  useEffect(() => {
    if (mapRef.current) attachMap(state, mapRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Frame the continent once the map is ready
  useEffect(() => {
    if (!continent) return
    const id = setTimeout(() => {
      const view = CONTINENT_VIEW[continent]
      if (view) mapRef.current?.setView(view.center, view.zoom, { animate: false })
      else
        mapRef.current?.fitCountries(
          allCountries.filter((f) => f.properties.continent === continent).map((f) => f.properties.ADMIN),
          { animate: false }
        )
    }, 50)
    return () => clearTimeout(id)
  }, [continent])

  const targetName = getCountryName(targetCountryISO, i18n.language) || targetCountry
  const progress = stats.total ? (stats.found + stats.skipped) / stats.total : 0
  const remaining = stats.total - stats.found - stats.skipped
  const phaseColor = currentPhase ? DIFFICULTY_COLORS[currentPhase] : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.ocean }}>
      <WorldMap ref={mapRef} onCountryPress={(layer) => onCountryClick({ target: layer })} />

      <GameTopBar>
        <HudPill icon="timer-outline" label={displayTimer} />
        {!isTraining && <HudPill icon="star-four-points-outline" label={String(score)} color={colors.accent} />}
      </GameTopBar>

      {!isGameOver && targetCountry && (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          layout={LinearTransition.springify()}
          style={[styles.panel, { bottom: insets.bottom + space.md }]}>
          {currentPhase && (
            <View style={styles.phaseRow}>
              <Text variant="label" color={phaseColor ?? colors.textMuted}>
                {t('mobile.game.phase')} · {t(`difficulties.${currentPhase}`)}
              </Text>
              <Text variant="caption">
                {phaseCountRemaining}/{totalPhaseCount} {t('mobile.game.remaining')}
              </Text>
            </View>
          )}
          <Text variant="label">{t('mobile.game.find')}</Text>
          <Animated.View key={targetCountry} entering={FadeIn.duration(220)}>
            <Text variant="title" numberOfLines={2} adjustsFontSizeToFit style={{ marginTop: 2 }}>
              {targetName}
            </Text>
          </Animated.View>
          <View style={styles.footer}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${progress * 100}%`, backgroundColor: gameColors.placement }]} />
              </View>
              <Text variant="caption">
                {stats.found}/{stats.total} {t('mobile.game.found')} · {remaining} {t('mobile.game.remaining')}
              </Text>
            </View>
            <Button
              label={t('mobile.game.reveal')}
              variant="secondary"
              onPress={seeCountry}
              icon={<MaterialCommunityIcons name="eye-outline" size={18} color={colors.text} />}
              style={{ minHeight: 44, paddingHorizontal: space.lg }}
            />
          </View>
        </Animated.View>
      )}

      {isGameOver && (
        <ResultsSheet
          score={score}
          accent={gameColors.placement}
          stats={[
            { label: t('labels.countries_found'), value: `${stats.found}/${stats.total}`, color: colors.accent },
            { label: t('mobile.game.time'), value: formatDuration(timer) },
            { label: clean(t('stats.first_try')), value: String(stats.foundFirstTry ?? 0) },
          ]}
          save={
            isTraining
              ? null
              : ascension
                ? ascension.presetName
                  ? { kind: 'ascension', gameType: GAME_TYPES.PLACEMENT, presetName: ascension.presetName, timer, stats, phaseStats }
                  : null
                : { kind: 'standard', gameType: 'PLACEMENT', difficulty: (difficulty ?? continent)!, elapsedTime: timer, continent }
          }
          share={{
            gameType: 'PLACEMENT',
            difficulty: difficulty ?? continent ?? ascension?.presetName,
            details: t('share.details_placement_timer', { found: stats.found, total: stats.total, time: formatDuration(timer) }),
          }}
          onReplay={restartGame}
          onHome={() => navigate('/')}
        />
      )}
    </View>
  )
}

function StandardGame({ difficulty, continent, isTraining }: { difficulty: string | null; continent: string | null; isTraining: boolean }) {
  const state = useGameState(difficulty, isTraining, null, null, null, continent)
  return <PlacementGame state={state} difficulty={difficulty} continent={continent} isTraining={isTraining} ascension={null} />
}

function AscensionGame({ phases, presetName, isTraining }: { phases: Record<string, number>; presetName: string | null; isTraining: boolean }) {
  const state = useAscensionState(GAME_TYPES.PLACEMENT, phases, isTraining, true)
  return <PlacementGame state={state} difficulty={null} continent={null} isTraining={isTraining} ascension={{ presetName }} />
}

export default function PlacementScreen() {
  const params = useLocalSearchParams<Params>()
  const isTraining = params.training === '1'
  if (params.ascension) {
    return <AscensionGame phases={JSON.parse(params.ascension)} presetName={params.preset ?? null} isTraining={isTraining} />
  }
  return <StandardGame difficulty={params.difficulty ?? null} continent={params.continent ?? null} isTraining={isTraining} />
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    backgroundColor: 'rgba(11,16,32,0.96)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
})
