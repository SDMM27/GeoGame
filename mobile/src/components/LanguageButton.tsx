// Language picker (FR / EN / RU). The choice is saved by the language detector shim.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet } from 'react-native'

import { colors, radius, space } from '@/theme'
import { Text, Touchable } from './ui'

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
] as const

export function LanguageButton() {
  const { t, i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').slice(0, 2)

  const onPress = () =>
    Alert.alert(t('mobile.common.language'), undefined, [
      ...LANGUAGES.map((language) => ({
        text: language.code === current ? `${language.label} ✓` : language.label,
        onPress: () => i18n.changeLanguage(language.code),
      })),
      { text: t('mobile.game.cancel'), style: 'cancel' as const },
    ])

  return (
    <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.common.language')} onPress={onPress} style={styles.button}>
      <MaterialCommunityIcons name="translate" size={18} color={colors.textMuted} />
      <Text variant="bodyStrong" style={{ fontSize: 14 }}>
        {current.toUpperCase()}
      </Text>
    </Touchable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
