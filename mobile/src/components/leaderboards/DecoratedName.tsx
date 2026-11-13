// A player's name in a leaderboard row, in the color they picked and after a small ring when they wear a frame (with the
// flag they wear inside, if any)
// (see @shared/utils/decorations). Without a uid (guest score) it's the plain name.
import type { ReactNode } from 'react'
import { View } from 'react-native'

import { useDecoration } from '@shared/hooks/useDecoration'
import { decorationStyle } from '@shared/utils/decorations'

import { ringBorder } from '@/components/profile/decorationStyle'
import { FlagDisc } from '@/components/profile/ProfileSections'
import { getFlag } from '@/flags'
import { makeStyles } from '@/theme'
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
  const styles = useStyles()
  const { frame, nameColor, flag } = decorationStyle(useDecoration(uid))
  const ring = ringBorder(frame)
  return (
    <View style={[styles.name, fill && { flex: 1 }]}>
      {flag && getFlag(flag) != null ? (
        <View style={[styles.marker, styles.flagMarker, ring ? [ring, { borderWidth: 2 }] : null]} testID="name-flag">
          <FlagDisc iso={flag} size={ring ? 8 : 10} />
        </View>
      ) : ring ? (
        <View style={[styles.marker, ring, { borderWidth: 2 }]} />
      ) : null}
      <Text variant="body" numberOfLines={1} color={nameColor ?? color} style={{ flexShrink: 1 }} onPress={onPress}>
        {children}
      </Text>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  name: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  flagMarker: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  marker: { width: 12, height: 12, borderRadius: 6, borderColor: colors.border },
}))
