import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LanguageButton } from '@/components/LanguageButton'
import { Text, Touchable } from '@/components/ui'
import { GAMES, type GameDefinition } from '@/games'
import { startMultiGame } from '@/multiplayer/navigation'
import { colors, radius, space } from '@/theme'

const DAILY_GAMES = GAMES.filter((game) => game.kind === 'daily')
// Games with a setup sheet first: Placement, Flags, Capitals, Survival
const SETUP_GAMES = GAMES.filter((game) => game.kind === 'setup' || game.kind === 'survival')

function DailyCard({ game, width }: { game: GameDefinition; width: number }) {
  const { t } = useTranslation()
  return (
    <View style={[styles.dailyCard, { width }]}>
      <View style={[styles.dailyIcon, { backgroundColor: `${game.color}22` }]}>
        <MaterialCommunityIcons name={game.icon} size={26} color={game.color} />
      </View>
      <Text variant="heading" style={{ marginTop: space.md }}>
        {t(game.titleKey)}
      </Text>
      <Text variant="caption" numberOfLines={2} style={{ marginTop: 4, minHeight: 36 }}>
        {t(game.descKey)}
      </Text>
      <View style={styles.dailyActions}>
        <Touchable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: game.route as never, params: { mode: 'daily' } })}
          style={[styles.dailyPrimary, { backgroundColor: game.color }]}>
          <MaterialCommunityIcons name="calendar-today" size={16} color={colors.bg} />
          <Text variant="bodyStrong" color={colors.bg} style={{ fontSize: 14 }}>
            {t('mobile.home.daily')}
          </Text>
        </Touchable>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.home.infinite')}
          onPress={() => router.push({ pathname: game.route as never, params: { mode: 'infinite' } })}
          style={styles.dailySecondary}>
          <MaterialCommunityIcons name="infinity" size={20} color={colors.text} />
        </Touchable>
        {game.multi && (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t('mobile.multi.title')}
            onPress={() => startMultiGame(game)}
            style={styles.dailySecondary}>
            <MaterialCommunityIcons name="account-group" size={20} color={colors.text} />
          </Touchable>
        )}
      </View>
    </View>
  )
}

function GameRow({ game, index }: { game: GameDefinition; index: number }) {
  const { t } = useTranslation()
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 60).springify().damping(18)}>
      <Touchable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/play/[game]', params: { game: game.id } })}
        style={styles.gameRow}>
        <View style={[styles.gameIcon, { backgroundColor: `${game.color}1F` }]}>
          <MaterialCommunityIcons name={game.icon} size={28} color={game.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading" style={{ fontSize: 18 }}>
            {t(game.titleKey)}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {t(game.descKey)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textFaint} />
      </Touchable>
    </Animated.View>
  )
}

export default function HomeScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const cardWidth = Math.min(300, width * 0.72)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: space.xxl * 2 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text variant="title">GeoGame</Text>
          <Text variant="caption">{t('mobile.home.greeting')}</Text>
        </View>
        <LanguageButton />
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="heading">{t('mobile.home.daily_title')}</Text>
        <Text variant="caption">{t('mobile.home.daily_subtitle')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + space.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
        {DAILY_GAMES.map((game) => (
          <DailyCard key={game.id} game={game} width={cardWidth} />
        ))}
      </ScrollView>

      <View style={[styles.sectionHeader, { marginTop: space.xxl }]}>
        <Text variant="heading">{t('mobile.home.games_title')}</Text>
        <Text variant="caption">{t('mobile.home.games_subtitle')}</Text>
      </View>
      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        {SETUP_GAMES.map((game, index) => (
          <GameRow key={game.id} game={game} index={index} />
        ))}
      </View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xxl }}>
        <Touchable accessibilityRole="button" onPress={() => router.push('/atlas')} style={styles.gameRow}>
          <View style={[styles.gameIcon, { backgroundColor: `${colors.highlight}22` }]}>
            <MaterialCommunityIcons name="earth" size={28} color={colors.highlight} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">{t('atlas.title')}</Text>
            <Text variant="caption">{t('atlas.subtitle')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textFaint} />
        </Touchable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, marginBottom: space.xl },
  logo: { width: 52, height: 52 },
  sectionHeader: { paddingHorizontal: space.lg, marginBottom: space.md, gap: 2 },
  dailyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  dailyIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dailyActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  dailyPrimary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.md,
  },
  dailySecondary: {
    width: 52,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  gameIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
})
