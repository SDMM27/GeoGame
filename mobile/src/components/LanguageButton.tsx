// Language picker (FR / EN / RU). The choice is saved by the language detector shim.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'

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
  // Alert does nothing on the web build: the picker is a small modal there.
  const [webPickerOpen, setWebPickerOpen] = useState(false)

  const choose = (code: string) => {
    setWebPickerOpen(false)
    i18n.changeLanguage(code)
  }

  const onPress = () => {
    if (Platform.OS === 'web') return setWebPickerOpen(true)
    Alert.alert(t('mobile.common.language'), undefined, [
      ...LANGUAGES.map((language) => ({
        text: language.code === current ? `${language.label} ✓` : language.label,
        onPress: () => i18n.changeLanguage(language.code),
      })),
      { text: t('mobile.game.cancel'), style: 'cancel' as const },
    ])
  }

  return (
    <>
      <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.common.language')} onPress={onPress} style={styles.button}>
        <MaterialCommunityIcons name="translate" size={18} color={colors.textMuted} />
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>
          {current.toUpperCase()}
        </Text>
      </Touchable>
      {Platform.OS === 'web' && (
        <Modal transparent visible={webPickerOpen} animationType="fade" onRequestClose={() => setWebPickerOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setWebPickerOpen(false)} accessibilityLabel={t('mobile.game.cancel')}>
            <View style={styles.sheet}>
              <Text variant="heading" style={{ marginBottom: space.sm }}>
                {t('mobile.common.language')}
              </Text>
              {LANGUAGES.map((language) => {
                const selected = language.code === current
                return (
                  <Touchable
                    key={language.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => choose(language.code)}
                    style={[styles.option, selected && styles.optionSelected]}>
                    <Text variant="bodyStrong" color={selected ? colors.accent : colors.text}>
                      {language.label}
                    </Text>
                    {selected && <MaterialCommunityIcons name="check" size={20} color={colors.accent} />}
                  </Touchable>
                )
              })}
            </View>
          </Pressable>
        </Modal>
      )}
    </>
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
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    width: '100%',
    maxWidth: 320,
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  optionSelected: { backgroundColor: colors.surface },
})
