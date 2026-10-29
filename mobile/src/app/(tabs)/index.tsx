import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMissions } from '@shared/hooks/useMissions'

import { useAccount } from '@/account/auth'
import { LanguageButton } from '@/components/LanguageButton'
import { MissionsCard } from '@/components/missions/MissionsCard'
import { Text, Touchable } from '@/components/ui'
import { LISTED_GAMES, type GameDefinition } from '@/games'
import { startMultiGame } from '@/multiplayer/navigation'
import { colors, gameColors, radius, space } from '@/theme'

const DAILY_GAMES = LISTED_GAMES.filter((game) => game.kind === 'daily')
// Games with a setup sheet first: Placement, Flags, Capitals, Survival
const SETUP_GAMES = LISTED_GAMES.filter((game) => game.kind === 'setup' || game.kind === 'survival')
const NARROW_CARD = 240

type DailyStatus = 'won' | 'played' | 'todo'

// `status`: today's daily from the signed-in player's history, null when unknown (visitor, loading).
function DailyCard({ game, width, status }: { game: GameDefinition; width: number; status: DailyStatus | null }) {
  const { t } = useTranslation()
  const done = status === 'won' || status === 'played'
  return (
    <View style={[styles.dailyCard, { width }, done && { borderColor: `${game.color}59` }]}>
      <View style={styles.dailyTop}>
        <View style={[styles.dailyIcon, { backgroundColor: `${game.color}22` }]}>
          <MaterialCommunityIcons name={game.icon} size={26} color={game.color} />
        </View>
        {status && (
          <View style={[styles.dailyStatus, status === 'won' && styles.dailyStatusWon, status === 'played' && styles.dailyStatusPlayed]}>
            {done && <MaterialCommunityIcons name="check" size={14} color={status === 'won' ? colors.accent : colors.text} />}
            <Text
              variant="caption"
              style={{ fontSize: 12, fontWeight: '700' }}
              color={status === 'won' ? colors.accent : done ? colors.text : colors.textMuted}>
              {t(`mobile.home.daily_status_${status}`)}
            </Text>
          </View>
        )}
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
          {/* Narrow card: the label gets the icon's room and shrinks (native) rather than widening the card or breaking a word */}
          {width >= NARROW_CARD && <MaterialCommunityIcons name="calendar-today" size={16} color={colors.bg} />}
          <Text
            variant="bodyStrong"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            color={colors.bg}
            style={{ fontSize: 14, flexShrink: 1 }}>
            {t('mobile.home.daily')}
          </Text>
        </Touchable>
        {!game.dailyOnly && (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t('mobile.home.infinite')}
            onPress={() => router.push({ pathname: game.route as never, params: { mode: 'infinite' } })}
            style={styles.dailySecondary}>
            <MaterialCommunityIcons name="infinity" size={20} color={colors.text} />
          </Touchable>
        )}
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
  // The next card peeks out on the right, and the dots below say how many there are
  const cardWidth = Math.min(300, width * 0.72)
  const snap = cardWidth + space.md
  const { account } = useAccount()
  // Loaded once for the missions card and the dailies played today (one history read)
  const missions = useMissions(account?.uid ?? null)
  const dailyStatus = missions.dailies?.status ?? null
  const dailyScroll = useRef<ScrollView>(null)
  const [dailyIndex, setDailyIndex] = useState(0)
  const onDailyScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = nativeEvent.contentOffset.x
    const end = nativeEvent.contentSize.width - nativeEvent.layoutMeasurement.width
    // The last card can't snap to the left edge: reaching the end selects it
    const index = x >= end - 2 ? DAILY_GAMES.length - 1 : Math.round(x / snap)
    setDailyIndex(Math.max(0, Math.min(DAILY_GAMES.length - 1, index)))
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: space.xxl * 2 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" accessible accessibilityLabel="GeoGame" />
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
        ref={dailyScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        decelerationRate="fast"
        onScroll={onDailyScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
        {DAILY_GAMES.map((game) => (
          <DailyCard key={game.id} game={game} width={cardWidth} status={dailyStatus && ((dailyStatus[game.type] as DailyStatus | undefined) ?? 'todo')} />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {DAILY_GAMES.map((game, index) => {
          const active = index === dailyIndex
          return (
            <Touchable
              key={game.id}
              accessibilityRole="button"
              accessibilityLabel={t(game.titleKey)}
              accessibilityState={{ selected: active }}
              hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
              onPress={() => dailyScroll.current?.scrollTo({ x: index * snap, animated: true })}
              style={[styles.dot, active && { width: 20, backgroundColor: game.color }]}
            />
          )
        })}
      </View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xxl }}>
        <MissionsCard uid={account?.uid} missions={missions} />
      </View>

      {/* Ascension first: a short climb from easy countries, the mode the home page puts forward */}
      <View style={{ paddingHorizontal: space.lg, marginTop: space.xxl }}>
        <Touchable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/play/[game]', params: { game: 'placement', mode: 'ascension' } })}
          style={[styles.gameRow, styles.ascension]}>
          <View style={[styles.gameIcon, { backgroundColor: `${gameColors.placement}2E` }]}>
            <MaterialCommunityIcons name="stairs-up" size={28} color={gameColors.placement} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 18 }}>
              {t('mobile.setup.ascension')}
            </Text>
            <Text variant="caption" numberOfLines={2}>
              {t('mobile.home.ascension_subtitle')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={gameColors.placement} />
        </Touchable>
      </View>

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
  dailyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  dailyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dailyStatusWon: { borderColor: 'transparent', backgroundColor: `${colors.accent}26` },
  dailyStatusPlayed: { borderColor: 'transparent', backgroundColor: colors.surfaceHigh },
  dailyIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dailyActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dailyPrimary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  dailySecondary: {
    width: 44,
    minHeight: 44,
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
  ascension: { borderColor: `${gameColors.placement}66`, backgroundColor: `${gameColors.placement}14` },
})
