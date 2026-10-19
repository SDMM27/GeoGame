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

import { setupGameRecord } from '@/account/history'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { WorldMap, type WorldMapHandle } from '@/components/map/WorldMap'
import { allCountries } from '@/components/map/geometry'
import { Button, Text } from '@/components/ui'
import { DIFFICULTY_COLORS } from '@/games'
import { clean } from '@/i18n'
import { RoomGate, RoomHudPill, Standings, useReportFound, type RoomPlay } from '@/multiplayer/RoomPlay'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const CONTINENT_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  Amériques: { center: [10, -80], zoom: 3 },
  Afrique: { center: [10, 20], zoom: 3.6 },
  Europe: { center: [50, 20], zoom: 4 },
  Océanie: { center: [-10, 170], zoom: 3.5 },
}

type Params = { difficulty?: string; continent?: string; training?: string; ascension?: string; preset?: string; room?: string; gameType?: string }

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
  play,
  gameType = GAME_TYPES.PLACEMENT,
}: {
  state: GameState
  difficulty: string | null
  continent: string | null
  isTraining: boolean
  ascension: { presetName: string | null } | null
  play?: RoomPlay
  gameType?: string
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<WorldMapHandle>(null)
  const {
    targetCountry,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    seeCountry,
    restartGame,
    onCountryClick,
    onMapClick,
    currentPhase,
    phaseCountRemaining,
    totalPhaseCount,
    phaseStats,
  } = state

  useEffect(() => {
    if (mapRef.current) attachMap(state, mapRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useReportFound(play, stats.found)
  useEffect(() => {
    if (isGameOver) play?.finish({ weightedScore: score, countriesSolved: stats.found, attempts: stats.totalErrors ?? 0, elapsedTime: timer })
  }, [isGameOver, play, score, stats, timer])

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

  // useAscensionState doesn't expose targetCountryISO: look it up from the country name
  const targetCountryISO: string | null =
    state.targetCountryISO ?? allCountries.find((f) => f.properties.ADMIN === targetCountry)?.properties.ISO_A2 ?? null
  const targetName = getCountryName(targetCountryISO, i18n.language) || targetCountry
  const progress = stats.total ? (stats.found + stats.skipped) / stats.total : 0
  const remaining = stats.total - stats.found - stats.skipped
  const phaseColor = currentPhase ? DIFFICULTY_COLORS[currentPhase] : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.ocean }}>
      <WorldMap
        ref={mapRef}
        showBorders={gameType !== GAME_TYPES.HARDCORE}
        onCountryPress={(layer, latlng) =>
          gameType === GAME_TYPES.HARDCORE ? onMapClick({ latlng }) : onCountryClick({ target: layer })
        }
        onMapPress={(latlng) => onMapClick({ latlng })}
      />

      {!isGameOver && (
        <GameTopBar onQuit={play?.exit}>
          {play && <RoomHudPill code={play.room.id} gameIndex={play.room.gameIndex} />}
          <HudPill icon="timer-outline" label={displayTimer} />
          {!isTraining && <HudPill icon="star-four-points-outline" label={String(score)} color={colors.accent} />}
        </GameTopBar>
      )}

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
            {gameType !== GAME_TYPES.HARDCORE && <Button
              label={t('mobile.game.reveal')}
              variant="secondary"
              onPress={seeCountry}
              icon={<MaterialCommunityIcons name="eye-outline" size={18} color={colors.text} />}
              style={{ minHeight: 44, paddingHorizontal: space.lg }}
            />}
          </View>
        </Animated.View>
      )}

      {isGameOver && (
        <ResultsSheet
          score={score}
          accent={gameType === GAME_TYPES.HARDCORE ? gameColors.hardcore : gameColors.placement}
          stats={[
            { label: t('labels.countries_found'), value: `${stats.found}/${stats.total}`, color: colors.accent },
            { label: t('mobile.game.time'), value: formatDuration(timer) },
            { label: clean(t('stats.first_try')), value: String(stats.foundFirstTry ?? 0) },
          ]}
          record={setupGameRecord({
            gameType,
            isTraining,
            roomCode: play?.room.id,
            isAscension: !!ascension,
            presetName: ascension?.presetName,
            difficulty,
            continent,
            score,
            stats,
            timer,
          })}
          save={
            isTraining || play
              ? null
              : ascension
                ? ascension.presetName
                  ? { kind: 'ascension', gameType: GAME_TYPES.PLACEMENT, presetName: ascension.presetName, timer, stats, phaseStats }
                  : null
                : { kind: 'standard', gameType, difficulty: (difficulty ?? continent)!, elapsedTime: timer, continent }
          }
          share={
            play
              ? null
              : {
                  gameType,
                  difficulty: difficulty ?? continent ?? ascension?.presetName,
                  details: t('share.details_placement_timer', { found: stats.found, total: stats.total, time: formatDuration(timer) }),
                }
          }
          onReplay={play ? undefined : restartGame}
          onHome={play?.exit ?? (() => navigate('/'))}
          homeLabel={play ? t('mobile.multi.back_to_room') : undefined}>
          {play && <Standings code={play.room.id} gameIndex={play.room.gameIndex} />}
        </ResultsSheet>
      )}
    </View>
  )
}

function StandardGame({ difficulty, continent, isTraining, gameType }: { difficulty: string | null; continent: string | null; isTraining: boolean; gameType: string }) {
  const state = useGameState(difficulty, isTraining, null, null, null, continent, gameType)
  return <PlacementGame state={state} difficulty={difficulty} continent={continent} isTraining={isTraining} ascension={null} gameType={gameType} />
}

function AscensionGame({ phases, presetName, isTraining }: { phases: Record<string, number>; presetName: string | null; isTraining: boolean }) {
  const state = useAscensionState(GAME_TYPES.PLACEMENT, phases, isTraining, true)
  return <PlacementGame state={state} difficulty={null} continent={null} isTraining={isTraining} ascension={{ presetName }} />
}

function RoomGame({ play }: { play: RoomPlay }) {
  const { game } = play.room
  const { list, byDifficulty } = play.content
  return byDifficulty ? (
    <RoomAscensionGame play={play} phases={game.phases!} byDifficulty={byDifficulty} />
  ) : (
    <RoomStandardGame play={play} list={list!} />
  )
}

function RoomStandardGame({ play, list }: { play: RoomPlay; list: unknown[] }) {
  const { difficulty = null, continent = null } = play.room.game
  const state = useGameState(difficulty, false, list, null, null, continent)
  return <PlacementGame state={state} difficulty={difficulty} continent={continent} isTraining={false} ascension={null} play={play} />
}

function RoomAscensionGame({ play, phases, byDifficulty }: { play: RoomPlay; phases: Record<string, number>; byDifficulty: Record<string, unknown[]> }) {
  const state = useAscensionState(GAME_TYPES.PLACEMENT, phases, false, true, byDifficulty)
  return <PlacementGame state={state} difficulty={null} continent={null} isTraining={false} ascension={{ presetName: null }} play={play} />
}

export default function PlacementScreen() {
  const params = useLocalSearchParams<Params>()
  const isTraining = params.training === '1'
  if (params.room) return <RoomGate code={params.room}>{(play) => <RoomGame play={play} />}</RoomGate>
  if (params.ascension) {
    return <AscensionGame phases={JSON.parse(params.ascension)} presetName={params.preset ?? null} isTraining={isTraining} />
  }
  return <StandardGame difficulty={params.difficulty ?? null} continent={params.continent ?? null} isTraining={isTraining} gameType={params.gameType ?? GAME_TYPES.PLACEMENT} />
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
