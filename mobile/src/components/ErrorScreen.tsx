import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { View } from 'react-native'

import { colors, space } from '@/theme'
import { Button, Text } from './ui'

type Action = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' }

// Full-screen message with actions: shared by the "not found" screen and the error boundary.
// Kept independent of the safe-area and navigation providers, which may be what failed.
export function ErrorScreen({
  icon,
  title,
  message,
  actions,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  message: string
  actions: Action[]
}) {
  return (
    <View
      accessibilityRole="alert"
      style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
      <MaterialCommunityIcons name={icon} size={56} color={colors.textFaint} />
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="caption" style={{ textAlign: 'center', maxWidth: 360 }}>
        {message}
      </Text>
      <View style={{ maxWidth: 360, width: '100%', alignSelf: 'center', gap: space.sm, marginTop: space.lg }}>
        {actions.map(({ label, onPress, variant }) => (
          <Button key={label} label={label} onPress={onPress} variant={variant} />
        ))}
      </View>
    </View>
  )
}
