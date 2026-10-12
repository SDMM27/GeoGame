// Language picker: a small modal listing the languages (Android's Alert shows 3 buttons at most, and none on the web).
// The choice is saved by the language detector shim.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native'

import { LANGUAGES as SHARED_LANGUAGES, toLanguage } from '@shared/i18n/languages'
import { colors, radius, space } from '@/theme'
import { Text, Touchable } from './ui'

const LANGUAGES: { code: string; label: string }[] = SHARED_LANGUAGES

export function LanguageButton() {
  const { t, i18n } = useTranslation()
  const current = toLanguage(i18n.resolvedLanguage ?? i18n.language)
  const [pickerOpen, setPickerOpen] = useState(false)

  const choose = (code: string) => {
    setPickerOpen(false)
    i18n.changeLanguage(code)
  }

  return (
    <>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('mobile.common.language')}
        onPress={() => setPickerOpen(true)}
        style={styles.button}>
        <MaterialCommunityIcons name="translate" size={18} color={colors.textMuted} />
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>
          {current.toUpperCase()}
        </Text>
      </Touchable>
      <Modal transparent visible={pickerOpen} animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} accessibilityLabel={t('mobile.game.cancel')}>
          {/* Taps inside the sheet must not close it */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text variant="heading" style={{ marginBottom: space.sm }}>
              {t('mobile.common.language')}
            </Text>
            <ScrollView bounces={false}>
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    maxHeight: '80%',
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
