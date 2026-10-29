// Le Pays du jour: the same country for everyone, found in 4 steps (borders, flag, capital, place on the map), then its
// sheet. Rules and progress come from the shared useCountryOfDayState; this file is the screen.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useCountryOfDayState from '@shared/hooks/useCountryOfDayState'
import { useDailyPlayedElsewhere } from '@shared/hooks/useDailyPlayedElsewhere'
import { COUNTRY_OF_DAY_MAX_SCORE, COUNTRY_OF_DAY_STEPS, countryOfDayShareLine, stepPoints } from '@shared/utils/countryOfDay'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'

import { announce } from '@/a11y'
import { useAccount } from '@/account/auth'
import { ChoiceList, FlagGrid } from '@/components/countryOfDay/Choices'
import { CountryOfDayLeaderboard } from '@/components/countryOfDay/CountryOfDayLeaderboard'
import { CountrySheet } from '@/components/countryOfDay/CountrySheet'
import { ModePicker } from '@/components/countryOfDay/ModePicker'
import { PlacementStep } from '@/components/countryOfDay/PlacementStep'
import { ScoreSaveCard } from '@/components/countryOfDay/ScoreSaveCard'
import { StepFeedback } from '@/components/countryOfDay/StepFeedback'
import { answerLabel, capitalLabel, countryLabel } from '@/components/countryOfDay/labels'
import { DailyPlayedElsewhere } from '@/components/game/DailyPlayedElsewhere'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { BorderGuessRow, type BorderGuess } from '@/components/game/GuessCards'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { CountrySilhouette } from '@/components/map/CountrySilhouette'
import { Text } from '@/components/ui'
import { getFlag } from '@/flags'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.country_of_day ?? gameColors.border_guess
const STEP_COUNT = COUNTRY_OF_DAY_STEPS.length

type Game = ReturnType<typeof useCountryOfDayState>
type Note = { stepIndex: number; kind: 'wrong' | 'unknown' | 'ignored' }

// A wrong typed answer of the borders step, as a Border Guess row
const asGuess = (entry: BorderGuess | string): BorderGuess =>
  typeof entry === 'string' ? { value: entry, iso: null, isCorrect: false, distanceKm: null, direction: null, directionArrow: null } : { ...entry, isCorrect: false }

function Playing({ game }: { game: Game }) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const { country, mode, step, stepIndex, choices, wrong, triesLeft, resolved, found, steps, score, answer, next } = game
  const [text, setText] = useState('')
  const [note, setNote] = useState<Note | null>(null)
  const lang = i18n.language
  const target = country.properties.ADMIN
  const last = stepIndex === STEP_COUNT - 1
  const typed = choices == null && step !== 'placement'
  const correct = answerLabel(step, country, lang)

  // One answer from a button, the map or the input; the wrong typed text is emptied, an unknown one is kept to fix
  const submit = (value: string) => {
    const outcome = answer(value) as 'right' | 'wrong' | 'unknown' | 'ignored'
    setNote(outcome === 'right' ? null : { stepIndex, kind: outcome })
    if (outcome !== 'unknown') setText('')
    if (outcome === 'wrong') announce(t('mobile.a11y.wrong'))
  }

  // Spoken: the result of the step
  useEffect(() => {
    if (resolved) announce(found ? t('mobile.a11y.correct') : t('mobile.a11y.wrong_answer', { answer: correct }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, stepIndex])

  const shown = !resolved && note?.stepIndex === stepIndex ? note : null
  const noteText = shown && t(shown.kind === 'wrong' ? 'country_of_day.wrong' : shown.kind === 'unknown' ? 'country_of_day.unknown_country' : 'country_of_day.already_tried')

  const feedback = resolved && (
    <StepFeedback
      found={found}
      points={stepPoints(steps[stepIndex], mode)}
      answer={correct}
      nextLabel={t(last ? 'country_of_day.see_sheet' : 'country_of_day.next')}
      onNext={next}
    />
  )
  const header = (
    <View style={{ gap: 2 }}>
      <View style={styles.headerRow}>
        <Text variant="label" color={ACCENT}>
          {t('country_of_day.step', { n: stepIndex + 1, total: STEP_COUNT })}
        </Text>
        {!resolved && (
          <Text variant="caption" color={triesLeft === 1 ? colors.warning : undefined}>
            {t('country_of_day.tries_left', { count: triesLeft })}
          </Text>
        )}
      </View>
      <Text variant="heading">{t(`country_of_day.step_${step}`)}</Text>
    </View>
  )
  // From the second step on the country is known: name it (the flag step keeps the flag secret)
  const identity = stepIndex > 0 && (
    <View style={styles.identity}>
      {step !== 'flag' && getFlag(country.properties.ISO_A2) && (
        <Image source={getFlag(country.properties.ISO_A2)} contentFit="cover" style={styles.identityFlag} accessible={false} alt="" />
      )}
      <Text variant="bodyStrong" color={colors.accent}>
        {countryLabel(country, lang)}
      </Text>
    </View>
  )

  const hud = (
    <GameTopBar>
      <HudPill icon="target" label={`${stepIndex + 1}/${STEP_COUNT}`} color={ACCENT} />
      <HudPill icon="star-four-points-outline" label={String(score)} color={colors.accent} />
    </GameTopBar>
  )

  if (step === 'placement') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ocean }}>
        <PlacementStep
          country={country}
          wrong={wrong as string[]}
          resolved={resolved}
          found={found}
          onPick={submit}
          bottomInset={Math.round(windowHeight * 0.4)}>
          {header}
          {identity}
          {!resolved && <Text variant="caption">{t('country_of_day.placement_hint')}</Text>}
          {noteText && <Text variant="caption" color={colors.danger}>{noteText}</Text>}
          {feedback}
        </PlacementStep>
        {hud}
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
          {header}
          {identity}
          {step === 'borders' && (
            <View style={[styles.silhouette, { height: Math.max(170, Math.round(windowHeight * 0.3)) }]}>
              <CountrySilhouette country={country} color={ACCENT} style={{ flex: 1 }} />
            </View>
          )}
          {choices && step === 'flag' && <FlagGrid choices={choices} wrong={wrong as string[]} target={target} resolved={resolved} onPick={submit} />}
          {choices && step !== 'flag' && (
            <ChoiceList
              choices={choices}
              wrong={wrong as string[]}
              target={target}
              resolved={resolved}
              onPick={submit}
              label={(choice) => (step === 'capital' ? capitalLabel(choice, lang) : countryLabel(choice, lang))}
            />
          )}
          {typed && step === 'borders' &&
            (wrong as (BorderGuess | string)[]).map((entry, index, list) => (
              <BorderGuessRow key={`${asGuess(entry).value}-${index}`} guess={asGuess(entry)} index={index} latest={index === list.length - 1} />
            ))}
          {typed && step === 'capital' &&
            (wrong as string[]).map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.wrongRow}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.danger} />
                <Text variant="bodyStrong">{entry}</Text>
              </View>
            ))}
          {noteText && <Text variant="caption" color={colors.danger}>{noteText}</Text>}
          {feedback}
        </ScrollView>
        {typed && !resolved && (
          <GuessInputBar
            value={text}
            onChangeText={setText}
            onSubmit={() => text.trim() && submit(text)}
            suggestions={[]}
            locked={false}
            placeholder={t(step === 'capital' ? 'country_of_day.placeholder_capital' : 'country_of_day.placeholder_country')}
            accent={ACCENT}
          />
        )}
      </KeyboardAvoidingView>
      {hud}
    </View>
  )
}

