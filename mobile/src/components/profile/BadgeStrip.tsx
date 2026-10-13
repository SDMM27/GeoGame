// A player's best badges (see ../../../src/utils/badges.js), small, next to their name. The tier gives the color.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { type ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'

import { useBadges } from '@shared/hooks/useBadges'
import { TIER_COLORS } from '@shared/utils/achievements'

export type PlayerBadges = { top: { id: string; tier: string; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] }[]; count: number }

// The badges of a room's players, by player id.
export function useRoomBadges(players: Record<string, { uid?: string | null }>): Record<string, PlayerBadges | undefined> {
  const entries = Object.entries(players)
  const byUid: Record<string, PlayerBadges> = useBadges(entries.map(([, player]) => player.uid))
  return Object.fromEntries(entries.map(([id, player]) => [id, player.uid ? byUid[player.uid] : undefined]))
}

export function BadgeStrip({ badges, size = 20 }: { badges?: PlayerBadges; size?: number }) {
  if (!badges?.top?.length) return null
  return (
    <View style={styles.strip}>
      {badges.top.map((badge) => {
        const color = TIER_COLORS[badge.tier]
        return (
          <View key={badge.id} style={[styles.chip, { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: `${color}2E` }]}>
            <MaterialCommunityIcons name={badge.icon} size={size * 0.6} color={color} />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 3 },
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
})
