// The rounds of a survival run in the app, one component per kind of game. Each one shows the round and sends the
// answers to the shared useSurvivalState; lives, score and the next round are handled by the survival screen.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'

import { BORDER_GUESS_COUNTRIES } from '@shared/hooks/useBorderGuessState'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCapitalName, getCountryName } from '@shared/utils/getCountryName'
import { normalize } from '@shared/utils/normalizeAnswer'
import { localizeQuestion } from '@shared/utils/quizQuestions'
import { matchesWhileTyping } from '@shared/utils/survival'

import { ANSWER_KEYBOARD_PROPS, useClearedAnswerGuard } from '@/components/game/answerInput'
import { BorderGuessRow, type BorderGuess } from '@/components/game/GuessCards'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { CountrySilhouette } from '@/components/map/CountrySilhouette'
import { WorldMap, type WorldMapHandle } from '@/components/map/WorldMap'
import { Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { DIFFICULTY_COLORS } from '@/games'
import { clean } from '@/i18n'
import { colors, fonts, gameColors, radius, space } from '@/theme'

type Feature = { properties: Record<string, any> }
// `difficulty`: Facile, Moyen, Difficile or Impossible, rising with the round number
export type SurvivalRound =
  | { type: string; difficulty: string; country: Feature; question?: undefined }
  | { type: string; difficulty: string; question: { choices: { id: string }[]; correctId: string }; country?: undefined }

// What useSurvivalState returns (shared JS hook)
export type Survival = {
  round: SurvivalRound | null
  roundIndex: number
  guesses: unknown[]
  wrongPicks: string[]
  outcome: 'correct' | 'failed' | null
  isPlaying: boolean
  clickCountry: (name: string) => string | null
  submitText: (input: string) => string | null
  chooseAnswer: (id: string) => string | null
  giveUp: () => void
}

export const countryLabel = (country: Feature, lang: string) => getCountryName(country.properties.ISO_A2, lang) || country.properties.ADMIN

/** What the right answer of a round reads like, in the player's language. */
export function roundAnswer(round: SurvivalRound | null, lang: string, t: TFunction) {
  if (!round) return ''
  if (round.question) return localizeQuestion(round.question, lang, t).answer
  const p = round.country.properties
  if (round.type === GAME_TYPES.CAPITALS) return getCapitalName(p.ISO_A2, lang) || p.capital
  return countryLabel(round.country, lang)
}

// ─── Placement: tap the country on the map ─────────────────────────────────

const WRONG = { fillColor: '#ff4d4d', fillOpacity: 0.5, weight: 2 }
const RIGHT = { fillColor: '#4ade80', fillOpacity: 0.6, weight: 2 }
const MISSED = { fillColor: colors.warning, fillOpacity: 0.6, color: colors.warning, weight: 2 }

export function PlacementRound({ survival, footer }: { survival: Survival; footer: React.ReactNode }) {
  const { t, i18n } = useTranslation()
  const mapRef = useRef<WorldMapHandle>(null)
  const { round, wrongPicks, outcome, clickCountry } = survival
  const target: string = round!.country!.properties.ADMIN

  // Wrong countries in red, the answer once the round is over
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.geoJson.resetStyle()
    for (const layer of map.geoJson.getLayers()) {
      const name = layer.feature.properties.ADMIN
      if (outcome && name === target) layer.setStyle(outcome === 'correct' ? RIGHT : MISSED)
      else if (wrongPicks.includes(name)) layer.setStyle(WRONG)
    }
  }, [wrongPicks, outcome, target])

  // A new country: back to the world. A missed one: show where it was.
  useEffect(() => {
    mapRef.current?.setView([20, 0], 2, { animate: false })
  }, [target])
  useEffect(() => {
    if (outcome === 'failed') mapRef.current?.fitCountries([target], { maxZoom: 5 })
  }, [outcome, target])

  return (
    <View style={StyleSheet.absoluteFill}>
      <WorldMap ref={mapRef} onCountryPress={(layer) => clickCountry(layer.feature.properties.ADMIN)} />
      <View style={styles.mapPanel}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label">{t('mobile.game.find')}</Text>
          <Text variant="label" color={DIFFICULTY_COLORS[round!.difficulty]}>
            {t(`difficulties.${round!.difficulty}`)}
          </Text>
        </View>
        <Animated.View key={target} entering={FadeIn.duration(220)}>
          <Text variant="title" numberOfLines={2} adjustsFontSizeToFit style={{ marginTop: 2 }}>
            {countryLabel(round!.country!, i18n.language)}
          </Text>
        </Animated.View>
        {footer}
      </View>
    </View>
  )
}

