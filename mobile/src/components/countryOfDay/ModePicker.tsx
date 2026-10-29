// Before playing: multiple choice or typed answers, locked for the day once chosen.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { COUNTRY_OF_DAY_MAX_SCORE } from '@shared/utils/countryOfDay'

import { GameTopBar } from '@/components/game/GameTopBar'
import { Button, Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

const MODES = [
  { id: 'choice', icon: 'format-list-bulleted' },
  { id: 'free', icon: 'keyboard-outline' },
] as const

export function ModePicker({ accent, loading, onChoose }: { accent: string; loading: boolean; onChoose: (mode: string) => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <Text variant="label" color={accent}>
          {t('mobile.home.daily')} · {t('games.country_of_day.title')}
        </Text>
        {loading ? (
          <Text variant="caption">{t('messages.loading')}</Text>
        ) : (
          <>
            <Text variant="body">{t('country_of_day.intro')}</Text>
            <Text variant="heading">{t('country_of_day.mode_title')}</Text>
            {MODES.map(({ id, icon }) => {
              const active = selected === id
              return (
                <Touchable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(id)}
                  style={[styles.card, active && { borderColor: accent, borderWidth: 2 }]}>
                  <MaterialCommunityIcons name={icon} size={28} color={active ? accent : colors.textMuted} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{t(`country_of_day.mode_${id}`)}</Text>
                    <Text variant="caption">{t(`country_of_day.mode_${id}_desc`)}</Text>
                  </View>
                  <Text variant="label" color={active ? accent : colors.textMuted}>
                    {COUNTRY_OF_DAY_MAX_SCORE[id as 'choice' | 'free']}
                  </Text>
                </Touchable>
              )
            })}
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {t('country_of_day.mode_locked')}
            </Text>
            <Button
              label={t('country_of_day.start')}
              color={accent}
              disabled={!selected}
              onPress={() => selected && onChoose(selected)}
              icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
            />
          </>
        )}
      </ScrollView>
      <GameTopBar confirmQuit={false} />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
