// "Country Clue": find the mystery country from distance, direction, hemisphere, area and population hints.
// Daily (shared country) or infinite. Game rules come from the website hook (useCountryClueState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useCountryClueState from '@shared/hooks/useCountryClueState'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCapitalName, getCountryName } from '@shared/utils/getCountryName'

import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { GuessesMap } from '@/components/map/GuessesMap'
import { Button, Text } from '@/components/ui'
import { getFlag } from '@/flags'
import { useElapsed } from '@/hooks/useElapsed'
import { clean } from '@/i18n'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.country_clue

type Tone = 'match' | 'higher' | 'lower' | 'neutral'
type Hint = { arrow: string; tone: Tone }
type Guess = {
  value: string
  isoA2: string | null
  isCorrect: boolean
  distanceKm: number | null
  direction: string | null
  directionArrow: string
  hemisphereHint: Hint
  areaHint: Hint
  areaLabel: string
  populationHint: Hint
  populationLabel: string
}

const TONE_COLORS: Record<Tone, string> = {
  match: colors.accent,
  higher: colors.warning,
  lower: colors.warning,
  neutral: colors.textMuted,
}

// The hook's hint labels are French-only: rebuild them from the tone.
function hintLabel(t: (key: string) => string, metric: 'hemisphere' | 'area' | 'population', guess: Guess, hint: Hint) {
  if (guess.isCorrect) return t('mobile.clue.exact')
  return t(`mobile.clue.${metric}_${hint.tone}`)
}

function HintChip({ label, hint, text, detail }: { label: string; hint: Hint; text: string; detail?: string }) {
  const color = TONE_COLORS[hint.tone]
  return (
    <View style={[styles.chip, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
      <Text variant="label" style={{ fontSize: 10 }}>
        {label}
      </Text>
      <Text variant="bodyStrong" color={color} numberOfLines={2} style={{ fontSize: 13, lineHeight: 17 }}>
        {hint.arrow} {text}
      </Text>
      {detail ? (
        <Text variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
          {detail}
        </Text>
      ) : null}
    </View>
  )
}

function GuessCard({ guess, index }: { guess: Guess; index: number }) {
  const { t, i18n } = useTranslation()
  const name = (guess.isoA2 && getCountryName(guess.isoA2, i18n.language)) || guess.value
  const flag = getFlag(guess.isoA2)
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      layout={LinearTransition.springify()}
      style={[styles.card, guess.isCorrect && { borderColor: colors.accent }]}>
      <View style={styles.cardHeader}>
        <Text variant="caption" style={{ width: 18 }}>
          {index + 1}
        </Text>
        {flag && <Image source={flag} contentFit="cover" style={styles.flag} />}
        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </Text>
        {guess.isCorrect ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
        ) : (
          <View style={styles.distance}>
            <Text variant="bodyStrong" color={ACCENT}>
              {guess.directionArrow}
            </Text>
            <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
              {guess.distanceKm?.toLocaleString(i18n.language)} km
            </Text>
          </View>
        )}
      </View>
      {!guess.isCorrect && (
        <>
          {guess.direction && (
            <Text variant="caption">
              {t('country_clue.metric_direction')} : {t(`mobile.directions.${guess.direction}`)}
            </Text>
          )}
          <View style={styles.chips}>
            <HintChip label={t('country_clue.metric_hemisphere')} hint={guess.hemisphereHint} text={hintLabel(t, 'hemisphere', guess, guess.hemisphereHint)} />
            <HintChip label={t('country_clue.metric_area')} hint={guess.areaHint} text={hintLabel(t, 'area', guess, guess.areaHint)} detail={guess.areaLabel} />
            <HintChip
              label={t('country_clue.metric_population')}
              hint={guess.populationHint}
              text={hintLabel(t, 'population', guess, guess.populationHint)}
              detail={guess.populationLabel}
            />
          </View>
        </>
      )}
    </Animated.View>
  )
}

function AnswerCard({ iso, name, capital, solved }: { iso: string | null; name: string; capital: string; solved: boolean }) {
  const { t } = useTranslation()
  const flag = getFlag(iso)
  return (
    <View style={styles.answer}>
      {flag && <Image source={flag} contentFit="contain" style={styles.answerFlag} />}
      <View style={{ flex: 1 }}>
        <Text variant="title" color={solved ? colors.accent : colors.warning} numberOfLines={2} adjustsFontSizeToFit>
          {name}
        </Text>
        <Text variant="caption">
          {clean(t('labels.capital'))} {capital || t('labels.unknown')}
        </Text>
      </View>
    </View>
  )
}