// ─── Flags / Capitals: type the answer ─────────────────────────────────────

export function TypedRound({ survival, onSubmit }: { survival: Survival; onSubmit: (text: string) => string | null }) {
  const { t, i18n } = useTranslation()
  const { round, isPlaying, giveUp } = survival
  const country = round!.country!
  const isCapital = round!.type === GAME_TYPES.CAPITALS
  const askColor = isCapital ? gameColors.capitals : gameColors.flags
  const flag = getFlag(country.properties.ISO_A2)
  const [value, setValue] = useState('')
  const inputRef = useRef<TextInput>(null)

  const submit = (text = value) => {
    const result = onSubmit(text)
    if (result === 'wrong' || result === 'correct') setValue('')
  }
  // Submit as soon as the typed text is a right answer, like the website
  const onChangeText = (text: string) => {
    setValue(text)
    if (isPlaying && matchesWhileTyping(round, text)) submit(text)
  }
  const changeAnswer = useClearedAnswerGuard(value, onChangeText)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <View style={{ gap: space.lg }}>
      {/* Both rounds show a flag: say plainly which answer is expected */}
      <View style={[styles.ask, { borderColor: `${askColor}66`, backgroundColor: `${askColor}1F` }]}>
        <MaterialCommunityIcons name={isCapital ? 'city-variant-outline' : 'flag-variant'} size={18} color={askColor} />
        <Text variant="bodyStrong" color={askColor} style={{ flexShrink: 1, textAlign: 'center' }}>
          {t(isCapital ? 'survival.ask_capital' : 'survival.ask_flag')}
        </Text>
      </View>
      {isCapital ? (
        <Animated.View entering={ZoomIn.springify().dampingRatio(0.7)} style={styles.capitalCountry}>
          {flag && <Image source={flag} contentFit="contain" style={styles.smallFlag} />}
          <Text variant="title" numberOfLines={2} adjustsFontSizeToFit style={{ flexShrink: 1, textAlign: 'center' }}>
            {countryLabel(country, i18n.language)}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={ZoomIn.springify().dampingRatio(0.7)} style={styles.flagCard}>
          {flag ? (
            <Image source={flag} contentFit="contain" style={styles.flag} accessibilityLabel={t(`survival.prompt.${round!.type}`)} />
          ) : (
            <MaterialCommunityIcons name="flag-outline" size={64} color={colors.textFaint} />
          )}
        </Animated.View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={changeAnswer}
          onSubmitEditing={() => submit()}
          submitBehavior="submit"
          placeholder={t(isCapital ? 'survival.capital_placeholder' : 'placeholders.country_name')}
          placeholderTextColor={colors.textFaint}
          {...ANSWER_KEYBOARD_PROPS}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          returnKeyType="send"
          editable={isPlaying}
          style={[styles.input, !isPlaying && { opacity: 0.5 }]}
        />
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('survival.give_up')}
          onPress={giveUp}
          disabled={!isPlaying}
          style={[styles.iconButton, !isPlaying && { opacity: 0.4 }]}>
          <MaterialCommunityIcons name="skip-next" size={22} color={colors.danger} />
        </Touchable>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={clean(t('buttons.validate'))}
          onPress={() => submit()}
          disabled={!isPlaying || !value.trim()}
          style={[styles.iconButton, styles.submit, (!isPlaying || !value.trim()) && { opacity: 0.4 }]}>
          <MaterialCommunityIcons name="arrow-right" size={22} color={colors.bg} />
        </Touchable>
      </View>
    </View>
  )
}

// ─── Border Guess: one guess from the silhouette ───────────────────────────

