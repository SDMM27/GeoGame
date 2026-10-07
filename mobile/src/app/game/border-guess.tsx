// "Border Guess": name the country from its silhouette. Daily (shared country) or infinite.
// Game rules come from the website hook (useBorderGuessState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useBorderGuessState from '@shared/hooks/useBorderGuessState'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCountryName } from '@shared/utils/getCountryName'

import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { CountrySilhouette } from '@/components/map/CountrySilhouette'
import { Button, Text } from '@/components/ui'
import { useElapsed } from '@/hooks/useElapsed'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { clean } from '@/i18n'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.border_guess

type Guess = {
  value: string
  iso: string | null
  isCorrect: boolean
  distanceKm: number | null
  direction: string | null
  directionArrow: string | null
}

// Where to look next, from the latest wrong guess: shown over the silhouette so it stays visible with the keyboard up.
function LastHint({ guess }: { guess: Guess }) {
  const { t, i18n } = useTranslation()
  if (guess.isCorrect || guess.distanceKm == null) return null
  const name = (guess.iso && getCountryName(guess.iso, i18n.language)) || guess.value
  return (
    <Animated.View key={guess.value} entering={FadeIn.duration(200)} style={styles.lastHint}>
      {guess.directionArrow && (
        <Text variant="title" color={ACCENT} style={{ fontSize: 26, lineHeight: 30 }}>
          {guess.directionArrow}
        </Text>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
          {guess.distanceKm.toLocaleString(i18n.language)} km
          {guess.direction ? ` · ${t(`mobile.directions.${guess.direction}`)}` : ''}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {t('mobile.game.from_country', { name })}
        </Text>
      </View>
    </Animated.View>
  )
}

function GuessRow({ guess, index }: { guess: Guess; index: number }) {
  const { t, i18n } = useTranslation()
  const name = (guess.iso && getCountryName(guess.iso, i18n.language)) || guess.value
  const color = guess.isCorrect ? colors.accent : colors.danger
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} layout={LinearTransition.springify()} style={styles.guess}>
      <Text variant="caption" style={{ width: 22 }}>
        {index + 1}
      </Text>
      <MaterialCommunityIcons name={guess.isCorrect ? 'check-circle' : 'close-circle'} size={18} color={color} />
      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
        {name}
      </Text>
      {!guess.isCorrect && guess.distanceKm != null && (
        <View style={styles.hint}>
          {guess.directionArrow && (
            <Text variant="bodyStrong" color={ACCENT}>
              {guess.directionArrow}
            </Text>
          )}
          <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
            {guess.distanceKm.toLocaleString(i18n.language)} km
            {guess.direction ? ` · ${t(`mobile.directions.${guess.direction}`)}` : ''}
          </Text>
        </View>
      )}
    </Animated.View>
  )
}

