// A player's name in a leaderboard row, in the color they picked and after a small ring when they wear a frame
// (see @shared/utils/decorations). Without a uid (guest score) it's the plain name.
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { useDecoration } from '@shared/hooks/useDecoration'
import { decorationStyle } from '@shared/utils/decorations'

import { ringBorder } from '@/components/profile/decorationStyle'
import { colors } from '@/theme'
import { Text } from '../ui'

export function DecoratedName({
  uid,
  color,
  fill,
  onPress,
  children,
}: {
  uid?: string
  // Used when the player picked no color
  color?: string
  // Takes the free room of a row (the name is followed by other cells)
  fill?: boolean
  onPress?: () => void
  // The name, plus anything that follows it on the same line
  children: ReactNode
}) {
  const { frame, nameColor } = decorationStyle(useDecoration(uid))
  const ring = ringBorder(frame)
  return (
    <View style={[styles.name, fill && { flex: 1 }]}>
      {ring ? <View style={[styles.marker, ring, { borderWidth: 2 }]} /> : null}
      <Text variant="body" numberOfLines={1} color={nameColor ?? color} style={{ flexShrink: 1 }} onPress={onPress}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  name: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  marker: { width: 12, height: 12, borderRadius: 6, borderColor: colors.border },
})
