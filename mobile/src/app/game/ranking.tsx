// "Country Ranking": order countries by population, area or GDP, in up to 3 attempts.
// Daily (shared set) or infinite (category and country count of your choice).
// Game rules come from the website hook (useRankingGameState).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useRankingGameState from '@shared/hooks/useRankingGameState'
import { getCountryName } from '@shared/utils/getCountryName'

import { GameTopBar, HudPill } from '@/components/game/GameTopBar'
import { RankingLeaderboard } from '@/components/game/RankingLeaderboard'
import { ResultsSheet } from '@/components/game/ResultsSheet'
import { SortableList } from '@/components/game/SortableList'
import { type CountryFeature } from '@/components/map/geometry'
import { Button, Text, Touchable } from '@/components/ui'
import { DIFFICULTY_COLORS } from '@/games'
import { getFlag } from '@/flags'
import { clean } from '@/i18n'
import { navigate } from '@/shims/react-router-dom'
import { colors, gameColors, radius, space } from '@/theme'

const ACCENT = gameColors.ranking
const ROW_HEIGHT = 54
const ROW_GAP = space.sm
const MAX_ATTEMPTS = 3
const MIN_COUNT = 3
const MAX_COUNT = 20

type IconName = keyof typeof MaterialCommunityIcons.glyphMap
type Criterion = { key: 'population' | 'area' | 'gdp' }

const CATEGORIES: { key: Criterion['key'] | null; icon: IconName }[] = [
  { key: null, icon: 'dice-5-outline' },
  { key: 'population', icon: 'account-group-outline' },
  { key: 'area', icon: 'map-outline' },
  { key: 'gdp', icon: 'cash-multiple' },
]

// Same ranges as the website slider.
const COUNT_PRESETS = [
  { labelKey: 'difficulties.easy_range', value: 5, color: DIFFICULTY_COLORS.Facile, active: (n: number) => n <= 5 },
  { labelKey: 'difficulties.medium_range', value: 9, color: DIFFICULTY_COLORS.Moyen, active: (n: number) => n >= 6 && n <= 12 },
  { labelKey: 'difficulties.hard_range', value: 15, color: DIFFICULTY_COLORS.Difficile, active: (n: number) => n >= 13 },
]

const keyOf = (country: CountryFeature) => `${country.properties.ISO_A3}-${country.properties.ADMIN}`

function CountryRow({
  country,
  index,
  lang,
  state,
  draggable,
}: {
  country: CountryFeature
  index: number
  lang: string
  state?: 'correct' | 'wrong'
  draggable?: boolean
}) {
  const flag = getFlag(country.properties.ISO_A2)
  const tint = state === 'correct' ? colors.accent : state === 'wrong' ? colors.danger : null
  return (
    <View style={[styles.row, tint && { borderColor: tint, backgroundColor: `${tint}14` }]}>
      <Text variant="number" color={tint ?? ACCENT} style={styles.rowIndex}>
        {index + 1}
      </Text>
      {flag && <Image source={flag} contentFit="cover" style={styles.flag} />}
      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
        {getCountryName(country.properties.ISO_A2, lang) || country.properties.ADMIN}
      </Text>
      {draggable && <MaterialCommunityIcons name="drag-horizontal-variant" size={22} color={colors.textMuted} />}
      {state && <MaterialCommunityIcons name={state === 'correct' ? 'check' : 'close'} size={20} color={tint!} />}
    </View>
  )
}

