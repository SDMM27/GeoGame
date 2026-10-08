// "Survie": rounds of the chosen games one after another until no life is left (solo, or in a multiplayer room).
// Game rules come from the website hooks (useSurvivalState, and useSurvivalSync for the round by round play of
// live rooms); each round is drawn in components/survival/SurvivalRounds.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useMultiplayerRoom from '@shared/hooks/useMultiplayerRoom'
import useSurvivalState from '@shared/hooks/useSurvivalState'
import useSurvivalSync from '@shared/hooks/useSurvivalSync'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { progressForGame } from '@shared/utils/multiplayerRoom'
import { loadSnapshot, snapshotKey } from '@shared/utils/multiplayerSnapshot'
import { serverNow } from '@shared/utils/serverTime'
import {
  DEFAULT_SURVIVAL_LIVES,
  DEFAULT_SURVIVAL_TIMER,
  SURVIVAL_LIVES,
  SURVIVAL_ROUND_TYPES,
  SURVIVAL_TIMERS,
  matchSurvivalRamp,
  normalizeSurvivalRamp,
  parseSurvivalModes,
  survivalModesKey,
} from '@shared/utils/survivalConfig'
import { SURVIVAL_LATE_MS } from '@shared/utils/survivalSync'

import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import {
  BORDER_POOL,
  BorderRound,
  GuessRoundInput,
  PlacementRound,
  QuizRound,
  TypedRound,
  roundAnswer,
  type Survival,
} from '@/components/survival/SurvivalRounds'
import { Button, Text } from '@/components/ui'
import { DIFFICULTY_COLORS, getGameByType } from '@/games'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { RoomGate, RoomHudPill, Standings, type RoomPlay } from '@/multiplayer/RoomPlay'
import { getPlayerId, type PlayerProgress } from '@/multiplayer/room'
import { navigate } from '@/shims/react-router-dom'
import { toast } from '@/shims/react-toastify'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.survival
const NO_ENTRIES: unknown[] = []
const newSeed = () => Math.floor(Math.random() * 2 ** 31)

