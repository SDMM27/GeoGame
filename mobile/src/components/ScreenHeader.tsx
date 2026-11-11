// Header of a pushed screen: back button and title.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { makeStyles, radius, space, useColors } from '@/theme'
import { Text, Touchable } from './ui'

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const colors = useColors()
  const styles = useStyles()
  const { t } = useTranslation()
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile'))
  return (
    <View style={styles.row}>
      <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.common.back')} onPress={goBack} style={styles.back}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
      </Touchable>
      <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
