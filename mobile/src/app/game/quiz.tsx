// "Quiz Géo": geography questions (rivers, mountains, islands, borders…).
// Daily: one free-answer question with a few attempts and hints. Infinite: practice at a chosen difficulty,
// multiple choice or free answer. Game rules come from the website hooks (useDailyQuizState, useQuizState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useDailyQuizState from '@shared/hooks/useDailyQuizState'
import useQuizState from '@shared/hooks/useQuizState'
import { formatTime } from '@shared/utils/formatTime'
import { useDailyPlayedElsewhere } from '@shared/hooks/useDailyPlayedElsewhere'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCountryName } from '@shared/utils/getCountryName'
import {
  ANSWER_MODES,
  HISTORY_COUNTRIES,
  MAX_HINTS,
  QUIZ_DIFFICULTIES,
  QUIZ_THEMES,
  getQuestionHints,
  localizeQuestion,
} from '@shared/utils/quizQuestions'

import { useAccount } from '@/account/auth'
import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { DailyPlayedElsewhere } from '@/components/game/DailyPlayedElsewhere'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { Button, Segmented, Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { DIFFICULTY_COLORS } from '@/games'
import { useElapsed } from '@/hooks/useElapsed'
import { clean } from '@/i18n'
import { RoomGate, RoomHudPill, Standings, useReportFound, type RoomPlay } from '@/multiplayer/RoomPlay'
import { navigate } from '@/shims/react-router-dom'
import { colors, fonts, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.quiz
const MODE_STORAGE_KEY = 'geogame_quiz_mode'

type AnswerMode = 'choices' | 'free'
type Theme = 'geo' | 'history'
// Histoire, éventuellement sur un seul pays (depuis l'atlas)
type Topic = { theme: Theme; country?: string | null }
type Question = { difficulty: string; correctId: string }
type Localized = { prompt: string; choices: { id: string; label: string }[]; answer: string; multipleAnswers: boolean; fact: string | null }

function loadMode(): AnswerMode {
  const saved = globalThis.localStorage?.getItem(MODE_STORAGE_KEY)
  return saved === ANSWER_MODES.FREE ? 'free' : 'choices'
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const { t } = useTranslation()
  const color = DIFFICULTY_COLORS[difficulty] ?? colors.textMuted
  return (
    <View style={[styles.badge, { borderColor: `${color}66`, backgroundColor: `${color}14` }]}>
      <Text variant="label" color={color} style={{ fontSize: 11 }}>
        {t(`difficulties.${difficulty}`)}
      </Text>
    </View>
  )
}

function AnswerInput({
  value,
  onChangeText,
  onSubmit,
  editable = true,
  state,
  inputRef,
}: {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  editable?: boolean
  state?: 'correct' | 'wrong'
  inputRef?: React.RefObject<TextInput | null>
}) {
  const { t } = useTranslation()
  const tint = state === 'correct' ? colors.accent : state === 'wrong' ? colors.danger : null
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      submitBehavior="submit"
      placeholder={t('quiz.input_placeholder')}
      placeholderTextColor={colors.textFaint}
      autoCapitalize="sentences"
      autoCorrect={false}
      spellCheck={false}
      autoComplete="off"
      returnKeyType="send"
      editable={editable}
      style={[styles.input, tint && { borderColor: tint, color: tint }]}
    />
  )
}

function Feedback({ correct, title, lines }: { correct: boolean; title: string; lines: (string | null | false | undefined)[] }) {
  const tint = correct ? colors.accent : colors.danger
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.feedback, { borderColor: `${tint}66`, backgroundColor: `${tint}12` }]}>
      <Text variant="bodyStrong" color={tint}>
        {title}
      </Text>
      {lines.filter(Boolean).map((line) => (
        <Text key={line as string} variant="body" style={{ fontSize: 14 }}>
          {line}
        </Text>
      ))}
    </Animated.View>
  )
}

// ─── Daily question ────────────────────────────────────────────────────────