function useSuggestions(pool: Feature[], value: string) {
  const { i18n } = useTranslation()
  const names = useMemo(() => {
    const lang = i18n.language
    return [...new Set(pool.map((country) => countryLabel(country, lang)))].sort((a, b) => a.localeCompare(b, lang))
  }, [pool, i18n.language])
  return useMemo(() => {
    const query = normalize(value)
    return query ? names.filter((name) => normalize(name).includes(query)).slice(0, 8) : []
  }, [names, value])
}

/** The input bar of a Border Guess round: suggestions, give up (−1 life), submit. */
export function GuessRoundInput({ survival, pool, onSubmit }: { survival: Survival; pool: Feature[]; onSubmit: (text: string) => string | null }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const suggestions = useSuggestions(pool, value)
  return (
    <GuessInputBar
      value={value}
      onChangeText={setValue}
      onSubmit={() => {
        const result = onSubmit(value)
        if (result === 'wrong' || result === 'correct') setValue('')
      }}
      onReveal={survival.giveUp}
      suggestions={suggestions}
      locked={!survival.isPlaying}
      placeholder={t('placeholders.country_examples')}
      accent={gameColors.survival}
      revealLabel={t('survival.give_up')}
      revealIcon="skip-next"
    />
  )
}

export const BORDER_POOL = BORDER_GUESS_COUNTRIES as Feature[]

/** The silhouette of a Border Guess round, read-only (also what a spectator sees). */
export function BorderSilhouette({ country, height }: { country: Feature; height: number }) {
  return (
    <View style={[styles.silhouette, { height }]}>
      <Animated.View key={country.properties.ADMIN} entering={ZoomIn.springify().dampingRatio(0.7)} style={{ flex: 1 }}>
        <CountrySilhouette country={country as never} color={gameColors.border_guess} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  )
}

export function BorderRound({ survival, height }: { survival: Survival; height: number }) {
  const guesses = survival.guesses as BorderGuess[]
  return (
    <View style={{ gap: space.lg }}>
      <BorderSilhouette country={survival.round!.country!} height={height} />
      <View style={{ gap: space.sm }}>
        {guesses
          .map((guess, index) => ({ guess, index }))
          .reverse()
          .map(({ guess, index }) => (
            <BorderGuessRow key={`${guess.value}-${index}`} guess={guess} index={index} latest={index === guesses.length - 1} />
          ))}
      </View>
    </View>
  )
}

// ─── Quiz: one multiple-choice question ────────────────────────────────────

export function QuizRound({ survival }: { survival: Survival }) {
  const { t, i18n } = useTranslation()
  const { round, outcome, wrongPicks, chooseAnswer, isPlaying } = survival
  const question = round!.question!
  const localized = useMemo(() => localizeQuestion(question, i18n.language, t), [question, i18n.language, t])

  const choiceStyle = (id: string) => {
    if (!outcome) return null
    if (id === question.correctId) return { borderColor: colors.accent, backgroundColor: `${colors.accent}1F` }
    if (wrongPicks.includes(id)) return { borderColor: colors.danger, backgroundColor: `${colors.danger}1F` }
    return { opacity: 0.45 }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Text variant="heading" style={{ fontSize: 20, lineHeight: 27 }}>
        {localized.prompt}
      </Text>
      <View style={{ gap: space.sm }}>
        {localized.choices.map((choice: { id: string; label: string }, index: number) => (
          <Touchable
            key={choice.id}
            accessibilityRole="button"
            onPress={() => chooseAnswer(choice.id)}
            disabled={!isPlaying}
            style={[styles.choice, choiceStyle(choice.id)]}>
            <View style={styles.choiceKey}>
              <Text variant="caption">{index + 1}</Text>
            </View>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {choice.label}
            </Text>
          </Touchable>
        ))}
      </View>
      {outcome && localized.fact ? <Text variant="caption">{localized.fact}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  mapPanel: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.xl,
    backgroundColor: 'rgba(11,16,32,0.96)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  flagCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    aspectRatio: 3 / 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  flag: { width: '100%', height: '100%' },
  ask: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  capitalCountry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  smallFlag: { width: 64, height: 44 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: { backgroundColor: gameColors.survival, borderColor: gameColors.survival },
  silhouette: {
    borderRadius: radius.xl,
    backgroundColor: colors.ocean,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceKey: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
})
