// Host: picks a game to add at the end of a room (`?code=`), then its options in the usual sheets.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { SheetCloseButton } from '@/components/SheetCloseButton'
import { Text, Touchable } from '@/components/ui'
import { MULTI_GAMES } from '@/games'
import { startMultiGame } from '@/multiplayer/navigation'
import { colors, radius, space } from '@/theme'

export default function AddGameSheet() {
  const { t } = useTranslation()
  const { code } = useLocalSearchParams<{ code: string }>()

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }}>
      <View style={styles.titleRow}>
        <Text variant="title" style={{ flex: 1, fontSize: 26 }}>
          {t('mp_room.add_game')}
        </Text>
        <SheetCloseButton />
      </View>
      {MULTI_GAMES.map((game) => (
        <Touchable key={game.id} accessibilityRole="button" onPress={() => startMultiGame(game, code)} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${game.color}1F` }]}>
            <MaterialCommunityIcons name={game.icon} size={24} color={game.color} />
          </View>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {t(game.titleKey)}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textFaint} />
        </Touchable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
