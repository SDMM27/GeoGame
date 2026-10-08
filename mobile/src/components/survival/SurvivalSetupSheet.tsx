// Survival setup sheet: the games of the rounds and the number of lives, then solo or a multiplayer room.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  DEFAULT_SURVIVAL_LIVES,
  SURVIVAL_LIVES,
  SURVIVAL_ROUND_TYPES,
  normalizeSurvivalModes,
  survivalModesKey,
} from '@shared/utils/survivalConfig'

import { SheetCloseButton } from '@/components/SheetCloseButton'
import { Button, Segmented, Text, Touchable } from '@/components/ui'
import { getGame, getGameByType } from '@/games'
import { colors, radius, space } from '@/theme'

export function SurvivalSetupSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  // `add`: the room the host adds this game to (see multi/add)
  const { multi, add } = useLocalSearchParams<{ multi?: string; add?: string }>()
  const game = getGame('survival')!
  const [modes, setModes] = useState<string[]>(SURVIVAL_ROUND_TYPES)
  const [lives, setLives] = useState<number>(DEFAULT_SURVIVAL_LIVES)
  const canPlay = modes.length > 0

  const toggle = (type: string) =>
    setModes((previous) => normalizeSurvivalModes(previous.includes(type) ? previous.filter((m) => m !== type) : [...previous, type]))

  const start = () =>
    router.replace({ pathname: game.route as never, params: { modes: survivalModesKey(modes), lives: String(lives) } })

  const startMulti = () =>
    router.replace({
      pathname: '/multi/create',
      params: { game: game.id, config: JSON.stringify({ modes: survivalModesKey(modes), lives }), ...(add ? { add } : {}) },
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
            const round = getGameByType(type)!
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
