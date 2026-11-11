import { Stack } from 'expo-router'

import { useColors } from '@/theme'

export default function GameLayout() {
  const colors = useColors()
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: colors.bg } }} />
}
