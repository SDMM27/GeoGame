// Close button for the form sheets (game setup, room creation). Native sheets are closed by
// swiping down; on web they fill the screen and an installed web app has no back button.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet } from 'react-native'

import { colors, radius } from '@/theme'
import { Touchable } from './ui'

export function SheetCloseButton() {
  const { t } = useTranslation()
  if (Platform.OS !== 'web') return null
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.common.back')} onPress={close} style={styles.button}>
      <MaterialCommunityIcons name="close" size={22} color={colors.text} />
    </Touchable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
})