function parseRamp(value?: string) {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

// Live rooms: the room's start and its players' progress, to play round by round
type Sync = { startAt: number; entries: unknown[] }

type RunProps = {
  modes: string[]
  lives: number
  timer: number
  // How fast the difficulty rises ({ Facile, Moyen, Difficile }, see SURVIVAL_RAMPS)
  ramp: Record<string, number>
  seed: number
  snapshot?: unknown
  snapKey?: string | null
  play?: RoomPlay
  sync?: Sync | null
  onReplay?: () => void
}

function SurvivalRun({ modes, lives, timer, ramp, seed, snapshot = null, snapKey = null, play, sync = null, onReplay }: RunProps) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const keyboardVisible = useKeyboardVisible()
  const synced = Boolean(sync)
  const shared = useSurvivalSync({ enabled: synced, startAt: sync?.startAt ?? 0, timer, entries: sync?.entries ?? NO_ENTRIES })
  const state = useSurvivalState({
    modes,
    lives,
    timer,
    ramp,
    seed,
    snapshot,
    snapshotKey: snapKey,
    extraSnapshot: { synced },
    autoAdvance: !synced,
    deadline: shared.deadline,
  })
  const { round, roundIndex, totalRounds, score, errors, outcome, timedOut, isOver, isWon, elapsedMs, timeLeftMs, next, goTo } = state

  // Live room: everyone moves on together
  useEffect(() => {
    if (synced && shared.round > roundIndex) goTo(shared.round)
  }, [synced, shared.round, roundIndex, goTo])

  // Feedback of an answer: a life lost, a name that isn't a country, a repeated pick
  const notify = useCallback(
    (result: string | null) => {
      if (result === 'wrong') toast.error(t('survival.life_lost'))
      else if (result === 'unknown') toast.info(t('survival.not_a_country'))
      else if (result === 'repeat') toast.info(t('toasts.already_proposed'))
      return result
    },
    [t]
  )
  const survival: Survival = {
    ...state,
    clickCountry: (name: string) => notify(state.clickCountry(name)),
    chooseAnswer: (id: string) => notify(state.chooseAnswer(id)),
    submitText: (text: string) => notify(state.submitText(text)),
  }
  const onSubmit = survival.submitText

  // Multiplayer: rounds cleared and lives left (and the round played, in a live room), then the result
  const reportFound = play?.reportFound
  const roundDone = Boolean(outcome)
  const inSharedRound = synced && roundIndex === shared.round
  useEffect(() => {
    if (!reportFound || (synced && !inSharedRound)) return
    reportFound(score, { lives: state.lives, ...(synced && { round: roundIndex, roundAt: shared.startAt, roundDone }) })
  }, [reportFound, synced, inSharedRound, score, state.lives, roundIndex, shared.startAt, roundDone])
  useEffect(() => {
    if (isOver) play?.finish({ weightedScore: score, countriesSolved: score, attempts: errors, elapsedTime: Math.round(elapsedMs) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOver])

  const roundGame = round ? getGameByType(round.type) : null
  const modesKey = survivalModesKey(modes)
  // Only the preset ramps are ranked
  const rampName: string | null = matchSurvivalRamp(ramp)
  const answer = roundAnswer(round, i18n.language, t)
  const secondsLeft = timeLeftMs == null ? null : Math.ceil(timeLeftMs / 1000)

  const outcomeBanner = outcome && !isOver && (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={[styles.outcome, { borderColor: outcome === 'correct' ? colors.accent : colors.warning }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={outcome === 'correct' ? colors.accent : colors.warning}>
          {outcome === 'correct'
            ? t('survival.correct')
            : `${timedOut ? `${t('survival.time_up')} ` : ''}${t('survival.answer_was', { answer })}`}
        </Text>
        {synced && (
          <Text variant="caption">{t('survival.waiting_players', { done: shared.waiting.done, total: shared.waiting.total })}</Text>
        )}
      </View>
      {!synced && <Button label={t('survival.next')} variant="secondary" onPress={next} style={{ minHeight: 40, paddingHorizontal: space.lg }} />}
    </Animated.View>
  )

  const giveUpButton = !outcome && (
    <Button
      label={t('survival.give_up')}
      variant="secondary"
      onPress={state.giveUp}
      icon={<MaterialCommunityIcons name="skip-next" size={18} color={colors.danger} />}
      style={{ minHeight: 44, alignSelf: 'flex-end', paddingHorizontal: space.lg }}
    />
  )

  const header = round && roundGame && (
    <View style={styles.roundHeader}>
      <MaterialCommunityIcons name={roundGame.icon} size={18} color={roundGame.color} />
      <Text variant="label" color={roundGame.color} style={{ flex: 1 }}>
        {t('survival.round', { n: roundIndex + 1 })} · {t(`survival.round_type.${round.type}`)}
      </Text>
      <Text variant="label" color={DIFFICULTY_COLORS[round.difficulty]}>
        {t(`difficulties.${round.difficulty}`)}
      </Text>
    </View>
  )

  const isPlacement = round?.type === GAME_TYPES.PLACEMENT
  const isBorder = round?.type === GAME_TYPES.BORDER_GUESS

  return (
    <View style={{ flex: 1, backgroundColor: isPlacement ? colors.ocean : colors.bg }}>
      {round && isPlacement && (
        <PlacementRound
          survival={survival}
          footer={
            <View style={{ gap: space.sm, marginTop: space.sm }}>
              {outcomeBanner}
              {giveUpButton}
            </View>
          }
        />
      )}

      {round && !isPlacement && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
            {header}
            {round.type === GAME_TYPES.FLAGS || round.type === GAME_TYPES.CAPITALS ? (
              <TypedRound key={roundIndex} survival={survival} onSubmit={onSubmit} />
            ) : isBorder ? (
              <BorderRound survival={survival} height={Math.max(150, Math.round(windowHeight * (keyboardVisible ? 0.22 : 0.32)))} />
            ) : (
              <>
                <QuizRound key={roundIndex} survival={survival} />
                {giveUpButton}
              </>
            )}
            {outcomeBanner}
          </ScrollView>
          {isBorder && !isOver && <GuessRoundInput key={roundIndex} survival={survival} pool={BORDER_POOL} onSubmit={onSubmit} />}
        </KeyboardAvoidingView>
      )}

      {!isOver && (
        <GameTopBar onQuit={play?.exit}>
          {play && <RoomHudPill code={play.room.id} gameIndex={play.room.gameIndex} />}
          <HudPill icon="heart" label={`${state.lives}/${lives}`} color={ACCENT} />
          {secondsLeft != null && !outcome ? (
            <HudPill icon="timer-sand" label={`${secondsLeft} s`} color={secondsLeft <= 5 ? colors.danger : colors.text} />
          ) : (
            <HudPill icon="timer-outline" label={formatTime(elapsedMs).slice(0, 5)} />
          )}
          <HudPill icon="star-four-points-outline" label={String(score)} color={colors.accent} />
        </GameTopBar>
      )}

      {isOver && (
        <ResultsSheet
          title={isWon ? t('survival.victory') : t('survival.game_over')}
          score={score}
          scoreLabel={t('survival.rounds_survived')}
          accent={ACCENT}
          stats={[
            ...(isWon ? [] : [{ label: t('survival.missed_answer'), value: answer, color: colors.warning }]),
            { label: t('mobile.game.time'), value: formatTime(elapsedMs).slice(0, 5) },
            { label: t('survival.lives_at_start'), value: `${lives} ❤️` },
          ]}
          save={
            play || score === 0 || !rampName
              ? null
              : { kind: 'survival', modes: modesKey, lives, timer, ramp: rampName, elapsedTime: Math.round(elapsedMs) }
          }
          record={
            play
              ? { gameType: GAME_TYPES.SURVIVAL, mode: 'multi', roomCode: play.room.id, score, total: totalRounds, elapsedTime: elapsedMs }
              : { gameType: GAME_TYPES.SURVIVAL, mode: 'survival', score, total: totalRounds, errors, lives, elapsedTime: elapsedMs, difficulty: modesKey }
          }
          onReplay={onReplay}
          onHome={play?.exit ?? (() => navigate('/'))}
          homeLabel={play ? t('mobile.multi.back_to_room') : undefined}>
          {play && <Standings code={play.room.id} gameIndex={play.room.gameIndex} />}
          {!play && !rampName && (
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {t('survival.ramp_custom_hint')}
            </Text>
          )}
        </ResultsSheet>
      )}
    </View>
  )
}

function SoloRun({ modes, lives, timer, ramp }: { modes: string[]; lives: number; timer: number; ramp: Record<string, number> }) {
  const [seed, setSeed] = useState(newSeed)
  return <SurvivalRun key={seed} modes={modes} lives={lives} timer={timer} ramp={ramp} seed={seed} onReplay={() => setSeed(newSeed())} />
}

function RoomRun({ play }: { play: RoomPlay }) {
  const { game, seed, id, gameIndex, mode } = play.room
  const snapKey = snapshotKey(id, getPlayerId(), gameIndex)
  const [snapshot] = useState(() => loadSnapshot(snapKey))
  const startAt: number | null = play.room.startAt?.toMillis ? play.room.startAt.toMillis() : null
  // Live room: the players who start the game together play it round by round (late ones play it on their own)
  const [synced] = useState(
    () => mode === 'live' && startAt != null && (snapshot ? Boolean(snapshot.synced) : serverNow() - startAt < SURVIVAL_LATE_MS)
  )
  const { progress } = useMultiplayerRoom(synced ? id : null) as { progress: Record<string, PlayerProgress & { lastSeen?: { toMillis?: () => number } }> }
  const entries = useMemo(
    () =>
      Object.values(progressForGame(progress, gameIndex) as typeof progress).map((entry) => ({
        ...entry,
        lastSeen: entry.lastSeen?.toMillis ? entry.lastSeen.toMillis() : null,
      })),
    [progress, gameIndex]
  )
  return (
    <SurvivalRun
      modes={parseSurvivalModes(game.modes)}
      lives={game.lives ?? DEFAULT_SURVIVAL_LIVES}
      timer={game.timer ?? 0}
      ramp={normalizeSurvivalRamp(game.ramp)}
      seed={seed}
      snapshot={snapshot}
      snapKey={snapKey}
      play={play}
      sync={synced && startAt != null ? { startAt, entries } : null}
    />
  )
}

export default function SurvivalScreen() {
  const params = useLocalSearchParams<{ modes?: string; lives?: string; timer?: string; ramp?: string; room?: string }>()
  if (params.room) return <RoomGate code={params.room}>{(play) => <RoomRun play={play} />}</RoomGate>
  const modes = parseSurvivalModes(params.modes)
  const lives = Number(params.lives)
  const timer = Number(params.timer ?? DEFAULT_SURVIVAL_TIMER)
  return (
    <SoloRun
      modes={modes.length ? modes : SURVIVAL_ROUND_TYPES}
      lives={SURVIVAL_LIVES.includes(lives) ? lives : DEFAULT_SURVIVAL_LIVES}
      timer={SURVIVAL_TIMERS.includes(timer) ? timer : DEFAULT_SURVIVAL_TIMER}
      ramp={normalizeSurvivalRamp(parseRamp(params.ramp))}
    />
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  roundHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  outcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
})