function Done({ game }: { game: Game }) {
  const { t, i18n } = useTranslation()
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)
  const { dailyKey, country, mode, steps, score, attempts, errors, solved } = game
  const elapsed = Math.round(game.elapsedTime ?? 0)
  const max = COUNTRY_OF_DAY_MAX_SCORE[mode as 'choice' | 'free']
  const modeLabel = t(`country_of_day.mode_${mode}`)
  const line = countryOfDayShareLine(steps)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ResultsSheet
        title={countryLabel(country, i18n.language)}
        score={score}
        scoreText={`${score}/${max}`}
        scoreLabel={t('units.pts')}
        accent={ACCENT}
        stats={[{ label: t('mobile.game.time'), value: formatTime(elapsed).slice(0, 5) }]}
        record={{ gameType: GAME_TYPES.COUNTRY_OF_DAY, mode: 'daily', dailyKey, score, attempts, errors, solved, elapsedTime: elapsed }}
        share={{
          gameType: GAME_TYPES.COUNTRY_OF_DAY,
          difficulty: 'Daily',
          scoreLabel: t('units.pts'),
          scoreText: `${score}/${max}`,
          details: `${modeLabel} · ${formatTime(elapsed).slice(0, 5)}`,
          grid: line,
        }}
        onHome={() => navigate('/')}>
        <ScoreSaveCard dailyKey={dailyKey!} mode={mode!} steps={steps} score={score} elapsedTime={elapsed} onSaved={() => setLeaderboardVersion((v) => v + 1)} />
        <View style={styles.summary}>
          <Text variant="heading">{line}</Text>
          <Text variant="caption">{t('country_of_day.mode_played', { mode: modeLabel.toLowerCase() })}</Text>
        </View>
        <CountrySheet country={country} />
        <CountryOfDayLeaderboard dailyKey={dailyKey!} refreshKey={leaderboardVersion} />
        <Text variant="caption" style={{ textAlign: 'center' }}>
          {t('country_of_day.come_back')}
        </Text>
      </ResultsSheet>
    </View>
  )
}

export default function CountryOfTheDayScreen() {
  const { t } = useTranslation()
  const game = useCountryOfDayState()
  const { dailyKey, phase } = game
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.COUNTRY_OF_DAY,
    dailyKey,
    started: phase === 'playing' || phase === 'done',
  })

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={t('games.country_of_day.title')} game={elsewhere.game} accent={ACCENT}>
        {dailyKey && <CountryOfDayLeaderboard dailyKey={dailyKey} />}
      </DailyPlayedElsewhere>
    )
  }
  if (phase === 'playing') return <Playing game={game} />
  if (phase === 'done') return <Done game={game} />
  return <ModePicker accent={ACCENT} loading={phase === 'loading'} onChoose={game.chooseMode} />
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  identityFlag: { width: 32, height: 21, borderRadius: 3 },
  silhouette: { borderRadius: radius.xl, backgroundColor: colors.ocean, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  summary: { alignItems: 'center', gap: 2, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  wrongRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
})
