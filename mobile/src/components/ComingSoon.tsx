import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, space } from '@/theme'
import { Text } from './ui'

export function ComingSoon({ title, icon }: { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.lg, paddingHorizontal: space.lg }}>
      <Text variant="title">{title}</Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.textFaint} />
        <Text variant="caption">{t('mobile.common.coming_soon')}</Text>
      </View>
    </View>
  )
}
