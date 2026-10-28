// "Voyage Voyage": link two countries through shared land borders, with the fewest steps.
// Daily (shared route) or infinite. Game rules come from the website hook (useVoyageVoyageState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import countries from '@shared/data/countriesWithDifficulty_FR.json'
import useVoyageVoyageState from '@shared/hooks/useVoyageVoyageState'
import { useDailyPlayedElsewhere } from '@shared/hooks/useDailyPlayedElsewhere'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getAllCountryNames, getCountryName } from '@shared/utils/getCountryName'
import { normalize } from '@shared/utils/normalizeAnswer'

import { confirmAction } from '@/components/confirm'
import { useAccount } from '@/account/auth'
import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { DailyPlayedElsewhere } from '@/components/game/DailyPlayedElsewhere'
import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { GuessInputBar } from '@/components/game/GuessInputBar'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { type CountryFeature } from '@/components/map/geometry'
import { VOYAGE_COLORS, VoyageMap, type VoyageColor } from '@/components/map/VoyageMap'
import { Button, Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { clean } from '@/i18n'
import { navigate } from '@/shims/react-router-dom'
import { toast } from '@/shims/react-toastify'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.voyage_voyage

type Guess = { feature: CountryFeature; color: VoyageColor }

// Territories without an ISO code (Somaliland, Kosovo…) have no borders: left out, like on the website.
const ALL_FEATURES = (countries as { features: CountryFeature[] }).features.filter((f) => f.properties.ISO_A2)

// Every accepted name (French, aliases, English, Russian), normalized, for typed answers in any language.
const NAMES = ALL_FEATURES.map((feature) => {
  const { ISO_A2, ADMIN, aliases } = feature.properties
  const names: string[] = getAllCountryNames(ISO_A2, ADMIN, (aliases as string[] | undefined) ?? [])
  const keys: string[] = names.filter(Boolean).map((name) => normalize(name))
  return { feature, keys }
})

function findFeature(input: string) {
  const key = normalize(input)
  return NAMES.find((entry) => entry.keys.includes(key))?.feature ?? null
}

function nameOf(feature: CountryFeature, lang: string) {
  return getCountryName(feature.properties.ISO_A2, lang) || feature.properties.ADMIN
}

function CountryChip({ feature, color, lang }: { feature: CountryFeature; color: VoyageColor | 'missed'; lang: string }) {
  const tint = color === 'missed' ? colors.textMuted : VOYAGE_COLORS[color]
  const flag = getFlag(feature.properties.ISO_A2)
  return (
    <View style={[styles.chip, { borderColor: `${tint}88`, backgroundColor: `${tint}1A` }, color === 'missed' && styles.chipMissed]}>
      {flag && <Image source={flag} contentFit="cover" style={styles.chipFlag} accessible={false} alt="" />}
      <Text variant="bodyStrong" color={color === 'missed' ? colors.textMuted : colors.text} style={{ fontSize: 13 }} numberOfLines={1}>
        {nameOf(feature, lang)}
      </Text>
    </View>
  )
}

function OptimalPath({ path, chain }: { path: CountryFeature[]; chain: CountryFeature[] }) {
  const { t, i18n } = useTranslation()
  const guessed = new Set(chain.map((feature) => feature.properties.ISO_A2))
  return (
    <View style={styles.card}>
      <Text variant="label">{clean(t('labels.optimal_path')).replace(/\s*:$/, '')}</Text>
      <View style={styles.chain}>
        {path.map((feature, index) => (
          <View key={feature.properties.ISO_A2} style={styles.chainItem}>
            {index > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textFaint} />}
            <CountryChip feature={feature} color={guessed.has(feature.properties.ISO_A2) ? 'green' : 'missed'} lang={i18n.language} />
          </View>
        ))}
      </View>
    </View>
  )
}

