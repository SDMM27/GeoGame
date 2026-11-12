import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Animated, { FadeInDown, useAnimatedScrollHandler, useDerivedValue, useReducedMotion, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMissions } from '@shared/hooks/useMissions'
import { nextFlight } from '@shared/utils/nextFlight'

import { useAccount } from '@/account/auth'
import { LanguageButton } from '@/components/LanguageButton'
import { LeagueCard } from '@/components/league/LeagueCard'
import { LeagueVictoryOverlay } from '@/components/league/LeagueVictoryOverlay'
import { BoardStrip, DepartureRow, DeparturesBoard, ExpandableDeparture, Kicker, ScreenTitle, useAccordion, type DepartureTone } from '@/components/flight'
import GameEmblem from '@/components/GameEmblem'
import { FlapText } from '@/components/flight/FlapText'
import { useDailyCountdown } from '@/components/home/dailyCountdown'
import { FlightGlobe } from '@/components/home/FlightGlobe'
import { NextFlightBoard } from '@/components/home/NextFlightBoard'
import { MissionsCard } from '@/components/missions/MissionsCard'
import { Text, Touchable } from '@/components/ui'
import { LISTED_GAMES, type GameDefinition } from '@/games'
import { startMultiGame } from '@/multiplayer/navigation'
import { fonts, makeStyles, radius, space, useColors, useTheme } from '@/theme'
import type { Palette } from '@/theme'

const DAILY_GAMES = LISTED_GAMES.filter((game) => game.kind === 'daily')
// Games with a setup sheet first: Placement, Flags, Capitals, Survival
const SETUP_GAMES = LISTED_GAMES.filter((game) => game.kind === 'setup' || game.kind === 'survival')
// Gates of the boarding passes, in the order of the dailies
// What the globe can offer once the city is found (@shared/utils/nextFlight): the dailies first, then the other games
const GLOBE_FLIGHTS = [
  ...DAILY_GAMES.map((game) => ({ type: game.type, daily: true, game })),
  ...SETUP_GAMES.map((game) => ({ type: game.type, daily: false, game })),
]
const GATES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']

type DailyStatus = 'won' | 'played' | 'todo'

function DailyPassTitle({ title, expanded, color }: { title: string; expanded: boolean; color: string }) {
  const { i18n } = useTranslation()
  return <FlapText text={title.toLocaleUpperCase(i18n.resolvedLanguage)} active={expanded} color={color} />
}

// Departure-board status of a daily: landed (done), boarding (to do) or on time (status unknown: visitor, loading)
function dailyBoardStatus(status: DailyStatus | null, t: (key: string) => string): { label: string; tone: DepartureTone } {
  if (status === 'won' || status === 'played') return { label: t(`home.daily_status_${status}`).toLocaleUpperCase(), tone: 'done' }
  if (status === 'todo') return { label: t('home.status_boarding').toLocaleUpperCase(), tone: 'boarding' }
  return { label: t('home.status_on_time').toLocaleUpperCase(), tone: 'ontime' }
}

// The open daily's boarding pass, in parts (revealed one after the other): kicker, title, description, then
// « Board » (the daily), infinite mode and multiplayer.
function passParts(
  game: GameDefinition,
  status: DailyStatus | null,
  t: (key: string) => string,
  colors: Palette,
  styles: ReturnType<typeof useStyles>,
  expanded: boolean,
  titleColor: string,
) {
  const done = status === 'won' || status === 'played'
  return [
    ...(status
      ? [
          <View key="top" style={styles.passTop}>
            <View style={styles.passStatus}>
              {done && <MaterialCommunityIcons name="check" size={12} color={status === 'won' ? colors.accent : colors.text} />}
              <Kicker color={status === 'won' ? colors.accent : done ? colors.text : colors.textMuted} size={9}>
                {t(`home.daily_status_${status}`)}
              </Kicker>
            </View>
          </View>,
        ]
      : []),
    <View key="title" style={styles.passTitle}>
      <GameEmblem game={game.id} size={36} />
      <DailyPassTitle title={t(game.titleKey)} expanded={expanded} color={titleColor} />
    </View>,
    <Text key="desc" variant="caption" numberOfLines={3}>
      {t(game.descKey)}
    </Text>,
    <View key="actions" style={styles.passActions}>
      <Touchable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: game.route as never, params: { mode: 'daily' } })}
        style={styles.board}>
        <Text variant="bodyStrong" numberOfLines={1} color={colors.onAccent} style={{ flexShrink: 1 }}>
          {t('buttons.play')}
        </Text>
        {/* With the infinite / multiplayer buttons beside it, the arrow would squeeze the label */}
        {game.dailyOnly && !game.multi && <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onAccent} />}
      </Touchable>
      {!game.dailyOnly && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.home.infinite')}
          onPress={() => router.push({ pathname: game.route as never, params: { mode: 'infinite' } })}
          style={styles.passIcon}>
          <MaterialCommunityIcons name="infinity" size={20} color={colors.text} />
        </Touchable>
      )}
      {game.multi && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.multi.title')}
          onPress={() => startMultiGame(game)}
          style={styles.passIcon}>
          <MaterialCommunityIcons name="account-group" size={20} color={colors.text} />
        </Touchable>
      )}
    </View>,
  ]
}

