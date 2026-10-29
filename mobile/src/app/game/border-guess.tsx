// "Border Guess": name the country from its silhouette. Daily (shared country) or infinite.
// Game rules come from the website hook (useBorderGuessState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useBorderGuessState, { ROOM_MAX_ATTEMPTS, roomRoundErrors } from '@shared/hooks/useBorderGuessState'
import { formatTime } from '@shared/utils/formatTime'
import { useDailyPlayedElsewhere } from '@shared/hooks/useDailyPlayedElsewhere'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCountryName } from '@shared/utils/getCountryName'

import { useAccount } from '@/account/auth'
import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { DailyPlayedElsewhere } from '@/components/game/DailyPlayedElsewhere'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { BorderGuessRow, type BorderGuess } from '@/components/game/GuessCards'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { BorderGuessReveal } from '@/components/map/BorderGuessReveal'
import { CountrySilhouette } from '@/components/map/CountrySilhouette'
import { Button, Text } from '@/components/ui'
import { useAnnounceResult } from '@/hooks/useAnnounceResult'
import { useElapsed } from '@/hooks/useElapsed'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { clean } from '@/i18n'
import { RoomGate, RoomHudPill, Standings, type RoomPlay } from '@/multiplayer/RoomPlay'
import { useRoomRounds, useRoundResult } from '@/multiplayer/useRoomRounds'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.border_guess

export default function BorderGuessScreen() {
  const { mode = 'daily', room } = useLocalSearchParams<{ mode?: string; room?: string }>()
  if (room) return <RoomGate code={room}>{(play) => <BorderGuessGame mode="daily" play={play} />}</RoomGate>
  return <BorderGuessGame mode={mode} />
}

function BorderGuessGame({ mode, play }: { mode: string; play?: RoomPlay }) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const isDaily = mode === 'daily' && !play
  const rounds = useRoomRounds(play)
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
  } = useBorderGuessState(mode, { overrideCountry: rounds.country, maxAttempts: play ? ROOM_MAX_ATTEMPTS : null })
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.BORDER_GUESS,
    dailyKey,
    started: hasStarted || guesses.length > 0 || isComplete,
    enabled: isDaily,
  })
  useRoundResult(rounds, {
    isCurrent: currentCountry === rounds.country,
    isComplete,
    isSolved,
    wrongGuesses: roomRoundErrors(guesses, isSolved),
  })
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)
  const elapsed = useElapsed(play ? rounds.startedAt : startedAt, (isDaily && hasStarted && !isComplete) || (!!play && rounds.endedAt == null))
  const locked = isComplete || (isDaily && !hasStarted)
  const answer = getCountryName(currentCountryISO, i18n.language) || answerName
  useAnnounceResult(isComplete, isSolved, answer)
  const attemptsLabel = guesses.length === 1 ? t('units.attempt_one') : t('units.attempt_other')
  // Keep the silhouette compact so the latest guesses stay on screen, smaller still while typing.
  const { height: windowHeight } = useWindowDimensions()
  const keyboardVisible = useKeyboardVisible()
  const mapHeight = Math.max(150, Math.round(windowHeight * (keyboardVisible ? 0.22 : 0.32)))

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={t('games.border_guess.title')} game={elsewhere.game} accent={ACCENT}>
        {elsewhere.game && currentCountry && (
          <View style={{ gap: space.sm }}>
            <Text variant="bodyStrong">
              {t('borderguess.answer_was')} {answer}
            </Text>
            <BorderGuessReveal country={currentCountry} />
          </View>
        )}
        {dailyKey && <DailyLeaderboard gameType={GAME_TYPES.BORDER_GUESS} dailyKey={dailyKey} />}
      </DailyPlayedElsewhere>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
          <Animated.View layout={LinearTransition.duration(200)} style={[styles.mapCard, { height: mapHeight }]}>
            <View style={styles.modeTag}>
              <Text variant="label" color={ACCENT} style={{ fontSize: 10 }}>
                {play
                  ? t('mobile.multi.round', { n: rounds.index + 1, total: rounds.total })
                  : isDaily
                    ? t('mobile.home.daily')
                    : t('mobile.home.infinite')}
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
              <Animated.View key={currentCountry.properties.ADMIN} entering={ZoomIn.springify().dampingRatio(0.7)} style={{ flex: 1 }}>
                <CountrySilhouette
                  country={currentCountry}
                  color={ACCENT}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            ) : null}
          </Animated.View>

          {isComplete && !isDaily && (
            <Animated.View entering={FadeIn.duration(220)} style={styles.result}>
              <Text variant="caption">{isSolved ? t('borderguess.success_message') : t('borderguess.answer_was')}</Text>
              <Text variant="title" color={isSolved ? colors.accent : colors.warning}>
                {answer}
              </Text>
              <Button
                label={play ? (rounds.isLast ? t('mobile.multi.see_results') : t('mobile.multi.next_country')) : clean(t('buttons.new_country'))}
                color={ACCENT}
                onPress={play ? rounds.next : startNextInfiniteRound}
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
                .map((guess: BorderGuess, index: number) => ({ guess, index }))
                .reverse()
                .map(({ guess, index }) => <BorderGuessRow key={`${guess.value}-${index}`} guess={guess} index={index} latest={index === guesses.length - 1} />)
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

      {!(isComplete && isDaily) && !rounds.showResults && (
        <GameTopBar confirmQuit={!!play} onQuit={play?.exit}>
          {play && <RoomHudPill code={play.room.id} gameIndex={play.room.gameIndex} />}
          {play && <HudPill icon="timer-outline" label={formatTime(rounds.elapsedTime ?? elapsed).slice(0, 5)} />}
          {isDaily && hasStarted && <HudPill icon="timer-outline" label={formatTime(elapsedTime ?? elapsed).slice(0, 5)} />}
          <HudPill
            icon="target"
            label={play ? `${guesses.length} / ${ROOM_MAX_ATTEMPTS}` : `${guesses.length} ${attemptsLabel}`}
            color={ACCENT}
          />
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
            gameType: GAME_TYPES.BORDER_GUESS,
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
          title={isSolved ? t('borderguess.success_message') : t('borderguess.answer_was')}
          score={guesses.length}
          scoreLabel={attemptsLabel}
          accent={isSolved ? ACCENT : colors.warning}
          stats={[
            { label: t('labels.country'), value: answer, color: isSolved ? colors.accent : colors.warning },
            { label: t('mobile.game.time'), value: elapsedTime != null ? formatTime(elapsedTime).slice(0, 5) : '—' },
          ]}
          record={{ gameType: GAME_TYPES.BORDER_GUESS, mode: 'daily', dailyKey, solved: isSolved, attempts: guesses.length, elapsedTime }}
          save={
            isSolved
              ? {
                  kind: 'daily',
                  gameType: GAME_TYPES.BORDER_GUESS,
                  dailyKey,
                  attempts: guesses.length,
                  elapsedTime,
                  guesses: guesses.map((guess: BorderGuess) => guess.value),
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
          {currentCountry && <BorderGuessReveal country={currentCountry} />}
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
})
