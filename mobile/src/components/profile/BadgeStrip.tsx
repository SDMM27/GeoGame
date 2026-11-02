// A player's best badges (see ../../../src/utils/badges.js), small, next to their name. The tier gives the color.
// A gold trophy comes first for a league champion (`wins`).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBadges } from '@shared/hooks/useBadges'
import { TIER_COLORS } from '@shared/utils/achievements'

import { Text } from '@/components/ui'

export type PlayerBadges = { top: { id: string; tier: string; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] }[]; count: number; wins?: number }

// The badges of a room's players, by player id.
export function useRoomBadges(players: Record<string, { uid?: string | null }>): Record<string, PlayerBadges | undefined> {
  const entries = Object.entries(players)
  const byUid: Record<string, PlayerBadges> = useBadges(entries.map(([, player]) => player.uid))
  return Object.fromEntries(entries.map(([id, player]) => [id, player.uid ? byUid[player.uid] : undefined]))
}

export function BadgeStrip({ badges, size = 20 }: { badges?: PlayerBadges; size?: number }) {
  const { t } = useTranslation()
  const wins = badges?.wins ?? 0
  if (!badges?.top?.length && wins <= 0) return null
  const gold = TIER_COLORS.gold
  return (
    <View style={styles.strip}>
      {wins > 0 && (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('league.champion_wins', { count: wins })}
          style={[styles.chip, { minWidth: size, height: size, borderRadius: size / 2, paddingHorizontal: wins > 1 ? 4 : 0, gap: 2, borderColor: gold, backgroundColor: `${gold}2E` }]}>
          <MaterialCommunityIcons name="trophy" size={size * 0.6} color={gold} />
          {wins > 1 && (
            <Text variant="caption" color={gold} style={{ fontSize: size * 0.5, lineHeight: size * 0.6, fontWeight: '700' }}>
              ×{wins}
            </Text>
          )}
        </View>
      )}
      {(badges?.top ?? []).map((badge) => {
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
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
})