function CorrectRanking({ correctOrder, countries, values }: { correctOrder: CountryFeature[]; countries: CountryFeature[]; values: Map<string, string> }) {
  const { t, i18n } = useTranslation()
  return (
    <View style={styles.card}>
      <Text variant="label">{t('ranking.correct_ranking')}</Text>
      {correctOrder.map((country, index) => {
        const playerIndex = countries.findIndex((c) => keyOf(c) === keyOf(country))
        const correct = playerIndex === index
        const flag = getFlag(country.properties.ISO_A2)
        return (
          <Animated.View key={keyOf(country)} entering={FadeInDown.delay(index * 40).springify().damping(18)} style={styles.resultRow}>
            <Text variant="bodyStrong" color={correct ? colors.accent : colors.danger} style={styles.rowIndex}>
              {index + 1}
            </Text>
            {flag && <Image source={flag} contentFit="cover" style={styles.flag} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {getCountryName(country.properties.ISO_A2, i18n.language) || country.properties.ADMIN}
              </Text>
              <Text variant="caption" color={correct ? colors.accent : colors.warning} numberOfLines={1}>
                {correct
                  ? t('mobile.ranking.well_placed')
                  : t('mobile.ranking.placed_at', { position: playerIndex + 1, gap: Math.abs(playerIndex - index) })}
              </Text>
            </View>
            <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
              {values.get(country.properties.ISO_A3 ?? '') ?? '—'}
            </Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

function InfiniteSetup({ count, onCount, onPick }: { count: number; onCount: (n: number) => void; onPick: (key: Criterion['key'] | null) => void }) {
  const { t } = useTranslation()
  return (
    <View style={{ gap: space.lg }}>
      <View style={styles.card}>
        <Text variant="label">{t('mobile.ranking.countries')}</Text>
        <View style={styles.stepper}>
          <Touchable accessibilityLabel="-" onPress={() => onCount(Math.max(MIN_COUNT, count - 1))} style={styles.stepperButton}>
            <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
          </Touchable>
          <Text variant="hero" color={ACCENT} style={{ minWidth: 72, textAlign: 'center' }}>
            {count}
          </Text>
          <Touchable accessibilityLabel="+" onPress={() => onCount(Math.min(MAX_COUNT, count + 1))} style={styles.stepperButton}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
          </Touchable>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {COUNT_PRESETS.map((preset) => {
            const active = preset.active(count)
            return (
              <Touchable
                key={preset.labelKey}
                onPress={() => onCount(preset.value)}
                style={[styles.preset, active && { borderColor: preset.color, backgroundColor: `${preset.color}14` }]}>
                <Text variant="bodyStrong" color={active ? preset.color : colors.textMuted} style={{ fontSize: 13 }} numberOfLines={1}>
                  {t(preset.labelKey)}
                </Text>
              </Touchable>
            )
          })}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('ranking.choose_category')}</Text>
        <View style={styles.categories}>
          {CATEGORIES.map((category) => (
            <Touchable key={category.key ?? 'random'} onPress={() => onPick(category.key)} style={styles.category}>
              <MaterialCommunityIcons name={category.icon} size={28} color={ACCENT} />
              <Text variant="bodyStrong">{t(`ranking.${category.key ?? 'random'}`)}</Text>
            </Touchable>
          ))}
        </View>
      </View>
    </View>
  )
}

export default function RankingScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { mode = 'daily' } = useLocalSearchParams<{ mode?: string }>()
  const isDaily = mode === 'daily'
  const [countryCount, setCountryCount] = useState(5)
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)
  const {
    criterion,
    countries,
    countryValues,
    reorderCountries,
    status,
    score,
    totalError,
    correctOrder,
    handleSubmit,
    startNextRound,
    startInfiniteRound,
    dailyKey,
    attemptNumber,
    positionFeedback,
    retryAttempt,
  } = useRankingGameState(isDaily ? 'daily' : 'infinite', { countryCount })

  const list = countries as CountryFeature[]
  const feedback = positionFeedback as boolean[] | null
  const crit = criterion as Criterion | null
  const isSubmitted = status === 'submitted'
  const positionsLabel = (count: number) => t('units.position', { count })

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <Text variant="label" color={ACCENT}>
          {isDaily ? t('mobile.home.daily') : t('mobile.home.infinite')} · {t('ranking.title')}
        </Text>

        {status === 'choosing-category' && (
          <InfiniteSetup count={countryCount} onCount={setCountryCount} onPick={(key) => startInfiniteRound(key)} />
        )}

        {crit && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.criterion}>
            <Text variant="label">{t('labels.criterion')}</Text>
            <Text variant="title" color={ACCENT}>
              {t(`ranking.${crit.key}`)}
            </Text>
            <Text variant="caption">{t(`mobile.ranking.instruction_${crit.key}`)}</Text>
          </Animated.View>
        )}

        {status === 'playing' && (
          <>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {feedback ? t('mobile.ranking.feedback_hint') : t('mobile.ranking.drag_hint')}
            </Text>

            {feedback ? (
              <View style={{ gap: ROW_GAP }}>
                {list.map((country, index) => (
                  <CountryRow key={keyOf(country)} country={country} index={index} lang={i18n.language} state={feedback[index] ? 'correct' : 'wrong'} />
                ))}
              </View>
            ) : (
              <SortableList
                items={list}
                keyOf={keyOf}
                onReorder={reorderCountries}
                rowHeight={ROW_HEIGHT}
                gap={ROW_GAP}
                renderItem={(country, index) => <CountryRow country={country} index={index} lang={i18n.language} draggable />}
              />
            )}

            {feedback ? (
              <Button
                label={t('mobile.ranking.retry', { attempt: attemptNumber + 1, max: MAX_ATTEMPTS })}
                color={ACCENT}
                onPress={retryAttempt}
                icon={<MaterialCommunityIcons name="replay" size={20} color={colors.onAccent} />}
              />
            ) : (
              <Button
                label={clean(t('buttons.submit_ranking'))}
                color={ACCENT}
                onPress={handleSubmit}
                icon={<MaterialCommunityIcons name="check" size={20} color={colors.onAccent} />}
              />
            )}
          </>
        )}

        {isSubmitted && !isDaily && (
          <Animated.View entering={FadeIn.duration(220)} style={{ gap: space.md }}>
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text variant="hero" color={score ? ACCENT : colors.warning}>
                {score} {t('units.pts')}
              </Text>
              <Text variant="caption">
                {clean(t('ranking.total_error')).replace(/\s*:$/, '')} : {totalError} {positionsLabel(totalError)}
              </Text>
            </View>
            <CorrectRanking correctOrder={correctOrder} countries={list} values={countryValues} />
            <Button
              label={t('buttons.next_round')}
              color={ACCENT}
              onPress={startNextRound}
              icon={<MaterialCommunityIcons name="arrow-right" size={20} color={colors.onAccent} />}
            />
          </Animated.View>
        )}
      </ScrollView>

      {!(isSubmitted && isDaily) && (
        <GameTopBar confirmQuit={false}>
          {status === 'playing' && <HudPill icon="target" label={`${attemptNumber} / ${MAX_ATTEMPTS}`} color={ACCENT} />}
        </GameTopBar>
      )}

      {isSubmitted && isDaily && dailyKey && score != null && (
        <ResultsSheet
          title={score > 0 ? t('mobile.ranking.solved') : t('mobile.ranking.failed')}
          score={score}
          scoreLabel={t('units.pts')}
          accent={score > 0 ? ACCENT : colors.warning}
          stats={[
            { label: t('mobile.ranking.attempts'), value: `${attemptNumber} / ${MAX_ATTEMPTS}` },
            { label: clean(t('ranking.total_error')).replace(/\s*:$/, ''), value: `${totalError}`, color: totalError ? colors.warning : colors.accent },
          ]}
          save={{
            kind: 'ranking',
            dailyKey,
            totalError,
            attemptsUsed: attemptNumber,
            playerOrder: list.map((country) => country.properties.ADMIN),
          }}
          share={{
            gameType: 'RANKING',
            difficulty: 'Daily',
            details: t('share.details_ranking_error', { count: totalError }),
            challenge: { route: '/ranking', dailyKey, solved: true },
          }}
          onSaved={() => setLeaderboardVersion((version) => version + 1)}
          onHome={() => navigate('/')}>
          <CorrectRanking correctOrder={correctOrder} countries={list} values={countryValues} />
          <RankingLeaderboard dailyKey={dailyKey} refreshKey={leaderboardVersion} />
        </ResultsSheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.lg },
  criterion: {
    alignItems: 'center',
    gap: 2,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIndex: { width: 24, textAlign: 'center' },
  flag: { width: 30, height: 20, borderRadius: 3 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6 },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  category: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
