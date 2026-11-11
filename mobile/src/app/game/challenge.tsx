// Daily Challenge: 12 rounds the same for every player (a country to tap, a flag to name, a capital to name), one try
// each, 20 s per round, no lives. Rules → rounds (components/survival/SurvivalRounds) → result, leaderboard and sharing.
// The run itself is the website's useDailyChallengeState.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useDailyChallengeState from '@shared/hooks/useDailyChallengeState'
import { useDailyPlayedElsewhere } from '@shared/hooks/useDailyPlayedElsewhere'
import { CHALLENGE_TIMER, challengeShareGrid } from '@shared/utils/dailyChallenge'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'

import { announce } from '@/a11y'
import { useAccount } from '@/account/auth'
import { ChallengeLeaderboard } from '@/components/game/ChallengeLeaderboard'
import { ChallengeRoundList } from '@/components/game/ChallengeRoundList'
import { DailyPlayedElsewhere } from '@/components/game/DailyPlayedElsewhere'
import { GameHud } from '@/components/game/GameHud'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { PlacementRound, TypedRound, roundAnswer, type Survival, type SurvivalRound } from '@/components/survival/SurvivalRounds'
import { clean } from '@/i18n'
import { Button, Text } from '@/components/ui'
import { useDifficultyColors, getGameByType } from '@/games'
import { navigate } from '@/shims/react-router-dom'
import GameEmblem from '@/components/GameEmblem'
import { type EscaleState } from '@/components/flight'
import { makeStyles, radius, space, useColors, useTheme } from '@/theme'

type Challenge = ReturnType<typeof useDailyChallengeState>
type Result = 'correct' | 'failed' | null