// Opening a pass only re-renders it and the pass being closed, not every SVG,
// title and button in the departure board.
const DailyDeparture = memo(function DailyDeparture({ game, index, status, expanded, toggle }: {
  game: GameDefinition; index: number; status: DailyStatus | null; expanded: boolean; toggle: (id: string) => void
}) {
  const styles = useStyles()
  const { colors, gameColors } = useTheme()
  const { t, i18n } = useTranslation()
  const { label, tone } = dailyBoardStatus(status, t)
  const done = status === 'won' || status === 'played'
  const codeColor = done ? colors.textMuted : gameColors[game.id]
  return (
    <ExpandableDeparture
      game={game.id}
      code={game.code}
      name={t(game.titleKey).toLocaleUpperCase(i18n.resolvedLanguage)}
      status={label}
      statusTone={tone}
      last={index === DAILY_GAMES.length - 1}
      expanded={expanded}
      onToggle={() => toggle(game.id)}
      gate={GATES[index % GATES.length]}
      codeColor={codeColor}
      codeLabel={t('mobile.flight.code').toLocaleUpperCase()}
      gateLabel={t('home.gate').toLocaleUpperCase()}
      accessibilityLabel={`${t(game.titleKey)}, ${label}`}>
      {passParts(game, status, t, colors, styles, expanded, codeColor)}
    </ExpandableDeparture>
  )
})

function SectionHead({ title, note }: { title: string; note?: string }) {
  const styles = useStyles()
  return (
    <View style={styles.sectionHead}>
      <ScreenTitle size={22}>{title}</ScreenTitle>
      {note ? <Kicker>{note}</Kicker> : null}
    </View>
  )
}

// Only this strip changes each second. Keep the countdown out of HomeScreen's
// state so the globe, accordions and cards don't reconcile on every clock tick.
function HomeBoardStrip({ dailyStatus, doneCount }: { dailyStatus: boolean; doneCount: number }) {
  const countdown = useDailyCountdown()
  const colors = useColors()
  const { t, i18n } = useTranslation()
  const upper = (text: string) => text.toLocaleUpperCase(i18n.resolvedLanguage)
  return <BoardStrip cells={[
    { label: upper(t('home.next_departure')), value: countdown, color: colors.gold },
    {
      label: upper(t('home.stamp_dailies')),
      value: dailyStatus ? `${doneCount} / ${DAILY_GAMES.length}` : String(DAILY_GAMES.length),
      color: colors.accent,
      accessibilityLabel: dailyStatus
        ? `${t('home.stamp_dailies')}, ${t('home.stamp_won')} ${doneCount} / ${DAILY_GAMES.length}`
        : `${t('home.stamp_dailies')}, ${DAILY_GAMES.length}`,
    },
  ]} />
}

