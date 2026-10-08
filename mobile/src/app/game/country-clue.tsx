// "Country Clue": find the mystery country from distance, direction, hemisphere, area and population hints.
// Daily (shared country) or infinite. Game rules come from the website hook (useCountryClueState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useCountryClueState from '@shared/hooks/useCountryClueState'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCapitalName, getCountryName } from '@shared/utils/getCountryName'

import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ClueGuessCard, type ClueGuess } from '@/components/game/GuessCards'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { GuessesMap } from '@/components/map/GuessesMap'
import { Button, Text } from '@/components/ui'
import { getFlag } from '@/flags'
import { useElapsed } from '@/hooks/useElapsed'
import { clean } from '@/i18n'
import { RoomGate, RoomHudPill, Standings, type RoomPlay } from '@/multiplayer/RoomPlay'
import { useRoomRounds, useRoundResult } from '@/multiplayer/useRoomRounds'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.country_clue

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
  const { mode = 'daily', room } = useLocalSearchParams<{ mode?: string; room?: string }>()
  if (room) return <RoomGate code={room}>{(play) => <CountryClueGame mode="daily" play={play} />}</RoomGate>
  return <CountryClueGame mode={mode} />
}

function CountryClueGame({ mode, play }: { mode: string; play?: RoomPlay }) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const isDaily = mode === 'daily' && !play
  const rounds = useRoomRounds(play)
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
  } = useCountryClueState(mode, { overrideCountry: rounds.country })
  useRoundResult(rounds, {
    isCurrent: !!rounds.country && currentCountryISO === rounds.country.properties.ISO_A2,
    isComplete,
    isSolved,
    wrongGuesses: (guesses as ClueGuess[]).filter((guess) => !guess.isCorrect).length,
  })
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)

  const elapsed = useElapsed(
    play ? rounds.startedAt : (startedAt ?? null),
    (isDaily && hasStarted && !isComplete) || (!!play && rounds.endedAt == null)
  )
  const locked = isComplete || (isDaily && !hasStarted)
  const answer = getCountryName(currentCountryISO, i18n.language) || answerName
  const capital = getCapitalName(currentCountryISO, i18n.language) || answerCapital
  const attemptsLabel = guesses.length === 1 ? t('units.attempt_one') : t('units.attempt_other')
  const mapGuesses = [
    ...(guesses as ClueGuess[]).map((guess) => ({ name: guess.value, correct: guess.isCorrect })),
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
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
          <View style={{ gap: space.xs }}>
            <Text variant="label" color={ACCENT}>
              {play
                ? t('mobile.multi.round', { n: rounds.index + 1, total: rounds.total })
                : isDaily
                  ? t('mobile.home.daily')
                  : t('mobile.home.infinite')}{' '}
              · {t('games.country_clue.title')}
            </Text>
            {guesses.length === 0 && !isComplete && <Text variant="caption">{t('country_clue.intro_text')}</Text>}
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
                label={play ? (rounds.isLast ? t('mobile.multi.see_results') : t('mobile.multi.next_country')) : clean(t('buttons.new_country'))}
                color={ACCENT}
                onPress={play ? rounds.next : startNextInfiniteRound}
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
              : (guesses as ClueGuess[])
                  .map((guess, index) => ({ guess, index }))
                  .reverse()
                  .map(({ guess, index }) => <ClueGuessCard key={`${guess.value}-${index}`} guess={guess} index={index} />)}
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

      {!(isComplete && isDaily) && !rounds.showResults && (
        <GameTopBar confirmQuit={!!play} onQuit={play?.exit}>
          {play && <RoomHudPill code={play.room.id} gameIndex={play.room.gameIndex} />}
          {play && <HudPill icon="timer-outline" label={formatTime(rounds.elapsedTime ?? elapsed).slice(0, 5)} />}
          {isDaily && hasStarted && <HudPill icon="timer-outline" label={formatTime(elapsedTime ?? elapsed).slice(0, 5)} />}
          <HudPill icon="target" label={`${guesses.length} ${attemptsLabel}`} color={ACCENT} />
        </GameTopBar>
      )}

      {play && rounds.showResults && (
        <ResultsSheet
          score={rounds.tally.solved}
          scoreText={`${rounds.tally.solved}/${rounds.total}`}
          scoreLabel={t('labels.countries_found')}
          accent={ACCENT}
          stats={[
            { label: t('mobile.multi.errors_label'), value: String(rounds.tally.errors) },
            { label: t('mobile.game.time'), value: formatTime(rounds.elapsedTime ?? 0).slice(0, 5) },
          ]}
          record={{
            gameType: GAME_TYPES.COUNTRY_CLUE,
            mode: 'multi',
            roomCode: play.room.id,
            found: rounds.tally.solved,
            total: rounds.total,
            elapsedTime: rounds.elapsedTime,
          }}
          onHome={play.exit}
          homeLabel={t('mobile.multi.back_to_room')}>
          <Standings code={play.room.id} gameIndex={play.room.gameIndex} />
        </ResultsSheet>
      )}

      {isComplete && isDaily && dailyKey && (
        <ResultsSheet
          title={isSolved ? t('country_clue.correct') : t('borderguess.answer_was')}
          score={guesses.length}
          scoreLabel={attemptsLabel}
          accent={isSolved ? ACCENT : colors.warning}
          stats={[{ label: t('mobile.game.time'), value: elapsedTime != null ? formatTime(elapsedTime).slice(0, 5) : '—' }]}
          record={{ gameType: GAME_TYPES.COUNTRY_CLUE, mode: 'daily', dailyKey, solved: isSolved, attempts: guesses.length, elapsedTime }}
          save={
            isSolved
              ? {
                  kind: 'daily',
                  gameType: GAME_TYPES.COUNTRY_CLUE,
                  dailyKey,
                  attempts: guesses.length,
                  elapsedTime,
                  guesses: (guesses as ClueGuess[]).map((guess) => guess.value),
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
