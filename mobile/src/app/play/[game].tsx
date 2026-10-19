// Game setup sheet for Placement / Flags / Capitals: difficulty, continent or Ascension. Survival has its own.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getTotalCapitalCountries, getTotalCapitalCountriesByContinent } from '@shared/hooks/useCapitalsGameState'
import { getTotalFlagCountries, getTotalFlagCountriesByContinent } from '@shared/hooks/useFlagGameState'
import { getTotalCountries, getTotalCountriesByContinent } from '@shared/hooks/useGameState'
import { ASCENSION_PRESETS, matchPreset } from '@shared/utils/ascensionPresets'
import { CONTINENTS } from '@shared/utils/continents'

import { SheetCloseButton } from '@/components/SheetCloseButton'
import { SurvivalSetupSheet } from '@/components/survival/SurvivalSetupSheet'
import { Button, Segmented, Text, Touchable } from '@/components/ui'
import { DIFFICULTIES, DIFFICULTY_COLORS, getGame } from '@/games'
import { colors, radius, space } from '@/theme'

type Phases = Record<string, number>
type Mode = 'standard' | 'ascension'
type Selection = 'difficulty' | 'continent'

const CONTINENT_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Europe: 'earth',
  Asie: 'earth',
  Afrique: 'earth',
  Amériques: 'earth-box',
  Océanie: 'island',
}

function countFunctions(gameId: string) {
  if (gameId === 'flags') return { byDifficulty: getTotalFlagCountries, byContinent: getTotalFlagCountriesByContinent }
  if (gameId === 'capitals') return { byDifficulty: getTotalCapitalCountries, byContinent: getTotalCapitalCountriesByContinent }
  return { byDifficulty: getTotalCountries, byContinent: getTotalCountriesByContinent }
}

function Stepper({ value, max, onChange, color }: { value: number; max: number; onChange: (v: number) => void; color: string }) {
  return (
    <View style={styles.stepper}>
      <Touchable
        accessibilityLabel="-"
        onPress={() => onChange(Math.max(0, value - 1))}
        onLongPress={() => onChange(0)}
        style={styles.stepperButton}>
        <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
      </Touchable>
      <Text variant="number" color={color} style={{ minWidth: 36, textAlign: 'center' }}>
        {value}
      </Text>
      <Touchable
        accessibilityLabel="+"
        onPress={() => onChange(Math.min(max, value + 1))}
        onLongPress={() => onChange(max)}
        style={styles.stepperButton}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
      </Touchable>
    </View>
  )
}

export default function GameSheet() {
  const { game } = useLocalSearchParams<{ game: string }>()
  return game === 'survival' ? <SurvivalSetupSheet /> : <GameSetupSheet />
}

function GameSetupSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  // `add`: the room the host adds this game to (see multi/add)
  const { game: gameId, multi, add } = useLocalSearchParams<{ game: string; multi?: string; add?: string }>()
  const game = getGame(gameId)!
  const counts = countFunctions(gameId)

  const [mode, setMode] = useState<Mode>('standard')
  const [selection, setSelection] = useState<Selection>('difficulty')
  const [difficulty, setDifficulty] = useState('Facile')
  const [continent, setContinent] = useState<string | null>(null)
  const [phases, setPhases] = useState<Phases>(() => ({ ...ASCENSION_PRESETS[1].phases }))

  const caps = useMemo(
    () => Object.fromEntries(DIFFICULTIES.filter((d) => d !== 'Hardcore').map((d) => [d, counts.byDifficulty(d)])),
    [counts]
  )
  const presetName: string | null = matchPreset(phases)
  const ascensionTotal = Object.values(phases).reduce((sum, n) => sum + n, 0)

  const start = (training: boolean) => {
    const params: Record<string, string> = { training: training ? '1' : '0', gameType: game.type }
    if (mode === 'ascension') {
      params.ascension = JSON.stringify(phases)
      if (presetName) params.preset = presetName
    } else if (selection === 'continent' && continent) {
      params.continent = continent
    } else {
      params.difficulty = difficulty
    }
    router.replace({ pathname: game.route as never, params })
  }

  const canPlay = mode === 'ascension' ? ascensionTotal > 0 : selection === 'difficulty' || !!continent

  // Same choices, played in a multiplayer room
  const startMulti = () => {
    const config =
      mode === 'ascension'
        ? { phases, presetName }
        : selection === 'continent' && continent
          ? { continent }
          : { difficulty }
    router.replace({ pathname: '/multi/create', params: { game: game.id, config: JSON.stringify(config), ...(add ? { add } : {}) } })
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xl, gap: space.lg }}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: `${game.color}22` }]}>
            <MaterialCommunityIcons name={game.icon} size={28} color={game.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" style={{ fontSize: 26 }}>
              {t(game.titleKey)}
            </Text>
            <Text variant="caption">{t(game.descKey)}</Text>
          </View>
          <SheetCloseButton />
        </View>

        {game.id !== 'hardcore' && <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'standard', label: t('mobile.setup.standard') },
            { value: 'ascension', label: t('mobile.setup.ascension') },
          ]}
        />}

        {mode === 'standard' ? (
          <>
            <Segmented<Selection>
              value={selection}
              onChange={setSelection}
              options={[
                { value: 'difficulty', label: t('selection.by_difficulty') },
                { value: 'continent', label: t('selection.by_continent') },
              ]}
            />
            <View style={styles.grid}>
              {selection === 'difficulty'
                ? DIFFICULTIES.map((name) => {
                    const active = difficulty === name
                    const color = DIFFICULTY_COLORS[name]
                    return (
                      <Touchable
                        key={name}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        onPress={() => setDifficulty(name)}
                        onLongPress={() => {
                          setDifficulty(name)
                          start(false)
                        }}
                        style={[
                          styles.option,
                          name === 'Hardcore' && styles.optionWide,
                          active && { borderColor: color, backgroundColor: `${color}14` },
                        ]}>
                        <Text variant="bodyStrong" color={color}>
                          {t(`difficulties.${name}`)}
                        </Text>
                        <Text variant="caption">{t('mobile.setup.countries', { count: counts.byDifficulty(name) })}</Text>
                      </Touchable>
                    )
                  })
                : CONTINENTS.map((item: { name: string; color: string }) => {
                    const active = continent === item.name
                    return (
                      <Touchable
                        key={item.name}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        onPress={() => setContinent(item.name)}
                        style={[styles.option, active && { borderColor: item.color, backgroundColor: `${item.color}14` }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialCommunityIcons name={CONTINENT_ICONS[item.name] ?? 'earth'} size={16} color={item.color} />
                          <Text variant="bodyStrong" color={item.color}>
                            {t(`continents.${item.name}`)}
                          </Text>
                        </View>
                        <Text variant="caption">{t('mobile.setup.countries', { count: counts.byContinent(item.name) })}</Text>
                      </Touchable>
                    )
                  })}
            </View>
          </>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {ASCENSION_PRESETS.map((preset: { name: string; icon: string; phases: Phases }) => {
                const active = presetName === preset.name
                const total = Object.values(preset.phases).reduce((sum, n) => sum + n, 0)
                return (
                  <Touchable
                    key={preset.name}
                    onPress={() =>
                      setPhases(
                        Object.fromEntries(Object.entries(preset.phases).map(([d, n]) => [d, Math.min(n, caps[d] ?? 0)]))
                      )
                    }
                    style={[styles.preset, active && { borderColor: colors.accent, backgroundColor: `${colors.accent}14` }]}>
                    <Text variant="bodyStrong">{preset.name === 'Progressif' ? t('presets.progressive') : preset.name}</Text>
                    <Text variant="caption">{t('mobile.setup.countries', { count: total })}</Text>
                  </Touchable>
                )
              })}
            </ScrollView>
            <View style={{ gap: space.sm }}>
              {Object.entries(caps).map(([name, max]) => (
                <View key={name} style={styles.phaseRow}>
                  <View>
                    <Text variant="bodyStrong" color={DIFFICULTY_COLORS[name]}>
                      {t(`difficulties.${name}`)}
                    </Text>
                    <Text variant="caption">max {max}</Text>
                  </View>
                  <Stepper
                    value={phases[name] ?? 0}
                    max={max}
                    color={DIFFICULTY_COLORS[name]}
                    onChange={(value) => setPhases((prev) => ({ ...prev, [name]: value }))}
                  />
                </View>
              ))}
              <Text variant="caption" style={{ textAlign: 'center', marginTop: space.xs }}>
                {presetName ? (presetName === 'Progressif' ? t('presets.progressive') : presetName) : t('presets.custom')} ·{' '}
                {t('mobile.setup.total', { count: ascensionTotal })}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {multi === '1' ? (
          <Button
            label={t('mobile.multi.continue')}
            onPress={startMulti}
            disabled={!canPlay}
            color={game.color}
            style={{ flex: 1 }}
            icon={<MaterialCommunityIcons name="account-group" size={20} color={colors.onAccent} />}
          />
        ) : (
          <>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('mobile.multi.title')}
              onPress={startMulti}
              disabled={!canPlay}
              style={[styles.multiButton, !canPlay && { opacity: 0.4 }]}>
              <MaterialCommunityIcons name="account-group" size={22} color={colors.text} />
            </Touchable>
            <Button
              label={t('mobile.setup.training')}
              variant="secondary"
              onPress={() => start(true)}
              disabled={mode === 'standard' && selection === 'continent' && !continent}
              style={{ flex: 1 }}
            />
            <Button
              label={t('mobile.setup.play')}
              onPress={() => start(false)}
              disabled={!canPlay}
              style={{ flex: 1.4 }}
              icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
            />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: 2,
  },
  optionWide: { flexBasis: '100%' },
  preset: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiButton: {
    width: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
})
