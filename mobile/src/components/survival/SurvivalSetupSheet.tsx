// Survival setup sheet: the games of the rounds, the lives, the time per round and the difficulty ramp, then solo or a
// multiplayer room.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  DEFAULT_SURVIVAL_LIVES,
  DEFAULT_SURVIVAL_RAMP,
  DEFAULT_SURVIVAL_TIMER,
  SURVIVAL_LIVES,
  SURVIVAL_RAMPS,
  SURVIVAL_RAMP_MAX,
  SURVIVAL_RAMP_NAMES,
  SURVIVAL_RAMP_TIERS,
  SURVIVAL_ROUND_TYPES,
  SURVIVAL_TIMERS,
  matchSurvivalRamp,
  normalizeSurvivalModes,
  survivalModesKey,
} from '@shared/utils/survivalConfig'

import { SheetCloseButton } from '@/components/SheetCloseButton'
import { Button, Segmented, Text, Touchable } from '@/components/ui'
import { DIFFICULTY_COLORS, getGame, getGameByType } from '@/games'
import { colors, radius, space } from '@/theme'

type Ramp = Record<string, number>

const RAMP_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  express: 'lightning-bolt',
  normal: 'target',
  gentle: 'sprout',
  expert: 'fire',
  hardcore: 'skull',
  custom: 'tune-variant',
}

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Touchable accessibilityLabel="-" onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepperButton}>
        <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
      </Touchable>
      <Text variant="number" style={{ minWidth: 32, textAlign: 'center' }}>
        {value}
      </Text>
      <Touchable accessibilityLabel="+" onPress={() => onChange(Math.min(SURVIVAL_RAMP_MAX, value + 1))} style={styles.stepperButton}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
      </Touchable>
    </View>
  )
}

export function SurvivalSetupSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  // `add`: the room the host adds this game to (see multi/add)
  const { multi, add } = useLocalSearchParams<{ multi?: string; add?: string }>()
  const game = getGame('survival')!
  const [modes, setModes] = useState<string[]>(SURVIVAL_ROUND_TYPES)
  const [lives, setLives] = useState<number>(DEFAULT_SURVIVAL_LIVES)
  const [timer, setTimer] = useState<number>(DEFAULT_SURVIVAL_TIMER)
  const [ramp, setRamp] = useState<Ramp>(() => ({ ...SURVIVAL_RAMPS[DEFAULT_SURVIVAL_RAMP] }))
  const [customRamp, setCustomRamp] = useState(false)
  const activeRamp: string = customRamp ? 'custom' : (matchSurvivalRamp(ramp) ?? 'custom')
  const canPlay = modes.length > 0

  const toggle = (type: string) =>
    setModes((previous) => normalizeSurvivalModes(previous.includes(type) ? previous.filter((m) => m !== type) : [...previous, type]))

  const start = () =>
    router.replace({ pathname: game.route as never, params: { modes: survivalModesKey(modes), lives: String(lives), timer: String(timer), ramp: JSON.stringify(ramp) } })

  const startMulti = () =>
    router.replace({
      pathname: '/multi/create',
      params: { game: game.id, config: JSON.stringify({ modes: survivalModesKey(modes), lives, timer, ramp }), ...(add ? { add } : {}) },
    })

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
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

        <Text variant="label">{t('survival.choose_games')}</Text>
        <View style={styles.grid}>
          {SURVIVAL_ROUND_TYPES.map((type: string) => {
            const round = getGameByType(type)
            if (!round) return null
            const active = modes.includes(type)
            return (
              <Touchable
                key={type}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggle(type)}
                style={[styles.option, active && { borderColor: round.color, backgroundColor: `${round.color}14` }]}>
                <MaterialCommunityIcons name={round.icon} size={20} color={active ? round.color : colors.textFaint} />
                <Text variant="bodyStrong" color={active ? colors.text : colors.textMuted} numberOfLines={2} style={{ flex: 1, fontSize: 15 }}>
                  {t(`survival.round_type.${type}`)}
                </Text>
              </Touchable>
            )
          })}
        </View>
        {!canPlay && (
          <Text variant="caption" color={colors.warning}>
            {t('survival.pick_one_game')}
          </Text>
        )}

        <Text variant="label">{t('survival.choose_lives')}</Text>
        <Segmented<string>
          value={String(lives)}
          onChange={(value) => setLives(Number(value))}
          options={SURVIVAL_LIVES.map((count: number) => ({ value: String(count), label: `${count} ❤️` }))}
        />

        <Text variant="label">{t('survival.choose_timer')}</Text>
        <Segmented<string>
          value={String(timer)}
          onChange={(value) => setTimer(Number(value))}
          options={SURVIVAL_TIMERS.map((seconds: number) => ({
            value: String(seconds),
            label: seconds ? t('survival.timer_seconds', { count: seconds }) : t('survival.timer_none'),
          }))}
        />

        <Text variant="label">{t('survival.choose_ramp')}</Text>
        <View style={styles.grid}>
          {[...SURVIVAL_RAMP_NAMES, 'custom'].map((name: string) => {
            const active = activeRamp === name
            return (
              <Touchable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (name === 'custom') return setCustomRamp(true)
                  setRamp({ ...SURVIVAL_RAMPS[name] })
                  setCustomRamp(false)
                }}
                style={[styles.option, active && { borderColor: game.color, backgroundColor: `${game.color}14` }]}>
                <MaterialCommunityIcons name={RAMP_ICONS[name]} size={20} color={active ? game.color : colors.textFaint} />
                <Text variant="bodyStrong" color={active ? colors.text : colors.textMuted} numberOfLines={2} style={{ flex: 1, fontSize: 15 }}>
                  {t(`survival.ramp.${name}`)}
                </Text>
              </Touchable>
            )
          })}
        </View>
        {activeRamp === 'custom' ? (
          <View style={{ gap: space.sm }}>
            {SURVIVAL_RAMP_TIERS.map((tier: string) => (
              <View key={tier} style={styles.stepRow}>
                <Text variant="bodyStrong" color={DIFFICULTY_COLORS[tier]}>
                  {t(`difficulties.${tier}`)}
                </Text>
                <Stepper value={ramp[tier]} onChange={(value) => setRamp((previous) => ({ ...previous, [tier]: value }))} />
              </View>
            ))}
            <Text variant="caption">{t('survival.ramp_custom_hint')}</Text>
          </View>
        ) : (
          <Text variant="caption">{t('survival.ramp_summary', { facile: ramp.Facile, moyen: ramp.Moyen, difficile: ramp.Difficile })}</Text>
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
              label={t('mobile.setup.play')}
              onPress={start}
              disabled={!canPlay}
              color={game.color}
              style={{ flex: 1 }}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  stepRow: {
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