function DailyQuiz() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const {
    dailyKey,
    question,
    guesses,
    hintsUsed,
    elapsedTime,
    startedAt,
    hasStarted,
    isComplete,
    isSolved,
    attemptsLeft,
    canUseHint,
    start,
    submit,
    takeHint,
    giveUp,
  } = useDailyQuizState()
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.QUIZ,
    dailyKey,
    started: hasStarted || guesses.length > 0 || isComplete,
  })
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)
  const inputRef = useRef<TextInput>(null)
  const elapsed = useElapsed(startedAt ?? null, hasStarted && !isComplete)

  const localized = useMemo<Localized | null>(() => (question ? localizeQuestion(question, i18n.language, t) : null), [question, i18n.language, t])
  const hints = useMemo<string[]>(() => (question ? getQuestionHints(question, i18n.language, t) : []), [question, i18n.language, t])

  const typedGuesses = guesses as { input: string; correct: boolean; typo: string | null }[]
  const attempts = typedGuesses.length
  const wrongGuesses = typedGuesses.filter((guess) => !guess.correct)
  const lastGuess = typedGuesses[attempts - 1]
  const attemptsCount = t('quiz.attempts_count', { count: attempts })
  const statText = t('quiz.daily_stat', {
    attempts: attemptsCount,
    hints: t('quiz.hints_count', { count: hintsUsed }),
    time: elapsedTime != null ? formatTime(elapsedTime) : '—',
  })

  const onSubmit = () => {
    const result = submit(input)
    if (result === 'duplicate') {
      setNotice(t('quiz.already_tried'))
      return
    }
    if (result) {
      setInput('')
      setNotice(null)
      inputRef.current?.focus()
    }
  }

  const answerFeedback = localized && (
    <Feedback
      correct={isSolved}
      title={isSolved ? clean(t('quiz.daily_won', { attempts: attemptsCount })) : clean(t('quiz.daily_lost'))}
      lines={[
        isSolved && lastGuess?.typo && t('quiz.typo_accepted', { name: lastGuess.typo }),
        t(localized.multipleAnswers ? 'quiz.accepted_answers' : 'quiz.answer_was', { answer: localized.answer }),
        localized.fact,
      ]}
    />
  )

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={t('quiz.daily_title')} game={elsewhere.game} accent={ACCENT}>
        {dailyKey && <DailyLeaderboard gameType={GAME_TYPES.QUIZ} dailyKey={dailyKey} />}
      </DailyPlayedElsewhere>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md, paddingBottom: insets.bottom + space.xl }]}>
          <Text variant="label" color={ACCENT}>
            {t('mobile.home.daily')} · {t('games.quiz.title')}
          </Text>

          {localized && (
            <View style={styles.card}>
              <DifficultyBadge difficulty={(question as Question).difficulty} />
              {!hasStarted ? (
                <>
                  <Text variant="body" color={colors.textMuted}>
                    {t('quiz.daily_rules', { attempts: attemptsLeft, hints: MAX_HINTS })}
                  </Text>
                  <Button
                    label={clean(t('buttons.start_timer'))}
                    color={ACCENT}
                    onPress={start}
                    icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
                  />
                </>
              ) : (
                <>
                  <Animated.View entering={FadeIn.duration(250)}>
                    <Text variant="heading">{localized.prompt}</Text>
                  </Animated.View>

                  {hintsUsed > 0 && (
                    <View style={{ gap: space.sm }}>
                      {hints.slice(0, hintsUsed).map((hint, index) => (
                        <Animated.View key={index} entering={FadeInDown.springify().damping(18)} style={styles.hint}>
                          <Text variant="label" color={ACCENT}>
                            {t('quiz.hint_n', { n: index + 1 })}
                          </Text>
                          <Text variant="bodyStrong" style={{ letterSpacing: 0.5 }}>
                            {hint}
                          </Text>
                        </Animated.View>
                      ))}
                    </View>
                  )}

                  {wrongGuesses.length > 0 && (
                    <View style={styles.wrongs}>
                      {wrongGuesses.map((guess) => (
                        <View key={guess.input} style={styles.wrong}>
                          <MaterialCommunityIcons name="close" size={14} color={colors.danger} />
                          <Text variant="caption" color={colors.danger}>
                            {guess.input}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {!isComplete && (
                    <View style={{ gap: space.sm }}>
                      <AnswerInput
                        inputRef={inputRef}
                        value={input}
                        onChangeText={(value) => {
                          setInput(value)
                          setNotice(null)
                        }}
                        onSubmit={onSubmit}
                      />
                      {notice && (
                        <Text variant="caption" color={colors.warning}>
                          {notice}
                        </Text>
                      )}
                      <View style={styles.actions}>
                        <Button
                          label={`${t('quiz.hints_label')} ${hintsUsed}/${MAX_HINTS}`}
                          variant="secondary"
                          onPress={takeHint}
                          disabled={!canUseHint}
                          icon={<MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.text} />}
                          style={{ flex: 1 }}
                        />
                        <Button
                          label={clean(t('buttons.validate'))}
                          color={ACCENT}
                          onPress={onSubmit}
                          disabled={!input.trim()}
                          style={{ flex: 1 }}
                        />
                      </View>
                      <Button label={t('quiz.give_up')} variant="ghost" onPress={giveUp} />
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {!isComplete && (
        <GameTopBar confirmQuit={false}>
          {hasStarted && <HudPill icon="timer-outline" label={formatTime(elapsed).slice(0, 5)} />}
          {hasStarted && <HudPill icon="target" label={`${attemptsLeft}`} color={ACCENT} />}
          {hasStarted && <HudPill icon="lightbulb-on-outline" label={`${hintsUsed}/${MAX_HINTS}`} />}
        </GameTopBar>
      )}

      {isComplete && (
        <ResultsSheet
          title={isSolved ? t('mobile.quiz.found') : t('mobile.quiz.not_found')}
          score={attempts + hintsUsed}
          scoreLabel={t('share.score_attempts')}
          accent={isSolved ? ACCENT : colors.warning}
          stats={[
            { label: t('quiz.attempts_used'), value: `${attempts}` },
            { label: t('quiz.hints_label'), value: `${hintsUsed}/${MAX_HINTS}` },
            { label: t('mobile.game.time'), value: elapsedTime != null ? formatTime(elapsedTime).slice(0, 5) : '—' },
          ]}
          record={{ gameType: GAME_TYPES.QUIZ, mode: 'daily', dailyKey, solved: isSolved, attempts, hints: hintsUsed, elapsedTime }}
          save={
            isSolved
              ? {
                  kind: 'daily',
                  gameType: GAME_TYPES.QUIZ,
                  dailyKey,
                  attempts,
                  hints: hintsUsed,
                  elapsedTime,
                  guesses: typedGuesses.map((guess) => guess.input),
                }
              : null
          }
          share={{
            gameType: GAME_TYPES.QUIZ,
            difficulty: 'Daily',
            scoreLabel: t('share.score_attempts'),
            details: isSolved ? statText : clean(t('quiz.daily_lost')),
            challenge: { route: '/quiz', dailyKey, solved: isSolved },
          }}
          onReplay={() => router.replace({ pathname: '/game/quiz', params: { mode: 'infinite' } })}
          onSaved={() => setLeaderboardVersion((version) => version + 1)}
          onHome={() => navigate('/')}>
          {localized && (
            <View style={styles.card}>
              <Text variant="bodyStrong">{localized.prompt}</Text>
              {answerFeedback}
              <Text variant="caption">{t('quiz.daily_come_back')}</Text>
            </View>
          )}
          <DailyLeaderboard gameType={GAME_TYPES.QUIZ} dailyKey={dailyKey} refreshKey={leaderboardVersion} />
        </ResultsSheet>
      )}
    </View>
  )
}

// ─── Practice (infinite) ───────────────────────────────────────────────────

function DifficultyPicker({
  onPick,
  initialTheme,
  country,
}: {
  onPick: (difficulty: string, mode: AnswerMode, topic: Topic) => void
  initialTheme: Theme
  country: string | null
}) {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<AnswerMode>(loadMode)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const flag = country ? getFlag(country) : null

  const changeMode = (next: AnswerMode) => {
    setMode(next)
    globalThis.localStorage?.setItem(MODE_STORAGE_KEY, next)
  }

  return (
    <View style={{ gap: space.lg }}>
      {country ? (
        <View style={styles.countryTitle}>
          {flag && <Image source={flag} contentFit="cover" style={styles.countryFlag} />}
          <Text variant="heading" style={{ flex: 1 }}>
            {t('quiz.history.country_title', { country: getCountryName(country, i18n.language) ?? country })}
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Text variant="label">{t('quiz.pick_theme')}</Text>
          <Segmented<Theme>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'geo', label: clean(t('quiz.themes.geo')) },
              { value: 'history', label: clean(t('quiz.themes.history')) },
            ]}
          />
          <Text variant="caption">{t(`quiz.themes.${theme}_hint`)}</Text>
        </View>
      )}
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('quiz.pick_mode')}</Text>
        <Segmented<AnswerMode>
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'choices', label: t('quiz.modes.choices') },
            { value: 'free', label: t('quiz.modes.free') },
          ]}
        />
        <Text variant="caption">{t(`quiz.modes.${mode}_hint`)}</Text>
      </View>
      {country ? (
        <View style={{ gap: space.sm }}>
          <Text variant="caption">{t('quiz.history.country_hint')}</Text>
          <Button label={t('buttons.play')} color={ACCENT} onPress={() => onPick('Impossible', mode, { theme: 'history', country })} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Text variant="label">{t('quiz.pick_difficulty')}</Text>
          <Text variant="caption">{t('quiz.pick_difficulty_hint')}</Text>
          <View style={styles.grid}>
            {(QUIZ_DIFFICULTIES as string[]).map((difficulty) => (
              <Touchable key={difficulty} accessibilityRole="button" onPress={() => onPick(difficulty, mode, { theme })} style={styles.difficulty}>
                <Text variant="heading" color={DIFFICULTY_COLORS[difficulty]}>
                  {t(`difficulties.${difficulty}`)}
                </Text>
              </Touchable>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

// In a room (`play`): the room's difficulty and answer mode, the same questions for everyone, a fixed number of them.
function PracticeQuiz({
  play,
  presetTheme = 'geo',
  presetCountry = null,
}: {
  play?: RoomPlay
  presetTheme?: Theme
  presetCountry?: string | null
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const {
    maxDifficulty,
    answerMode,
    theme,
    country,
    question,
    selectedId,
    freeResult,
    isAnswered,
    isCorrect,
    stats,
    isFinished,
    hintsUsed,
    maxHints,
    canUseHint,
    hiddenChoiceIds,
    points,
    start,
    answer,
    submitFree,
    takeHint,
    next,
    quit,
    backToDifficulty,
  } = useQuizState({ seed: play?.room.seed })
  const isFree = answerMode === ANSWER_MODES.FREE
  // Le quiz d'histoire n'est ni enregistré ni partagé, pour ne pas fausser les scores du quiz géo
  const isHistory = (maxDifficulty ? theme : presetTheme) === QUIZ_THEMES.HISTORY
  const [startedAt] = useState(() => Date.now())
  const questionCount = play?.content.total ?? 0
  const isLastQuestion = !!play && stats.answered >= questionCount

  useEffect(() => {
    if (play) start(play.room.game.quizDifficulty, play.room.game.answerMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useReportFound(play, stats.answered)
  useEffect(() => {
    if (isFinished)
      play?.finish({
        weightedScore: stats.score,
        countriesSolved: stats.correct,
        attempts: stats.answered - stats.correct,
        elapsedTime: Date.now() - startedAt,
      })
  }, [isFinished, play, stats, startedAt])
  const [input, setInput] = useState('')
  const inputRef = useRef<TextInput>(null)
  const scrollRef = useRef<ScrollView>(null)

  const localized = useMemo<Localized | null>(() => (question ? localizeQuestion(question, i18n.language, t) : null), [question, i18n.language, t])
  const hints = useMemo<string[]>(
    () => (question && isFree ? getQuestionHints(question, i18n.language, t) : []),
    [question, isFree, i18n.language, t]
  )
  const hidden = hiddenChoiceIds as string[]
  const current = question as Question | null
  const result = freeResult as { input: string; match: { match: string; name: string } | null } | null

  // A new question starts with an empty input.
  const [inputQuestion, setInputQuestion] = useState(question)
  if (inputQuestion !== question) {
    setInputQuestion(question)
    setInput('')
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    if (isFree) inputRef.current?.focus()
  }, [question, isFree])

  const choiceStyle = (id: string) => {
    if (hidden.includes(id)) return { opacity: 0.2 }
    if (!isAnswered || !current) return null
    if (id === current.correctId) return { borderColor: colors.accent, backgroundColor: `${colors.accent}1A` }
    if (id === selectedId) return { borderColor: colors.danger, backgroundColor: `${colors.danger}1A` }
    return { opacity: 0.45 }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md, paddingBottom: insets.bottom + space.xl }]}>
          <Text variant="label" color={ACCENT}>
            {play
              ? t('mobile.multi.question', { n: Math.min(stats.answered + (isAnswered ? 0 : 1), questionCount), total: questionCount })
              : t('mobile.home.infinite')}{' '}
            · {isHistory ? t('quiz.history.title') : t('games.quiz.title')}
          </Text>

          {!maxDifficulty && !play && (
            <DifficultyPicker
              initialTheme={presetTheme}
              country={presetCountry}
              onPick={(difficulty, mode, topic) => start(difficulty, mode, topic)}
            />
          )}

          {maxDifficulty && !isFinished && localized && current && (
            <View style={styles.card}>
              <View style={styles.badgeRow}>
                <DifficultyBadge difficulty={current.difficulty} />
                {!isAnswered && (
                  <Text variant="bodyStrong" color={colors.textMuted} style={{ fontSize: 13 }}>
                    +{points} {points === 1 ? t('units.pt') : t('units.pts')}
                  </Text>
                )}
              </View>
              <Animated.View key={localized.prompt} entering={FadeIn.duration(220)}>
                <Text variant="heading">{localized.prompt}</Text>
              </Animated.View>

              {hintsUsed > 0 && hints.length > 0 && (
                <View style={{ gap: space.sm }}>
                  {hints.slice(0, hintsUsed).map((hint, index) => (
                    <Animated.View key={index} entering={FadeInDown.springify().damping(18)} style={styles.hint}>
                      <Text variant="label" color={ACCENT}>
                        {t('quiz.hint_n', { n: index + 1 })}
                      </Text>
                      <Text variant="bodyStrong" style={{ letterSpacing: 0.5 }}>
                        {hint}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              )}

              {isFree ? (
                <View style={{ gap: space.sm }}>
                  <AnswerInput
                    inputRef={inputRef}
                    value={isAnswered && result ? result.input : input}
                    onChangeText={setInput}
                    onSubmit={() => input.trim() && submitFree(input)}
                    editable={!isAnswered}
                    state={isAnswered ? (isCorrect ? 'correct' : 'wrong') : undefined}
                  />
                  {!isAnswered && (
                    <View style={styles.actions}>
                      <Button label={t('quiz.dont_know')} variant="secondary" onPress={() => submitFree('')} style={{ flex: 1 }} />
                      <Button
                        label={clean(t('buttons.validate'))}
                        color={ACCENT}
                        onPress={() => submitFree(input)}
                        disabled={!input.trim()}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ gap: space.sm }}>
                  {localized.choices.map((choice, index) => (
                    <Touchable
                      key={choice.id}
                      accessibilityRole="button"
                      onPress={() => answer(choice.id)}
                      disabled={isAnswered || hidden.includes(choice.id)}
                      style={[styles.choice, choiceStyle(choice.id)]}>
                      <View style={styles.choiceKey}>
                        <Text variant="bodyStrong" color={colors.textMuted} style={{ fontSize: 13 }}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        variant="bodyStrong"
                        style={[{ flex: 1 }, hidden.includes(choice.id) && { textDecorationLine: 'line-through' }]}>
                        {choice.label}
                      </Text>
                      {isAnswered && choice.id === current.correctId && (
                        <Animated.View entering={ZoomIn.springify()}>
                          <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
                        </Animated.View>
                      )}
                      {isAnswered && choice.id === selectedId && choice.id !== current.correctId && (
                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} />
                      )}
                    </Touchable>
                  ))}
                </View>
              )}

              {isAnswered && (
                <Feedback
                  correct={isCorrect}
                  title={clean(isCorrect ? t('quiz.correct') : t('quiz.wrong'))}
                  lines={[
                    isFree && result?.match?.match === 'typo' && t('quiz.typo_accepted', { name: result.match.name }),
                    isFree && t(localized.multipleAnswers ? 'quiz.accepted_answers' : 'quiz.answer_was', { answer: localized.answer }),
                    localized.fact,
                  ]}
                />
              )}

              {!isAnswered && maxHints > 0 && (
                <View style={{ gap: space.xs }}>
                  <Button
                    label={`${t('quiz.hints_label')} ${hintsUsed}/${maxHints}`}
                    variant="secondary"
                    onPress={takeHint}
                    disabled={!canUseHint}
                    icon={<MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.text} />}
                  />
                  <Text variant="caption" style={{ textAlign: 'center' }}>
                    {t('quiz.hint_cost')}
                  </Text>
                </View>
              )}

              <View style={styles.actions}>
                {!play && <Button label={t('quiz.quit')} variant="secondary" onPress={quit} style={{ flex: 1 }} />}
                <Button
                  label={isLastQuestion ? t('mobile.multi.see_results') : t('mobile.quiz.next')}
                  color={ACCENT}
                  onPress={isLastQuestion ? quit : next}
                  disabled={!isAnswered}
                  icon={<MaterialCommunityIcons name="arrow-right" size={20} color={colors.onAccent} />}
                  style={{ flex: 1.4 }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {!isFinished && (
        <GameTopBar confirmQuit={stats.answered > 0} onQuit={play?.exit ?? (() => navigate('/'))}>
          {maxDifficulty && (
            <>
              {play && <RoomHudPill code={play.room.id} gameIndex={play.room.gameIndex} />}
              <HudPill icon="star-outline" label={`${stats.score}`} color={ACCENT} />
              <HudPill icon="check" label={`${stats.correct}/${stats.answered}`} />
              <HudPill icon="fire" label={`${stats.streak}`} color={stats.streak >= 3 ? colors.warning : colors.text} />
            </>
          )}
        </GameTopBar>
      )}

      {isFinished && maxDifficulty && (
        <ResultsSheet
          title={t('quiz.summary_title')}
          score={stats.score}
          scoreLabel={t('units.pts')}
          accent={ACCENT}
          stats={[
            { label: t('quiz.correct_answers'), value: `${stats.correct}/${stats.answered}` },
            { label: t('quiz.best_streak'), value: `${stats.bestStreak}` },
          ]}
          record={
            stats.answered > 0 && !isHistory
              ? {
                  gameType: GAME_TYPES.QUIZ,
                  mode: play ? 'multi' : 'infinite',
                  roomCode: play?.room.id,
                  score: stats.score,
                  correct: stats.correct,
                  answered: stats.answered,
                  bestStreak: stats.bestStreak,
                  difficulty: maxDifficulty,
                }
              : null
          }
          share={
            stats.answered > 0 && !play && !isHistory
              ? {
                  gameType: GAME_TYPES.QUIZ,
                  difficulty: maxDifficulty,
                  scoreLabel: t('quiz.share_label'),
                  details: t('quiz.share_details', { correct: stats.correct, answered: stats.answered, streak: stats.bestStreak }),
                }
              : null
          }
          onReplay={play ? undefined : () => start(maxDifficulty, answerMode, { theme, country })}
          onHome={play?.exit ?? (() => navigate('/'))}
          homeLabel={play ? t('mobile.multi.back_to_room') : undefined}>
          {play ? (
            <Standings code={play.room.id} gameIndex={play.room.gameIndex} />
          ) : (
            <Button label={t('quiz.change_difficulty')} variant="secondary" onPress={backToDifficulty} />
          )}
        </ResultsSheet>
      )}
    </View>
  )
}

export default function QuizScreen() {
  const { mode = 'daily', room, theme, country } = useLocalSearchParams<{ mode?: string; room?: string; theme?: string; country?: string }>()
  if (room) return <RoomGate code={room}>{(play) => <PracticeQuiz play={play} />}</RoomGate>
  // /game/quiz?mode=infinite&theme=history[&country=FR] : arrivée depuis la fiche d'un pays de l'atlas
  const presetCountry = country && (HISTORY_COUNTRIES as string[]).includes(country) ? country : null
  const presetTheme: Theme = presetCountry || theme === QUIZ_THEMES.HISTORY ? 'history' : 'geo'
  return mode === 'infinite' ? <PracticeQuiz presetTheme={presetTheme} presetCountry={presetCountry} /> : <DailyQuiz />
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.lg },
  card: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
  },
  actions: { flexDirection: 'row', gap: space.sm },
  hint: { gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  wrongs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  wrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: `${colors.danger}14`,
  },
  feedback: { gap: space.xs, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 54,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  choiceKey: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  countryTitle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  countryFlag: { width: 40, height: 27, borderRadius: 4 },
  difficulty: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
})