export default function HomeScreen() {
  const styles = useStyles()
  const colors = useColors()
  const { gameColors } = useTheme()
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const scrollY = useSharedValue(0)
  const globeBottom = useSharedValue(Infinity)
  const globeVisible = useDerivedValue(() => scrollY.value < globeBottom.value)
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y })
  const { account } = useAccount()
  // Loaded once for the missions card and the dailies played today (one history read)
  const missions = useMissions(account?.uid ?? null)
  const dailyStatus = missions.dailies?.status ?? null
  // The player's finds on the globe: each one swings down the board with the next flight to take
  const [globeFinds, setGlobeFinds] = useState(0)
  const [offerOpen, setOfferOpen] = useState(false)
  const onGlobeFind = useCallback(() => {
    setGlobeFinds((n) => n + 1)
    setOfferOpen(true)
  }, [])
  const offer: (typeof GLOBE_FLIGHTS)[number] | null = offerOpen
    ? nextFlight(GLOBE_FLIGHTS, { dailyStatus, playedToday: missions.playedToday, turn: globeFinds - 1 })
    : null
  const boardOffer = () => {
    if (!offer) return
    setOfferOpen(false)
    if (offer.daily) router.push({ pathname: offer.game.route as never, params: { mode: 'daily' } })
    else router.push({ pathname: '/play/[game]', params: { game: offer.game.id } })
  }
  const statusOf = (game: GameDefinition) => (dailyStatus ? ((dailyStatus[game.type] as DailyStatus | undefined) ?? 'todo') : null)
  // Nothing open on arrival; tapping a departure unfolds its boarding pass
  const [openId, toggleOpen] = useAccordion()
  const upper = (text: string) => text.toLocaleUpperCase(i18n.resolvedLanguage)
  const doneCount = DAILY_GAMES.filter((game) => statusOf(game) === 'won' || statusOf(game) === 'played').length

  return (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
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

      <View style={styles.globe} onLayout={(event) => { globeBottom.value = event.nativeEvent.layout.y + event.nativeEvent.layout.height }}>
        <FlightGlobe
          visible={globeVisible}
          onFind={onGlobeFind}
          overlay={
            offerOpen && (
              <NextFlightBoard
                key={globeFinds}
                flight={offer && { game: offer.game.id, title: t(offer.game.titleKey), daily: offer.daily }}
                onBoard={boardOffer}
                onClose={() => setOfferOpen(false)}
              />
            )
          }
        />
      </View>

      <View style={styles.pad}>
        <HomeBoardStrip dailyStatus={!!dailyStatus} doneCount={doneCount} />
      </View>

      <SectionHead title={t('mobile.home.daily_title')} note={t('mobile.home.daily_subtitle')} />
      <View style={styles.pad}>
        <DeparturesBoard>
          {DAILY_GAMES.map((game, index) => (
            <DailyDeparture key={game.id} game={game} index={index} status={statusOf(game)} expanded={openId === game.id} toggle={toggleOpen} />
          ))}
        </DeparturesBoard>
      </View>

      <View style={[styles.pad, { marginTop: space.xxl }]}>
        <MissionsCard uid={account?.uid} missions={missions} />
      </View>

      <View style={[styles.pad, { marginTop: space.md }]}>
        <LeagueCard uid={account?.username ? account.uid : undefined} />
      </View>

      {/* Ascension first: a short climb from easy countries, the mode the home page puts forward */}
      <View style={[styles.pad, { marginTop: space.xxl }]}>
        <Touchable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/play/[game]', params: { game: 'placement', mode: 'ascension' } })}
          style={styles.ascension}>
          <View style={styles.ascensionIcon}>
            <MaterialCommunityIcons name="stairs-up" size={28} color={gameColors.placement} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Kicker color={gameColors.placement}>{t('home.special_flight')}</Kicker>
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

      <SectionHead title={t('home.board_title')} note={t('mobile.home.games_subtitle')} />
      <View style={styles.pad}>
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(80).springify().damping(18)}>
          <DeparturesBoard>
            {SETUP_GAMES.map((game, index) => (
              <DepartureRow
                key={game.id}
                game={game.id}
                code={game.code}
                name={upper(t(game.titleKey))}
                status={upper(t(index === 0 ? 'home.status_boarding' : 'home.status_on_time'))}
                statusTone={index === 0 ? 'boarding' : 'ontime'}
                onPress={() => router.push({ pathname: '/play/[game]', params: { game: game.id } })}
                accessibilityLabel={`${t(game.titleKey)}, ${t(game.descKey)}`}
              />
            ))}
            <Touchable accessibilityRole="button" accessibilityLabel={`${t('atlas.title')}, ${t('atlas.subtitle')}`} onPress={() => router.push('/atlas')} style={styles.atlasRow}>
              <MaterialCommunityIcons name="earth" size={24} color={colors.highlight} style={{ width: 30, textAlign: 'center' }} />
              <Text style={styles.atlasCode}>ATL</Text>
              <Text style={styles.atlasName} numberOfLines={1}>
                {upper(t('atlas.title'))}
              </Text>
              <Text style={styles.atlasStatus}>{upper(t('home.status_open'))}</Text>
            </Touchable>
          </DeparturesBoard>
        </Animated.View>
      </View>

      <LeagueVictoryOverlay uid={account?.username ? account.uid : undefined} />
    </Animated.ScrollView>
  )
}

const useStyles = makeStyles((colors, { gameColors }) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, marginBottom: space.lg },
  logo: { width: 52, height: 52 },
  pad: { paddingHorizontal: space.lg },
  globe: { alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.lg },
  sectionHead: { paddingHorizontal: space.lg, marginTop: space.xxl, marginBottom: space.md, gap: 4 },
  passTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm },
  passStatus: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  passTitle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  passActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  board: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  passIcon: {
    width: 48,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ascension: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${gameColors.placement}66`,
    backgroundColor: `${gameColors.placement}14`,
    padding: space.lg,
  },
  ascensionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${gameColors.placement}2E`,
  },
  atlasRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.boardLine },
  atlasCode: { width: 34, fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold },
  atlasName: { flex: 1, minWidth: 0, fontFamily: fonts.monoBold, fontSize: 12, color: colors.text },
  atlasStatus: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8, color: colors.textMuted },
}))
