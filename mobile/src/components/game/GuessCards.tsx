// Guesses of the "guess a country" games, shared by their screens and the survival rounds:
// a Border Guess row (distance and direction) and a Country Clue card (every hint).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated'

import { getCountryName } from '@shared/utils/getCountryName'

import { Text } from '@/components/ui'
import { getFlag } from '@/flags'
import { colors, gameColors, radius, space } from '@/theme'

const BORDER_ACCENT = gameColors.border_guess
const CLUE_ACCENT = gameColors.country_clue

export type BorderGuess = {
  value: string
  iso: string | null
  isCorrect: boolean
  distanceKm: number | null
  direction: string | null
  directionArrow: string | null
}

// The latest guess is highlighted: it tells where to look next.
export function BorderGuessRow({ guess, index, latest }: { guess: BorderGuess; index: number; latest: boolean }) {
  const { t, i18n } = useTranslation()
  const name = (guess.iso && getCountryName(guess.iso, i18n.language)) || guess.value
  const color = guess.isCorrect ? colors.accent : colors.danger
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      layout={LinearTransition.springify()}
      style={[borderStyles.guess, latest && !guess.isCorrect && borderStyles.guessLatest]}>
      <Text variant="caption" style={{ width: 22 }}>
        {index + 1}
      </Text>
      <MaterialCommunityIcons name={guess.isCorrect ? 'check-circle' : 'close-circle'} size={18} color={color} />
      {/* Name and hint share the width by their own size: a long hint wraps instead of hiding a short name. */}
      <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
        {name}
      </Text>
      {!guess.isCorrect && guess.distanceKm != null && (
        <View style={borderStyles.hint}>
          {guess.directionArrow && (
            <Text variant="bodyStrong" color={BORDER_ACCENT} style={latest && { fontSize: 22, lineHeight: 26 }}>
              {guess.directionArrow}
            </Text>
          )}
          {latest ? (
            // Bigger on the latest guess: the direction goes under the distance so the name keeps its room.
            <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
              <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
                {guess.distanceKm.toLocaleString(i18n.language)} km
              </Text>
              {guess.direction && (
                <Text variant="caption" numberOfLines={1}>
                  {t(`mobile.directions.${guess.direction}`)}
                </Text>
              )}
            </View>
          ) : (
            <Text variant="caption" style={{ flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
              {guess.distanceKm.toLocaleString(i18n.language)} km
              {guess.direction ? ` · ${t(`mobile.directions.${guess.direction}`)}` : ''}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  )
}

type Tone = 'match' | 'higher' | 'lower' | 'neutral'
type Hint = { arrow: string; tone: Tone }
export type ClueGuess = {
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
function hintLabel(t: (key: string) => string, metric: 'hemisphere' | 'area' | 'population', guess: ClueGuess, hint: Hint) {
  if (guess.isCorrect) return t('mobile.clue.exact')
  return t(`mobile.clue.${metric}_${hint.tone}`)
}

function HintChip({ label, hint, text, detail }: { label: string; hint: Hint; text: string; detail?: string }) {
  const color = TONE_COLORS[hint.tone]
  return (
    <View style={[clueStyles.chip, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
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

// See the website's utils/clueProgress.js: compared with the previous guess (negative: closer), closest guess
export type ClueProgress = { deltaKm: number | null; closest: boolean }

function ProgressChips({ progress }: { progress?: ClueProgress }) {
  const { t, i18n } = useTranslation()
  if (!progress || (progress.deltaKm == null && !progress.closest)) return null
  const { deltaKm, closest } = progress
  const km = deltaKm == null ? '' : Math.abs(deltaKm).toLocaleString(i18n.language)
  const color = deltaKm == null ? colors.textMuted : deltaKm < 0 ? colors.accent : deltaKm > 0 ? '#60A5FA' : colors.textMuted
  return (
    <View style={clueStyles.progress}>
      {deltaKm != null && (
        <View style={[clueStyles.progressChip, { backgroundColor: `${color}1F` }]}>
          <Text variant="caption" color={color} style={{ fontWeight: '700' }}>
            {deltaKm < 0 ? `🔥 ${t('country_clue.closer', { km })}` : deltaKm > 0 ? `❄️ ${t('country_clue.farther', { km })}` : t('country_clue.same_distance')}
          </Text>
        </View>
      )}
      {closest && (
        <View style={[clueStyles.progressChip, { backgroundColor: `${colors.warning}1F` }]}>
          <Text variant="caption" color={colors.warning} style={{ fontWeight: '700' }}>
            📍 {t('country_clue.closest')}
          </Text>
        </View>
      )}
    </View>
  )
}

export function ClueGuessCard({ guess, index, progress }: { guess: ClueGuess; index: number; progress?: ClueProgress }) {
  const { t, i18n } = useTranslation()
  const name = (guess.isoA2 && getCountryName(guess.isoA2, i18n.language)) || guess.value
  const flag = getFlag(guess.isoA2)
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      layout={LinearTransition.springify()}
      style={[clueStyles.card, guess.isCorrect && { borderColor: colors.accent }]}>
      <View style={clueStyles.cardHeader}>
        <Text variant="caption" style={{ width: 18 }}>
          {index + 1}
        </Text>
        {flag && <Image source={flag} contentFit="cover" style={clueStyles.flag} accessible={false} alt="" />}
        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </Text>
        {guess.isCorrect ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
        ) : (
          <View style={clueStyles.distance}>
            <Text variant="bodyStrong" color={CLUE_ACCENT}>
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
          <ProgressChips progress={progress} />
          {guess.direction && (
            <Text variant="caption">
              {t('country_clue.metric_direction')} : {t(`mobile.directions.${guess.direction}`)}
            </Text>
          )}
          <View style={clueStyles.chips}>
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

const borderStyles = StyleSheet.create({
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
  guessLatest: { borderColor: BORDER_ACCENT, backgroundColor: `${BORDER_ACCENT}14` },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, marginLeft: 'auto' },
})

/**
 * The guesses of a finished game, one short line each: number, flag, name, direction and distance, and the change
 * from the previous guess (the full cards stay in the game screen).
 */
export function ClueGuessSummary({ guesses, progress }: { guesses: ClueGuess[]; progress: ClueProgress[] }) {
  const { i18n } = useTranslation()
  return (
    <View style={clueStyles.summary}>
      {guesses.map((guess, index) => {
        const name = (guess.isoA2 && getCountryName(guess.isoA2, i18n.language)) || guess.value
        const flag = getFlag(guess.isoA2)
        const delta = progress[index]?.deltaKm
        const closest = progress[index]?.closest
        return (
          <View key={`${guess.value}-${index}`} style={[clueStyles.summaryRow, index > 0 && clueStyles.summaryDivider]}>
            <Text variant="caption" style={{ width: 18 }}>
              {index + 1}
            </Text>
            {flag && <Image source={flag} contentFit="cover" style={clueStyles.flag} accessible={false} alt="" />}
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {closest ? '📍 ' : ''}
              {name}
            </Text>
            {guess.isCorrect ? (
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} />
            ) : (
              <>
                {delta != null && delta !== 0 && (
                  <Text variant="caption" color={delta < 0 ? colors.accent : '#60A5FA'} style={{ fontVariant: ['tabular-nums'] }}>
                    {delta < 0 ? '−' : '+'}
                    {Math.abs(delta).toLocaleString(i18n.language)}
                  </Text>
                )}
                <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'], minWidth: 84, textAlign: 'right' }}>
                  {guess.directionArrow} {guess.distanceKm?.toLocaleString(i18n.language)} km
                </Text>
              </>
            )}
          </View>
        )
      })}
    </View>
  )
}

const clueStyles = StyleSheet.create({
  summary: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  summaryDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  progress: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  progressChip: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
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
})
