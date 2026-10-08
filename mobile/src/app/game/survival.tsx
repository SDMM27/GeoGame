// "Survie": rounds of the chosen games one after another until no life is left (solo, or in a multiplayer room).
// Game rules come from the website hook (useSurvivalState); each round is drawn in components/survival/SurvivalRounds.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useSurvivalState from '@shared/hooks/useSurvivalState'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { loadSnapshot, snapshotKey } from '@shared/utils/multiplayerSnapshot'
import {
  DEFAULT_SURVIVAL_LIVES,
  SURVIVAL_LIVES,
  SURVIVAL_ROUND_TYPES,
  parseSurvivalModes,
  survivalModesKey,
} from '@shared/utils/survivalConfig'

import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import {
  BORDER_POOL,
  BorderRound,
  CLUE_POOL,
  ClueRound,
  GuessRoundInput,
  PlacementRound,
  QuizRound,
  TypedRound,
  roundAnswer,
  type Survival,
} from '@/components/survival/SurvivalRounds'
import { Button, Text } from '@/components/ui'
import { getGameByType } from '@/games'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { RoomGate, RoomHudPill, Standings, type RoomPlay } from '@/multiplayer/RoomPlay'
import { getPlayerId } from '@/multiplayer/room'
import { navigate } from '@/shims/react-router-dom'
import { toast } from '@/shims/react-toastify'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.survival
const newSeed = () => Math.floor(Math.random() * 2 ** 31)

type RunProps = {
  modes: string[]
  lives: number
  seed: number
  snapshot?: unknown
  snapKey?: string | null
  play?: RoomPlay
  onReplay?: () => void
}

function SurvivalRun({ modes, lives, seed, snapshot = null, snapKey = null, play, onReplay }: RunProps) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const keyboardVisible = useKeyboardVisible()
  const state = useSurvivalState({ modes, lives, seed, snapshot, snapshotKey: snapKey })
  const { round, roundIndex, totalRounds, score, errors, outcome, isOver, isWon, elapsedMs, next } = state

  // Feedback of an answer: a life lost, a name that isn't a country, a repeated guess
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

  // Multiplayer: rounds cleared and lives left as they change, then the result
  const reportFound = play?.reportFound
  useEffect(() => {
    reportFound?.(score, state.lives)
  }, [reportFound, score, state.lives])
  useEffect(() => {
    if (isOver) play?.finish({ weightedScore: score, countriesSolved: score, attempts: errors, elapsedTime: Math.round(elapsedMs) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOver])

  const roundGame = round ? getGameByType(round.type) : null
  const modesKey = survivalModesKey(modes)
  const answer = roundAnswer(round, i18n.language, t)

  const outcomeBanner = outcome && !isOver && (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={[styles.outcome, { borderColor: outcome === 'correct' ? colors.accent : colors.warning }]}>
      <Text variant="bodyStrong" color={outcome === 'correct' ? colors.accent : colors.warning} style={{ flex: 1 }}>
        {outcome === 'correct' ? t('survival.correct') : t('survival.answer_was', { answer })}
      </Text>
      <Button label={t('survival.next')} variant="secondary" onPress={next} style={{ minHeight: 40, paddingHorizontal: space.lg }} />
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
      <Text variant="label" color={roundGame.color}>
        {t('survival.round', { n: roundIndex + 1 })} · {t(`survival.round_type.${round.type}`)}
      </Text>
    </View>
  )

  const isPlacement = round?.type === GAME_TYPES.PLACEMENT
  const isGuess = round?.type === GAME_TYPES.BORDER_GUESS || round?.type === GAME_TYPES.COUNTRY_CLUE

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
            {/* Guess rounds: on top, the list of guesses below can be long */}
            {isGuess && outcomeBanner}
            {round.type === GAME_TYPES.FLAGS || round.type === GAME_TYPES.CAPITALS ? (
              <TypedRound key={roundIndex} survival={survival} onSubmit={onSubmit} />
            ) : round.type === GAME_TYPES.BORDER_GUESS ? (
              <BorderRound survival={survival} height={Math.max(150, Math.round(windowHeight * (keyboardVisible ? 0.22 : 0.32)))} />
            ) : round.type === GAME_TYPES.COUNTRY_CLUE ? (
              <ClueRound survival={survival} />
            ) : (
              <>
                <QuizRound key={roundIndex} survival={survival} />
                {giveUpButton}
              </>
            )}
            {!isGuess && outcomeBanner}
          </ScrollView>
          {isGuess && !isOver && (
            <GuessRoundInput
              key={roundIndex}
              survival={survival}
              pool={round.type === GAME_TYPES.BORDER_GUESS ? BORDER_POOL : CLUE_POOL}
              onSubmit={onSubmit}
            />
          )}
        </KeyboardAvoidingView>
      )}

      {!isOver && (
        <GameTopBar onQuit={play?.exit}>
          {play && <RoomHudPill code={play.room.id} gameIndex={play.room.gameIndex} />}
          <HudPill icon="heart" label={`${state.lives}/${lives}`} color={ACCENT} />
          <HudPill icon="timer-outline" label={formatTime(elapsedMs).slice(0, 5)} />
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
          save={play || score === 0 ? null : { kind: 'survival', modes: modesKey, lives, elapsedTime: Math.round(elapsedMs) }}
          record={
            play
              ? { gameType: GAME_TYPES.SURVIVAL, mode: 'multi', roomCode: play.room.id, score, total: totalRounds, elapsedTime: elapsedMs }
              : { gameType: GAME_TYPES.SURVIVAL, mode: 'survival', score, total: totalRounds, errors, lives, elapsedTime: elapsedMs, difficulty: modesKey }
          }
          onReplay={onReplay}
          onHome={play?.exit ?? (() => navigate('/'))}
          homeLabel={play ? t('mobile.multi.back_to_room') : undefined}>
          {play && <Standings code={play.room.id} gameIndex={play.room.gameIndex} />}
        </ResultsSheet>
      )}
    </View>
  )
}

function SoloRun({ modes, lives }: { modes: string[]; lives: number }) {
  const [seed, setSeed] = useState(newSeed)
  return <SurvivalRun key={seed} modes={modes} lives={lives} seed={seed} onReplay={() => setSeed(newSeed())} />
}

function RoomRun({ play }: { play: RoomPlay }) {
  const { game, seed, id, gameIndex } = play.room
  const snapKey = snapshotKey(id, getPlayerId(), gameIndex)
  const [snapshot] = useState(() => loadSnapshot(snapKey))
  return (
    <SurvivalRun
      modes={parseSurvivalModes(game.modes)}
      lives={game.lives ?? DEFAULT_SURVIVAL_LIVES}
      seed={seed}
      snapshot={snapshot}
      snapKey={snapKey}
      play={play}
    />
  )
}

export default function SurvivalScreen() {
  const params = useLocalSearchParams<{ modes?: string; lives?: string; room?: string }>()
  if (params.room) return <RoomGate code={params.room}>{(play) => <RoomRun play={play} />}</RoomGate>
  const modes = parseSurvivalModes(params.modes)
  const lives = Number(params.lives)
  return <SoloRun modes={modes.length ? modes : SURVIVAL_ROUND_TYPES} lives={SURVIVAL_LIVES.includes(lives) ? lives : DEFAULT_SURVIVAL_LIVES} />
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
