// Host: picks a game to add at the end of a room (`?code=`), then its options in the usual sheets.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'

import { Kicker, ScreenTitle } from '@/components/flight'
import { SheetCloseButton } from '@/components/SheetCloseButton'
import { Text, Touchable } from '@/components/ui'
import { MULTI_GAMES } from '@/games'
import { startMultiGame } from '@/multiplayer/navigation'
import GameEmblem from '@/components/GameEmblem'
import { makeStyles, radius, space, useColors, useTheme } from '@/theme'

export default function AddGameSheet() {
  const { t } = useTranslation()
  const { code } = useLocalSearchParams<{ code: string }>()
  const styles = useStyles()
  const colors = useColors()
  const { gameColors } = useTheme()

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }}>
      <View style={styles.titleRow}>
        <ScreenTitle size={28} style={{ flex: 1 }}>
          {t('mp_room.add_game')}
        </ScreenTitle>
        <SheetCloseButton />
      </View>
      {MULTI_GAMES.map((game) => (
        <Touchable
          key={game.id}
          accessibilityRole="button"
          accessibilityLabel={t(game.titleKey)}
          onPress={() => startMultiGame(game, code)}
          style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${gameColors[game.id]}1F` }]}>
            <GameEmblem game={game.id} variant="glyph" size={24} color={gameColors[game.id]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {t(game.titleKey)}
            </Text>
            <Kicker color={gameColors[game.id]}>VOL {game.code}</Kicker>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
        </Touchable>
      ))}
    </ScrollView>
  )
}

const useStyles = makeStyles((colors) => ({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 68,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
}))