export default function BorderGuessScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { mode = 'daily' } = useLocalSearchParams<{ mode?: string }>()
  const isDaily = mode === 'daily'
  const {
    currentCountry,
    currentCountryISO,
    inputValue,
    setInputValue,
    guesses,
    isSolved,
    isComplete,
    answerName,
    filteredCountrySuggestions,
    dailyKey,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    hasStarted,
    startGame,
    startedAt,
    elapsedTime,
  } = useBorderGuessState(mode)
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)
  const elapsed = useElapsed(startedAt, isDaily && hasStarted && !isComplete)
  const locked = isComplete || (isDaily && !hasStarted)
  const answer = getCountryName(currentCountryISO, i18n.language) || answerName
  const attemptsLabel = guesses.length === 1 ? t('units.attempt_one') : t('units.attempt_other')
  // Keep the silhouette compact so the latest guesses stay on screen, smaller still while typing.
  const { height: windowHeight } = useWindowDimensions()
  const keyboardVisible = useKeyboardVisible()
  const mapHeight = Math.max(150, Math.round(windowHeight * (keyboardVisible ? 0.22 : 0.32)))
  const lastGuess: Guess | undefined = guesses[guesses.length - 1]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
          <Animated.View layout={LinearTransition.duration(200)} style={[styles.mapCard, { height: mapHeight }]}>
            <View style={styles.modeTag}>
              <Text variant="label" color={ACCENT} style={{ fontSize: 10 }}>
                {isDaily ? t('mobile.home.daily') : t('mobile.home.infinite')}
              </Text>
            </View>
            {isDaily && !hasStarted && !isComplete ? (
              <View style={styles.start}>
                <MaterialCommunityIcons name="vector-polygon" size={40} color={ACCENT} />
                <Text variant="body" style={{ textAlign: 'center' }} color={colors.textMuted}>
                  {t('borderguess.start_timer_hint')}
                </Text>
                <Button
                  label={clean(t('buttons.start_timer'))}
                  color={ACCENT}
                  onPress={startGame}
                  icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
                />
              </View>
            ) : currentCountry ? (
              <Animated.View key={currentCountry.properties.ADMIN} entering={ZoomIn.springify().damping(16)} style={{ flex: 1 }}>
                <CountrySilhouette
                  country={currentCountry}
                  color={ACCENT}
                  bottomInset={!isComplete && lastGuess && !lastGuess.isCorrect ? 52 : 0}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            ) : null}
            {!isComplete && lastGuess && <LastHint guess={lastGuess} />}
          </Animated.View>

          {isComplete && !isDaily && (
            <Animated.View entering={FadeIn.duration(220)} style={styles.result}>
              <Text variant="caption">{isSolved ? t('borderguess.success_message') : t('borderguess.answer_was')}</Text>
              <Text variant="title" color={isSolved ? colors.accent : colors.warning}>
                {answer}
              </Text>
              <Button
                label={clean(t('buttons.new_country'))}
                color={ACCENT}
                onPress={startNextInfiniteRound}
                icon={<MaterialCommunityIcons name="arrow-right" size={20} color={colors.onAccent} />}
                style={{ alignSelf: 'stretch', marginTop: space.sm }}
              />
            </Animated.View>
          )}

          <View style={{ gap: space.sm }}>
            {guesses.length === 0 ? (
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {t('labels.no_attempts')}
              </Text>
            ) : (
              [...guesses]
                .map((guess: Guess, index: number) => ({ guess, index }))
                .reverse()
                .map(({ guess, index }) => <GuessRow key={`${guess.value}-${index}`} guess={guess} index={index} />)
            )}
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
            placeholder={t('placeholders.country_examples')}
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
          title={isSolved ? t('borderguess.success_message') : t('borderguess.answer_was')}
          score={guesses.length}
          scoreLabel={attemptsLabel}
          accent={isSolved ? ACCENT : colors.warning}
          stats={[
            { label: t('labels.country'), value: answer, color: isSolved ? colors.accent : colors.warning },
            { label: t('mobile.game.time'), value: elapsedTime != null ? formatTime(elapsedTime).slice(0, 5) : '—' },
          ]}
          save={
            isSolved
              ? {
                  kind: 'daily',
                  gameType: GAME_TYPES.BORDER_GUESS,
                  dailyKey,
                  attempts: guesses.length,
                  elapsedTime,
                  guesses: guesses.map((guess: Guess) => guess.value),
                }
              : null
          }
          share={{
            gameType: 'BORDER_GUESS',
            difficulty: 'Daily',
            scoreLabel: t('share.score_attempts'),
            details: isSolved
              ? t('share.details_found_attempts', { count: guesses.length })
              : t('share.details_not_found_attempts', { count: guesses.length }),
            challenge: { route: '/border-guess', dailyKey, solved: isSolved },
          }}
          onSaved={() => setLeaderboardVersion((version) => version + 1)}
          onHome={() => navigate('/')}>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {t('borderguess.see_tomorrow')}
          </Text>
          <DailyLeaderboard gameType={GAME_TYPES.BORDER_GUESS} dailyKey={dailyKey} refreshKey={leaderboardVersion} />
        </ResultsSheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  mapCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.ocean,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeTag: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    zIndex: 1,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,16,32,0.8)',
  },
  lastHint: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(11,16,32,0.88)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  start: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  result: {
    alignItems: 'center',
    gap: 2,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
