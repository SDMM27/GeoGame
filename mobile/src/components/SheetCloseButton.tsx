// Close button for the form sheets (game setup, room creation). Native sheets are closed by
// swiping down; on web they fill the screen and an installed web app has no back button.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'

import { makeStyles, radius, useColors } from '@/theme'
import { Touchable } from './ui'

export function SheetCloseButton() {
  const colors = useColors()
  const styles = useStyles()
  const { t } = useTranslation()
  if (Platform.OS !== 'web') return null
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.common.back')} onPress={close} style={styles.button}>
      <MaterialCommunityIcons name="close" size={22} color={colors.text} />
    </Touchable>
  )
}

const useStyles = makeStyles((colors) => ({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
}))