export default function CountryClueScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { mode = 'daily' } = useLocalSearchParams<{ mode?: string }>()
  const isDaily = mode === 'daily'
  const {
    inputValue,
    setInputValue,
    guesses,
    isSolved,
    isLost,
    isComplete,
    answerName,
    answerCapital,
    currentCountryISO,
    filteredCountrySuggestions,
    dailyKey,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    hasStarted,
    startGame,
    startedAt,
    elapsedTime,
  } = useCountryClueState(mode)
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)

  const elapsed = useElapsed(startedAt ?? null, isDaily && hasStarted && !isComplete)
  const locked = isComplete || (isDaily && !hasStarted)
  const answer = getCountryName(currentCountryISO, i18n.language) || answerName
  const capital = getCapitalName(currentCountryISO, i18n.language) || answerCapital
  const attemptsLabel = guesses.length === 1 ? t('units.attempt_one') : t('units.attempt_other')
  const mapGuesses = [
    ...(guesses as Guess[]).map((guess) => ({ name: guess.value, correct: guess.isCorrect })),
    ...(isLost ? [{ name: answerName, correct: true }] : []),
  ]
  const recap = (
    <>
      <AnswerCard iso={currentCountryISO} name={answer} capital={capital} solved={isSolved} />
      <GuessesMap guesses={mapGuesses} />
    </>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.lg }]}>
          <View>
            <Text variant="label" color={ACCENT}>
              {isDaily ? t('mobile.home.daily') : t('mobile.home.infinite')}
            </Text>
            <Text variant="title">{t('games.country_clue.title')}</Text>
            <Text variant="caption" style={{ marginTop: space.xs }}>
              {t('country_clue.intro_text')}
            </Text>
          </View>

          {isDaily && !hasStarted && !isComplete && (
            <View style={styles.start}>
              <MaterialCommunityIcons name="compass-outline" size={40} color={ACCENT} />
              <Button
                label={clean(t('buttons.start_timer'))}
                color={ACCENT}
                onPress={startGame}
                icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
              />
            </View>
          )}

          {isComplete && !isDaily && (
            <Animated.View entering={FadeIn.duration(220)} style={{ gap: space.md }}>
              {recap}
              <Button
                label={clean(t('buttons.new_country'))}
                color={ACCENT}
                onPress={startNextInfiniteRound}
                icon={<MaterialCommunityIcons name="arrow-right" size={20} color={colors.onAccent} />}
              />
            </Animated.View>
          )}

          <View style={{ gap: space.sm }}>
            {guesses.length === 0
              ? (!isDaily || hasStarted) && (
                  <Text variant="caption" style={{ textAlign: 'center' }}>
                    {t('labels.no_attempts')}
                  </Text>
                )
              : (guesses as Guess[])
                  .map((guess, index) => ({ guess, index }))
                  .reverse()
                  .map(({ guess, index }) => <GuessCard key={`${guess.value}-${index}`} guess={guess} index={index} />)}
          </View>
        </ScrollView>

        {!isComplete && (
          <GuessInputBar
            value={inputValue}
            onChangeText={setInputValue}
            onSubmit={handleSubmit}
            onReveal={revealCountry}
            suggestions={filteredCountrySuggestions}
            locked={locked}
            placeholder={t('placeholders.country_examples_clue')}
            accent={ACCENT}
            revealLabel={clean(t('buttons.reveal_country'))}
          />
        )}
      </KeyboardAvoidingView>

      {!(isComplete && isDaily) && (
        <GameTopBar confirmQuit={false}>
          {isDaily && hasStarted && <HudPill icon="timer-outline" label={formatTime(elapsedTime ?? elapsed).slice(0, 5)} />}
          <HudPill icon="target" label={`${guesses.length} ${attemptsLabel}`} color={ACCENT} />
        </GameTopBar>
      )}

      {isComplete && isDaily && dailyKey && (
        <ResultsSheet
          title={isSolved ? t('country_clue.correct') : t('borderguess.answer_was')}
          score={guesses.length}
          scoreLabel={attemptsLabel}
          accent={isSolved ? ACCENT : colors.warning}
          stats={[{ label: t('mobile.game.time'), value: elapsedTime != null ? formatTime(elapsedTime).slice(0, 5) : '—' }]}
          save={
            isSolved
              ? {
                  kind: 'daily',
                  gameType: GAME_TYPES.COUNTRY_CLUE,
                  dailyKey,
                  attempts: guesses.length,
                  elapsedTime,
                  guesses: (guesses as Guess[]).map((guess) => guess.value),
                }
              : null
          }
          share={{
            gameType: 'COUNTRY_CLUE',
            difficulty: 'Daily',
            scoreLabel: t('share.score_attempts'),
            details: isSolved
              ? t('share.details_found_attempts', { count: guesses.length })
              : t('share.details_not_found_attempts', { count: guesses.length }),
            challenge: { route: '/country-clue', dailyKey, solved: isSolved },
          }}
          onSaved={() => setLeaderboardVersion((version) => version + 1)}
          onHome={() => navigate('/')}>
          {recap}
          <DailyLeaderboard gameType={GAME_TYPES.COUNTRY_CLUE} dailyKey={dailyKey} refreshKey={leaderboardVersion} />
        </ResultsSheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  start: {
    alignItems: 'center',
    gap: space.lg,
    padding: space.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flag: { width: 24, height: 16, borderRadius: 3 },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', gap: space.sm },
  chip: { flex: 1, minWidth: 0, gap: 2, padding: space.sm, borderRadius: radius.sm, borderWidth: 1 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  answerFlag: { width: 72, height: 48, borderRadius: 6 },
})
