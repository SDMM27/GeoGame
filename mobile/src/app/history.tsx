// Full game history of a player, filterable by game.
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePlayerProfile } from '@shared/hooks/usePlayerProfile'

import { HistoryList, type HistoryGame } from '@/components/profile/ProfileSections'
import { Kicker } from '@/components/flight'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Text, Touchable } from '@/components/ui'
import { getGameByType } from '@/games'
import GameEmblem from '@/components/GameEmblem'
import { makeStyles, radius, space, useColors, useTheme } from '@/theme'

export default function HistoryScreen() {
  const styles = useStyles()
  const colors = useColors()
  const { gameColors } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { uid, username } = useLocalSearchParams<{ uid: string; username?: string }>()
  const { loading, error, games } = usePlayerProfile(uid)
  const [filter, setFilter] = useState<string | null>(null)

  const history = games as HistoryGame[]
  const types = [...new Set(history.map((game) => game.gameType))]
  const visible = filter ? history.filter((game) => game.gameType === filter) : history

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.lg }}>
      <ScreenHeader title={t('profile.history_full_title')} />
      {username ? (
        <View style={{ marginTop: -space.sm }}>
          <Kicker>{t('mobile.flight.logbook')}</Kicker>
          <Text variant="body">{username}</Text>
        </View>
      ) : null}

      {types.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Touchable accessibilityRole="button" accessibilityState={{ selected: !filter }} onPress={() => setFilter(null)} style={[styles.filter, !filter && styles.filterActive]}>
            <Text variant="bodyStrong" style={{ fontSize: 13 }} color={!filter ? colors.text : colors.textMuted}>
              {t('profile.all_games')}
            </Text>
          </Touchable>
          {types.map((type) => {
            const game = getGameByType(type)
            if (!game) return null
            const active = filter === type
            const gameColor = gameColors[game.id]
            return (
              <Touchable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={t(game.titleKey)}
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(active ? null : type)}
                style={[styles.filter, active && { borderColor: gameColor, backgroundColor: `${gameColor}1F` }]}>
                <GameEmblem game={game.id} variant="glyph" size={16} color={active ? gameColor : colors.textMuted} />
                <Text variant="bodyStrong" style={{ fontSize: 13 }} color={active ? colors.text : colors.textMuted}>
                  {t(game.titleKey)}
                </Text>
              </Touchable>
            )
          })}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : error ? (
        <Text variant="caption">{t('profile.load_error')}</Text>
      ) : visible.length === 0 ? (
        <Text variant="caption">{t('profile.history_empty')}</Text>
      ) : (
        <HistoryList games={visible} />
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles((colors) => ({
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: `${colors.accent}1F`, borderColor: colors.accent },
}))
