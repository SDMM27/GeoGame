// Header of a pushed screen: back button and title.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { colors, radius, space } from '@/theme'
import { Text, Touchable } from './ui'

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