function Playing({ challenge }: { challenge: Challenge }) {
  const { gameColors } = useTheme()
  const styles = useStyles()
  const colors = useColors()
  const DIFFICULTY_COLORS = useDifficultyColors()
  const { t, i18n } = useTranslation()
  const { round, roundIndex, total, score, results, timeLeftMs, outcome, timedOut, giveUp, submitText } = challenge

  // Spoken: each round's result, then the timer turning red
  const fiveLeft = timeLeftMs != null && Math.ceil(timeLeftMs / 1000) === 5 && !outcome
  useEffect(() => {
    if (!outcome) return
    announce(outcome === 'correct' ? t('mobile.a11y.correct') : t('mobile.a11y.wrong_answer', { answer: roundAnswer(round, i18n.language, t) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, roundIndex])
  useEffect(() => {
    if (fiveLeft) announce(t('mobile.a11y.seconds_left', { count: 5 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiveLeft, roundIndex])
  if (!round) return null

  // The survival rounds read a few more fields than a challenge has: a round is a single try
  const survival = { ...challenge, guesses: [], chooseAnswer: () => null } as unknown as Survival
  const secondsLeft = timeLeftMs == null ? null : Math.ceil(timeLeftMs / 1000)
  const isPlacement = round.type === GAME_TYPES.PLACEMENT
  const roundGame = getGameByType(round.type)
  const answer = roundAnswer(round, i18n.language, t)
  const pad = (n: number) => String(n).padStart(2, '0')
  const states: EscaleState[] = Array.from({ length: total }, (_, index) => {
    const result = (results as Result[])[index]
    if (result) return result === 'correct' ? 'good' : 'bad'
    return index === roundIndex ? 'current' : 'todo'
  })

  const outcomeBanner = outcome && (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={[styles.outcome, { borderColor: outcome === 'correct' ? colors.accent : colors.warning }]}>
      <Text variant="bodyStrong" color={outcome === 'correct' ? colors.accent : colors.warning} style={{ flex: 1 }}>
        {outcome === 'correct' ? t('survival.correct') : `${timedOut ? `${t('survival.time_up')} ` : ''}${t('survival.answer_was', { answer })}`}
      </Text>
    </Animated.View>
  )

  const skipButton = !outcome && (
    <Button
      label={t('daily_challenge.skip')}
      variant="secondary"
      onPress={giveUp}
      icon={<MaterialCommunityIcons name="skip-next" size={18} color={colors.danger} />}
      style={{ minHeight: 44, alignSelf: 'flex-end', paddingHorizontal: space.lg }}
    />
  )

  return (
    <View style={{ flex: 1, backgroundColor: isPlacement ? colors.ocean : colors.bg }}>
      <View style={{ backgroundColor: colors.bg }}>
        <GameHud
          game="daily_challenge"
          title={t('games.daily_challenge.title')}
          tag={`${total} ${t('mobile.flight.stops')}`.toLocaleUpperCase()}
          gate=""
          confirmQuit
          cells={[
            { label: t('mobile.flight.stop').toLocaleUpperCase(), value: `${pad(roundIndex + 1)}/${total}`, color: colors.gold },
            { label: clean(t('labels.score')).replace(/\s*:$/, '').toUpperCase(), value: String(score) },
            {
              label: clean(t('labels.time')).replace(/\s*:$/, '').toUpperCase(),
              value: `00:${pad(secondsLeft != null && !outcome ? secondsLeft : CHALLENGE_TIMER)}`,
              color: secondsLeft != null && !outcome && secondsLeft <= 5 ? colors.danger : colors.accent,
            },
          ]}
          states={states}
          progressLabel={t('daily_challenge.round', { n: roundIndex + 1, total })}
        />
      </View>
      {isPlacement ? (
        <PlacementRound
          survival={survival}
          footer={
            <View style={{ gap: space.sm, marginTop: space.sm }}>
              {outcomeBanner}
              {skipButton}
            </View>
          }
        />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <View style={styles.roundHeader}>
              {roundGame && <GameEmblem game={roundGame.id} variant="glyph" size={18} color={gameColors[roundGame.id]} />}
              <Text variant="label" color={roundGame ? gameColors[roundGame.id] : undefined} style={{ flex: 1 }}>
                {t('daily_challenge.round', { n: roundIndex + 1, total })} · {t(`survival.round_type.${round.type}`)}
              </Text>
              <Text variant="label" color={DIFFICULTY_COLORS[round.difficulty]}>
                {t(`difficulties.${round.difficulty}`)}
              </Text>
            </View>
            <TypedRound key={roundIndex} survival={survival} onSubmit={submitText} />
            {outcomeBanner}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

    </View>
  )
}

function Rules({ challenge }: { challenge: Challenge }) {
  const styles = useStyles()
  const colors = useColors()
  const ACCENT = useTheme().gameColors.daily_challenge
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { phase, resumed, start, level } = challenge
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GameHud game="daily_challenge" title={t('games.daily_challenge.title')} tag={`${challenge.total ?? 12} ${t('mobile.flight.stops')}`.toLocaleUpperCase()} gate="" confirmQuit={false} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
        <Text variant="label" color={ACCENT}>
          {t('mobile.home.daily')}
        </Text>
        {phase === 'loading' ? (
          <Text variant="caption">{t('messages.loading')}</Text>
        ) : (
          <View style={styles.card}>
            <MaterialCommunityIcons name="target" size={40} color={ACCENT} />
            <Text variant="body" style={{ textAlign: 'center' }}>
              {t('daily_challenge.rules', { seconds: CHALLENGE_TIMER })}
            </Text>
            {level != null && (
              <View style={{ alignItems: 'center', gap: space.xs }}>
                <Text variant="body" color={colors.warning} style={{ textAlign: 'center', fontWeight: '700' }}>
                  {'●'.repeat(level)}{'○'.repeat(7 - level)}{'  '}
                  {t('daily_challenge.level', { label: t(`daily_challenge.levels.${level}`), n: level })}
                </Text>
                <Text variant="caption" style={{ textAlign: 'center' }}>
                  {t('daily_challenge.week_note')}
                </Text>
              </View>
            )}
            {resumed && (
              <Text variant="caption" color={colors.warning} style={{ textAlign: 'center' }}>
                {t('daily_challenge.resumed_note')}
              </Text>
            )}
            <Button
              label={t(resumed ? 'daily_challenge.continue' : 'daily_challenge.start')}
              color={ACCENT}
              onPress={start}
              icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
              style={{ alignSelf: 'stretch', marginTop: space.sm }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Done({ challenge }: { challenge: Challenge }) {
  const styles = useStyles()
  const colors = useColors()
  const ACCENT = useTheme().gameColors.daily_challenge
  const { t } = useTranslation()
  const { dailyKey, rounds, results, score, elapsedTime, total } = challenge
  const grid = useMemo(() => challengeShareGrid(rounds, results), [rounds, results])
  const time = formatTime(elapsedTime)
  const scoreText = `${score}/${total}`

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ResultsSheet
        game="daily_challenge"
        ticketNote={`${t('mobile.home.daily')} · ${total} ${t('mobile.flight.stops')}`}
        states={(results as Result[]).map((result) => (result === 'correct' ? 'good' : 'bad'))}
        title={t('daily_challenge.result_title')}
        score={score}
        scoreText={scoreText}
        scoreLabel={t('daily_challenge.score_label')}
        accent={ACCENT}
        stats={[{ label: t('daily_challenge.time_label'), value: time }]}
        save={{ kind: 'challenge', dailyKey, elapsedTime: Math.round(elapsedTime), results: (results as Result[]).map((result) => result === 'correct') }}
        record={{
          gameType: GAME_TYPES.DAILY_CHALLENGE,
          mode: 'daily',
          dailyKey,
          score,
          correct: score,
          answered: total,
          total,
          errors: total - score,
          elapsedTime: Math.round(elapsedTime),
          solved: true,
        }}
        share={{
          gameType: GAME_TYPES.DAILY_CHALLENGE,
          difficulty: 'Daily',
          scoreLabel: t('daily_challenge.share_label'),
          scoreText,
          details: t('daily_challenge.share_time', { time }),
          grid,
          challenge: { route: '/challenge', dailyKey, solved: true },
        }}
        onHome={() => navigate('/')}>
        <View style={styles.card}>
          <Text variant="bodyStrong" style={{ alignSelf: 'flex-start' }}>
            {t('daily_challenge.rounds_title')}
          </Text>
          <ChallengeRoundList rounds={rounds as SurvivalRound[]} rights={results.map((result: Result) => result === 'correct')} />
          <Text variant="caption" style={{ textAlign: 'center', marginTop: space.sm }}>
            {t('daily_challenge.come_back')}
          </Text>
        </View>
        <ChallengeLeaderboard dailyKey={dailyKey} />
      </ResultsSheet>
    </View>
  )
}

export default function ChallengeScreen() {
  const ACCENT = useTheme().gameColors.daily_challenge
  const { t } = useTranslation()
  const challenge = useDailyChallengeState()
  const { dailyKey, phase } = challenge
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.DAILY_CHALLENGE,
    dailyKey,
    started: phase === 'playing' || phase === 'done' || challenge.resumed,
  })

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere gameId="daily_challenge" title={t('games.daily_challenge.title')} game={elsewhere.game} accent={ACCENT}>
        {dailyKey && <ChallengeLeaderboard dailyKey={dailyKey} />}
      </DailyPlayedElsewhere>
    )
  }
  if (phase === 'playing') return <Playing challenge={challenge} />
  if (phase === 'done') return <Done challenge={challenge} />
  return <Rules challenge={challenge} />
}

const useStyles = makeStyles((colors) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl, gap: space.lg },
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
  card: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
}))
