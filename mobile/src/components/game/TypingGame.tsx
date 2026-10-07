// Shared screen for the "type the answer" games (Flags, Capitals).
// Game rules come from the website hooks (useFlagGameState / useCapitalsGameState / useAscensionState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useEffect, useEffectEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { matchKnownAnswer } from '@shared/utils/answerLexicon'

import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { ResultsSheet, type SaveConfig } from '@/components/game/ResultsSheet'
import { Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { DIFFICULTY_COLORS } from '@/games'
import { clean } from '@/i18n'
import { navigate } from '@/shims/react-router-dom'
import { colors, fonts, radius, space } from '@/theme'

type GameState = any
type Feature = { properties: Record<string, any> }

export type TypingGameConfig = {
  // Shared code identifiers (scores, share texts)
  gameType: string
  scoreGameType: string
  accent: string
  promptKey: string
  placeholderKey: string
  shareDetailsKey: string
  // Every accepted answer for the target, used to auto-submit while typing
  acceptedAnswers: (feature: Feature) => string[]
  // Answer shown once revealed
  answerLabel: (feature: Feature, lang: string) => string
  // Extra clue under the flag (e.g. the country name in Capitals)
  clue?: (feature: Feature, lang: string) => string
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  return `${Math.floor(totalSeconds / 60)}m${String(totalSeconds % 60).padStart(2, '0')}s`
}

export function TypingGame({
  config,
  state,
  difficulty,
  continent,
  isTraining,
  ascension,
}: {
  config: TypingGameConfig
  state: GameState
  difficulty: string | null
  continent: string | null
  isTraining: boolean
  ascension: { presetName: string | null } | null
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)
  const {
    targetCountry,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    inputValue,
    setInputValue,
    handleSubmit,
    revealedName,
    seeCountry,
    restartGame,
    currentPhase,
    phaseCountRemaining,
    totalPhaseCount,
    phaseStats,
  } = state

  // Submit as soon as the typed text matches an accepted answer, like the website.
  const shouldAutoSubmit = Boolean(
    inputValue.trim() &&
      targetCountry &&
      !revealedName &&
      !isGameOver &&
      matchKnownAnswer(inputValue, config.acceptedAnswers(targetCountry), { whileTyping: true })
  )
  const autoSubmit = useEffectEvent(() => handleSubmit())
  useEffect(() => {
    if (shouldAutoSubmit) autoSubmit()
  }, [shouldAutoSubmit])

  // Keep the keyboard up from one country to the next
  useEffect(() => {
    if (targetCountry && !revealedName && !isGameOver) inputRef.current?.focus()
  }, [targetCountry, revealedName, isGameOver])

  // useAscensionState doesn't expose targetCountryISO
  const targetCountryISO: string | null = targetCountry?.properties?.ISO_A2 ?? null
  const flag = getFlag(targetCountryISO)
  const progress = stats.total ? (stats.found + stats.skipped) / stats.total : 0
  const remaining = stats.total - stats.found - stats.skipped
  const phaseColor = currentPhase ? DIFFICULTY_COLORS[currentPhase] : null
  const locked = !!revealedName || isGameOver

  const save: SaveConfig | null = isTraining
    ? null
    : ascension
      ? ascension.presetName
        ? { kind: 'ascension', gameType: config.gameType, presetName: ascension.presetName, timer, stats, phaseStats }
        : null
      : { kind: 'standard', gameType: config.scoreGameType, difficulty: (difficulty ?? continent)!, elapsedTime: timer, continent }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.lg }]}>
          {currentPhase && (
            <View style={styles.row}>
              <Text variant="label" color={phaseColor ?? colors.textMuted}>
                {t('mobile.game.phase')} · {t(`difficulties.${currentPhase}`)}
              </Text>
              <Text variant="caption">
                {phaseCountRemaining}/{totalPhaseCount} {t('mobile.game.remaining')}
              </Text>
            </View>
          )}

          <View style={{ gap: 6 }}>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${progress * 100}%`, backgroundColor: config.accent }]} />
            </View>
            <Text variant="caption">
              {stats.found}/{stats.total} {t('mobile.game.found')} · {remaining} {t('mobile.game.remaining')}
            </Text>
          </View>

          {targetCountry && (
            <Animated.View key={targetCountryISO ?? targetCountry.properties.ADMIN} entering={ZoomIn.springify().damping(16)} style={styles.flagCard}>
              {flag ? (
                <Image source={flag} contentFit="contain" style={styles.flag} accessibilityLabel={t(config.promptKey)} />
              ) : (
                <MaterialCommunityIcons name="flag-outline" size={64} color={colors.textFaint} />
              )}
            </Animated.View>
          )}

          <View style={{ alignItems: 'center', gap: space.xs }}>
            <Text variant="label">{t(config.promptKey)}</Text>
            {config.clue && targetCountry && (
              <Animated.View key={targetCountryISO} entering={FadeIn.duration(220)}>
                <Text variant="title" numberOfLines={2} adjustsFontSizeToFit style={{ textAlign: 'center' }}>
                  {config.clue(targetCountry, i18n.language)}
                </Text>
              </Animated.View>
            )}
          </View>

          {revealedName && targetCountry && (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.reveal}>
              <MaterialCommunityIcons name="eye-outline" size={18} color={colors.warning} />
              <Text variant="heading" color={colors.warning}>
                {config.answerLabel(targetCountry, i18n.language)}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {!isGameOver && (
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
            <TextInput
              ref={inputRef}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={() => handleSubmit()}
              submitBehavior="submit"
              placeholder={t(config.placeholderKey)}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="words"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              returnKeyType="send"
              editable={!locked}
              style={[styles.input, locked && { opacity: 0.5 }]}
            />
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('mobile.game.reveal')}
              onPress={seeCountry}
              disabled={locked}
              style={[styles.iconButton, locked && { opacity: 0.4 }]}>
              <MaterialCommunityIcons name="eye-outline" size={22} color={colors.text} />
            </Touchable>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={clean(t('buttons.validate'))}
              onPress={() => handleSubmit()}
              disabled={locked || !inputValue.trim()}
              style={[styles.iconButton, { backgroundColor: config.accent, borderColor: config.accent }, (locked || !inputValue.trim()) && { opacity: 0.4 }]}>
              <MaterialCommunityIcons name="arrow-right" size={22} color={colors.bg} />
            </Touchable>
          </View>
        )}
      </KeyboardAvoidingView>

      {!isGameOver && (
        <GameTopBar>
          <HudPill icon="timer-outline" label={displayTimer} />
          {!isTraining && <HudPill icon="star-four-points-outline" label={String(score)} color={colors.accent} />}
        </GameTopBar>
      )}

      {isGameOver && (
        <ResultsSheet
          score={score}
          accent={config.accent}
          stats={[
            { label: t('labels.countries_found'), value: `${stats.found}/${stats.total}`, color: colors.accent },
            { label: t('mobile.game.time'), value: formatDuration(timer) },
            { label: clean(t('stats.first_try')), value: String(stats.foundFirstTry ?? 0) },
          ]}
          save={save}
          share={{
            gameType: config.scoreGameType,
            difficulty: difficulty ?? continent ?? ascension?.presetName,
            details: t(config.shareDetailsKey, { found: stats.found, total: stats.total, time: formatDuration(timer) }),
          }}
          onReplay={restartGame}
          onHome={() => navigate('/')}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
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
  reveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: `${colors.warning}1A`,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minWidth: 0,
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
})