export default function VoyageScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { mode = 'daily' } = useLocalSearchParams<{ mode?: string }>()
  const isDaily = mode === 'daily'
  const {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    guessHistory,
    chainHistory,
    optimalLength,
    optimalPath,
    unguessedOptimalPath,
    isGameOver,
    score,
    hintsUsed,
    revealedISOs,
    showInitials,
    useHint: takeHint,
    submitGuess,
    resetGame,
    dailyKey,
  } = useVoyageVoyageState(isDaily ? 'daily' : 'infinite')
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.VOYAGE_VOYAGE,
    dailyKey,
    started: guessHistory.length > 1 || hintsUsed.length > 0 || isGameOver,
    enabled: isDaily,
  })
  const [input, setInput] = useState('')
  // Keep the map compact so the guesses stay on screen, smaller still while typing.
  const { height: windowHeight } = useWindowDimensions()
  const keyboardVisible = useKeyboardVisible()
  const mapHeight = Math.max(130, Math.round(windowHeight * (keyboardVisible ? 0.2 : 0.3)))
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)

  const chain = validatedChain as CountryFeature[]
  const wrongs = wrongGuesses as CountryFeature[]
  const unguessed = unguessedOptimalPath as CountryFeature[]
  const stepsUsed = chain.length - 1
  const isPerfect = isGameOver && stepsUsed === optimalLength
  const hintFeatures = unguessed.filter((feature) => (revealedISOs as Set<string | undefined>).has(feature.properties.ISO_A2))
  const stepsLabel = (count: number) => (count === 1 ? t('units.step_one') : t('units.step_other'))
  const errorsLabel = (count: number) => (count === 1 ? t('units.error_one') : t('units.error_other'))

  const suggestions = useMemo(() => {
    const key = normalize(input)
    if (key.length < 2) return []
    const used = new Set<string | undefined>((guessHistory as Guess[]).map((guess) => guess.feature.properties.ISO_A2))
    return NAMES.filter((entry) => !used.has(entry.feature.properties.ISO_A2) && entry.keys.some((name) => name.startsWith(key)))
      .slice(0, 8)
      .map((entry) => nameOf(entry.feature, i18n.language))
  }, [input, guessHistory, i18n.language])

  const onSubmit = () => {
    const value = input.trim()
    if (!value) return
    const feature = findFeature(value)
    if (!feature) {
      toast.error(t('mobile.voyage.unknown_country'))
      return
    }
    if ((guessHistory as Guess[]).some((guess) => guess.feature.properties.ISO_A2 === feature.properties.ISO_A2)) {
      toast.info(t('mobile.voyage.already_guessed'))
      setInput('')
      return
    }
    submitGuess(feature.properties.ADMIN)
    setInput('')
  }

  const onNewPath = () => {
    confirmAction({
      title: t('voyage_voyage.confirm_new_path'),
      confirmLabel: clean(t('buttons.new_path')),
      cancelLabel: t('mobile.game.cancel'),
      destructive: false,
      onConfirm: resetGame,
    })
  }

  const HINTS: { type: 'next' | 'all' | 'initials'; label: string; enabled: boolean }[] = [
    { type: 'next', label: clean(t('buttons.next_country_hint')), enabled: unguessed.length > 0 },
    { type: 'all', label: clean(t('buttons.all_countries_hint')), enabled: hintsUsed.includes('next') && unguessed.length > 0 },
    { type: 'initials', label: clean(t('buttons.initials_hint')), enabled: hintsUsed.includes('all') },
  ]

  const resultTitle = isPerfect
    ? t('voyage_voyage.perfect_path')
    : `${t('voyage_voyage.arrived_in')} ${stepsUsed} ${stepsLabel(stepsUsed)}`

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={t('games.voyage_voyage.title')} game={elsewhere.game} accent={ACCENT}>
        <DailyLeaderboard
          gameType={GAME_TYPES.VOYAGE_VOYAGE}
          dailyKey={dailyKey}
          formatSecondary={(count) => `${count ?? 0} ${errorsLabel(count ?? 0)}`}
        />
      </DailyPlayedElsewhere>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md }]}>
          <Text variant="label" color={ACCENT}>
            {isDaily ? t('mobile.home.daily') : t('mobile.home.infinite')} · {t('games.voyage_voyage.title')}
          </Text>

          {startCountry && targetCountry && (
            <>
              <View style={{ gap: space.sm }}>
                <View style={styles.chain}>
                  {(chainHistory as Guess[]).map((guess, index) => (
                    <Animated.View key={guess.feature.properties.ISO_A2} entering={FadeInDown.springify().damping(18)} style={styles.chainItem}>
                      {index > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textFaint} />}
                      <CountryChip feature={guess.feature} color={guess.color} lang={i18n.language} />
                    </Animated.View>
                  ))}
                  {!isGameOver && (
                    <>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textFaint} />
                      {showInitials && unguessed.length > 0 ? (
                        unguessed.map((feature, index) => (
                          <View key={feature.properties.ISO_A2} style={styles.chainItem}>
                            {index > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textFaint} />}
                            <View style={[styles.chip, styles.chipMissed]}>
                              <Text variant="bodyStrong" color={colors.textMuted} style={{ fontSize: 13 }}>
                                {feature.properties.ADMIN.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={[styles.chip, styles.chipMissed]}>
                          <Text variant="bodyStrong" color={colors.textMuted} style={{ fontSize: 13 }}>
                            ?
                          </Text>
                        </View>
                      )}
                      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textFaint} />
                      <CountryChip feature={targetCountry} color="target" lang={i18n.language} />
                    </>
                  )}
                </View>

                {wrongs.length > 0 && (
                  <View style={styles.chain}>
                    {wrongs.map((feature) => (
                      <CountryChip key={feature.properties.ISO_A2} feature={feature} color="red" lang={i18n.language} />
                    ))}
                  </View>
                )}
              </View>

              <VoyageMap
                style={{ height: mapHeight }}
                start={startCountry}
                target={targetCountry}
                guesses={guessHistory as Guess[]}
                hints={hintFeatures}
                interactive
              />
            </>
          )}

          {!isGameOver && (
            <View style={{ gap: space.sm }}>
              <Text variant="label">{clean(t('labels.hints')).replace(/\s*:$/, '')}</Text>
              <View style={styles.hints}>
                {HINTS.map((hint) => {
                  const used = hintsUsed.includes(hint.type)
                  const disabled = used || !hint.enabled
                  return (
                    <Touchable
                      key={hint.type}
                      accessibilityRole="button"
                      onPress={() => takeHint(hint.type)}
                      disabled={disabled}
                      style={[styles.hint, used && { borderColor: ACCENT, backgroundColor: `${ACCENT}14` }, disabled && !used && { opacity: 0.4 }]}>
                      <Text variant="bodyStrong" color={used ? ACCENT : colors.text} style={{ fontSize: 13, textAlign: 'center' }} numberOfLines={2}>
                        {hint.label}
                      </Text>
                    </Touchable>
                  )
                })}
              </View>
              {!isDaily && (
                <Button
                  label={clean(t('buttons.new_path'))}
                  variant="ghost"
                  onPress={onNewPath}
                  icon={<MaterialCommunityIcons name="shuffle-variant" size={18} color={colors.text} />}
                />
              )}
            </View>
          )}

          {isGameOver && !isDaily && (
            <Animated.View entering={FadeIn.duration(220)} style={{ gap: space.md }}>
              <View style={styles.card}>
                <Text variant="heading" color={isPerfect ? colors.accent : colors.text}>
                  {resultTitle}
                </Text>
                <Text variant="caption">
                  {clean(t('labels.score'))} {score?.toFixed(1)} · {clean(t('labels.optimal'))} {optimalLength} · {wrongs.length} {errorsLabel(wrongs.length)}
                </Text>
              </View>
              {!isPerfect && <OptimalPath path={optimalPath as CountryFeature[]} chain={chain} />}
              <Button
                label={t('buttons.new_game')}
                color={ACCENT}
                onPress={resetGame}
                icon={<MaterialCommunityIcons name="arrow-right" size={20} color={colors.onAccent} />}
              />
            </Animated.View>
          )}
        </ScrollView>

        {!isGameOver && (
          <GuessInputBar
            value={input}
            onChangeText={setInput}
            onSubmit={onSubmit}
            suggestions={suggestions}
            locked={!startCountry}
            placeholder={t('placeholders.enter_country_on_path')}
            accent={ACCENT}
          />
        )}
      </KeyboardAvoidingView>

      {!(isGameOver && isDaily) && (
        <GameTopBar confirmQuit={false}>
          <HudPill icon="map-marker-path" label={`${Math.max(stepsUsed, 0)} / ${optimalLength}`} color={ACCENT} />
          <HudPill icon="close-circle-outline" label={`${wrongs.length}`} color={wrongs.length ? colors.danger : colors.text} />
        </GameTopBar>
      )}

      {isGameOver && isDaily && score != null && (
        <ResultsSheet
          title={resultTitle}
          score={score}
          scoreText={score.toFixed(1)}
          scoreLabel={t('units.pts')}
          accent={isPerfect ? colors.accent : ACCENT}
          stats={[
            { label: stepsLabel(stepsUsed), value: `${stepsUsed}` },
            { label: clean(t('labels.optimal')).replace(/\s*:$/, ''), value: `${optimalLength}` },
            { label: errorsLabel(wrongs.length), value: `${wrongs.length}`, color: wrongs.length ? colors.danger : undefined },
          ]}
          record={{
            gameType: GAME_TYPES.VOYAGE_VOYAGE,
            mode: 'daily',
            dailyKey,
            score,
            solved: true,
            attempts: stepsUsed,
            optimal: optimalLength,
            errors: wrongs.length,
            hints: hintsUsed.length,
          }}
          save={{
            kind: 'daily',
            gameType: GAME_TYPES.VOYAGE_VOYAGE,
            dailyKey,
            attempts: stepsUsed,
            elapsedTime: wrongs.length,
            guesses: chain.map((feature) => feature.properties.ADMIN),
            hints: hintsUsed.length,
            formatSecondary: (count) => `${count ?? 0} ${errorsLabel(count ?? 0)}`,
          }}
          share={{
            gameType: 'VOYAGE_VOYAGE',
            difficulty: 'Daily',
            scoreLabel: 'PTS',
            details: t('share.details_voyage', { steps: stepsUsed, optimal: optimalLength }),
            challenge: { route: '/voyage-voyage', dailyKey, solved: true },
          }}
          onSaved={() => setLeaderboardVersion((version) => version + 1)}
          onHome={() => navigate('/')}>
          {!isPerfect && <OptimalPath path={optimalPath as CountryFeature[]} chain={chain} />}
          <DailyLeaderboard
            gameType={GAME_TYPES.VOYAGE_VOYAGE}
            dailyKey={dailyKey}
            refreshKey={leaderboardVersion}
            formatSecondary={(count) => `${count ?? 0} ${errorsLabel(count ?? 0)}`}
          />
        </ResultsSheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  chain: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chainItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipMissed: { borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: 'transparent' },
  chipFlag: { width: 20, height: 14, borderRadius: 2 },
  hints: { flexDirection: 'row', gap: space.sm },
  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
