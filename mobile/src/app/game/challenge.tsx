// Daily Challenge: 12 rounds the same for every player (a country to tap, a flag to name, a capital to name), one try
// each, 20 s per round, no lives. Rules → rounds (components/survival/SurvivalRounds) → result, leaderboard and sharing.
// The run itself is the website's useDailyChallengeState.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useDailyChallengeState from '@shared/hooks/useDailyChallengeState'
import { useDailyPlayedElsewhere } from '@shared/hooks/useDailyPlayedElsewhere'
import { CHALLENGE_ROUND_EMOJI, CHALLENGE_TIMER, challengeShareGrid } from '@shared/utils/dailyChallenge'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCountryName } from '@shared/utils/getCountryName'

import { useAccount } from '@/account/auth'
import { ChallengeLeaderboard } from '@/components/game/ChallengeLeaderboard'
import { DailyPlayedElsewhere } from '@/components/game/DailyPlayedElsewhere'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { PlacementRound, TypedRound, roundAnswer, type Survival, type SurvivalRound } from '@/components/survival/SurvivalRounds'
import { Button, Text } from '@/components/ui'
import { DIFFICULTY_COLORS, getGameByType } from '@/games'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.daily_challenge

type Challenge = ReturnType<typeof useDailyChallengeState>
type Result = 'correct' | 'failed' | null

// What a round asked and its answer, for the result: "Paris (France)" for a capital
function answerLabel(round: SurvivalRound, lang: string, t: Parameters<typeof roundAnswer>[2]) {
  const answer = roundAnswer(round, lang, t)
  if (round.type !== GAME_TYPES.CAPITALS || !round.country) return answer
  const p = round.country.properties
  return `${answer} (${getCountryName(p.ISO_A2, lang) || p.ADMIN})`
}

function Playing({ challenge }: { challenge: Challenge }) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { round, roundIndex, total, score, timeLeftMs, outcome, timedOut, next, giveUp, submitText } = challenge
  if (!round) return null

  // The survival rounds read a few more fields than a challenge has: a round is a single try
  const survival = { ...challenge, guesses: [], chooseAnswer: () => null } as unknown as Survival
  const secondsLeft = timeLeftMs == null ? null : Math.ceil(timeLeftMs / 1000)
  const last = roundIndex === total - 1
  const isPlacement = round.type === GAME_TYPES.PLACEMENT
  const roundGame = getGameByType(round.type)
  const answer = roundAnswer(round, i18n.language, t)

  const outcomeBanner = outcome && (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={[styles.outcome, { borderColor: outcome === 'correct' ? colors.accent : colors.warning }]}>
      <Text variant="bodyStrong" color={outcome === 'correct' ? colors.accent : colors.warning} style={{ flex: 1 }}>
        {outcome === 'correct' ? t('survival.correct') : `${timedOut ? `${t('survival.time_up')} ` : ''}${t('survival.answer_was', { answer })}`}
      </Text>
      <Button
        label={t(last ? 'buttons.see_results' : 'survival.next')}
        variant="secondary"
        onPress={next}
        style={{ minHeight: 40, paddingHorizontal: space.lg }}
      />
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
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
            <View style={styles.roundHeader}>
              {roundGame && <MaterialCommunityIcons name={roundGame.icon} size={18} color={roundGame.color} />}
              <Text variant="label" color={roundGame?.color} style={{ flex: 1 }}>
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

      <GameTopBar>
        <HudPill icon="target" label={`${roundIndex + 1}/${total}`} color={ACCENT} />
        {secondsLeft != null && !outcome ? (
          <HudPill icon="timer-sand" label={`${secondsLeft} s`} color={secondsLeft <= 5 ? colors.danger : colors.text} />
        ) : (
          <HudPill icon="timer-outline" label={`${CHALLENGE_TIMER} s`} />
        )}
        <HudPill icon="star-four-points-outline" label={String(score)} color={colors.accent} />
      </GameTopBar>
    </View>
  )
}

function Rules({ challenge }: { challenge: Challenge }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { phase, resumed, start, level } = challenge
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <Text variant="label" color={ACCENT}>
          {t('mobile.home.daily')} · {t('games.daily_challenge.title')}
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
      <GameTopBar confirmQuit={false} />
    </View>
  )
}

function Done({ challenge }: { challenge: Challenge }) {
  const { t, i18n } = useTranslation()
  const { dailyKey, rounds, results, score, elapsedTime, total } = challenge
  const grid = useMemo(() => challengeShareGrid(rounds, results), [rounds, results])
  const time = formatTime(elapsedTime)
  const scoreText = `${score}/${total}`

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ResultsSheet
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
          {(rounds as SurvivalRound[]).map((round, index) => (
            <View key={index} style={styles.resultRow}>
              <Text variant="body">{CHALLENGE_ROUND_EMOJI[round.type as keyof typeof CHALLENGE_ROUND_EMOJI]}</Text>
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {answerLabel(round, i18n.language, t)}
              </Text>
              <Text variant="body">{results[index] === 'correct' ? '✅' : '❌'}</Text>
            </View>
          ))}
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
      <DailyPlayedElsewhere title={t('games.daily_challenge.title')} game={elsewhere.game} accent={ACCENT}>
        {dailyKey && <ChallengeLeaderboard dailyKey={dailyKey} />}
      </DailyPlayedElsewhere>
    )
  }
  if (phase === 'playing') return <Playing challenge={challenge} />
  if (phase === 'done') return <Done challenge={challenge} />
  return <Rules challenge={challenge} />
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
  card: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch', minHeight: 28 },
})
