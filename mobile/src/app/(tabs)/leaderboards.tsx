// Rankings tab: the website's leaderboards (solo per game / difficulty / continent, Ascension, daily challenges).
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ASCENSION_PRESETS } from '@shared/utils/ascensionPresets'
import { CONTINENTS } from '@shared/utils/continents'
import { getLast7Days } from '@shared/utils/dateUtils'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import {
  ALL_CONTINENTS,
  ALL_DIFFICULTIES,
  ALL_GAMES,
  ALL_PRESETS,
  CONTINENT_NAMES,
  DIFFICULTIES,
} from '@shared/utils/leaderboards'
import { dayKey } from '@shared/utils/profileStats'

import { DailyLeaderboard } from '@/components/game/DailyLeaderboard'
import { RankingLeaderboard } from '@/components/game/RankingLeaderboard'
import { AscensionLeaderboard } from '@/components/leaderboards/AscensionLeaderboard'
import { FilterChips, type Chip } from '@/components/leaderboards/LeaderboardParts'
import { SoloLeaderboard } from '@/components/leaderboards/SoloLeaderboard'
import { LanguageButton } from '@/components/LanguageButton'
import { Segmented, Text } from '@/components/ui'
import { GAMES, DIFFICULTY_COLORS } from '@/games'
import { colors, space } from '@/theme'

type Section = 'solo' | 'ascension' | 'daily'
type SoloMode = 'difficulty' | 'continent'

const SOLO_GAMES = GAMES.filter((game) => game.kind === 'setup')
const DAILY_GAMES = GAMES.filter((game) => game.kind === 'daily')
const CONTINENT_COLORS = Object.fromEntries(CONTINENTS.map(({ name, color }: { name: string; color: string }) => [name, color]))

export default function LeaderboardsScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()

  const [section, setSection] = useState<Section>('solo')
  const [soloGame, setSoloGame] = useState<string>(ALL_GAMES)
  const [soloMode, setSoloMode] = useState<SoloMode>('difficulty')
  const [difficulty, setDifficulty] = useState<string>(ALL_DIFFICULTIES)
  const [continent, setContinent] = useState<string>(ALL_CONTINENTS)
  const [ascensionGame, setAscensionGame] = useState<string>(ALL_GAMES)
  const [preset, setPreset] = useState<string>(ALL_PRESETS)
  const [dailyGame, setDailyGame] = useState<string>(DAILY_GAMES[0].type)
  const todayKey = useMemo(() => dayKey(), [])
  const [day, setDay] = useState(todayKey)

  // Pull to refresh: bumps the key the lists reload on, until the visible list reports it has settled.
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setRefreshKey((key) => key + 1)
  }, [])
  const onSettled = useCallback(() => setRefreshing(false), [])

  const gameChips = (games: typeof GAMES, withAll: boolean): Chip[] => [
    ...(withAll ? [{ value: ALL_GAMES, label: t('options.all_games'), icon: 'view-grid-outline' as const }] : []),
    ...games.map((game) => ({ value: game.type, label: t(game.titleKey), color: game.color, icon: game.icon })),
  ]

  const days = useMemo(() => getLast7Days(todayKey, i18n.language), [todayKey, i18n.language])
  const dailyDefinition = DAILY_GAMES.find((game) => game.type === dailyGame) ?? DAILY_GAMES[0]
  const errorsLabel = (count: number) => (count === 1 ? t('units.error_one') : t('units.error_other'))

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title">{t('mobile.tabs.leaderboards')}</Text>
        <LanguageButton />
      </View>

      <Segmented<Section>
        value={section}
        onChange={setSection}
        options={[
          { value: 'solo', label: t('mobile.leaderboards.solo') },
          { value: 'ascension', label: t('mobile.setup.ascension') },
          { value: 'daily', label: t('mobile.leaderboards.daily') },
        ]}
      />

      {section === 'solo' && (
        <>
          <FilterChips label={t('mobile.leaderboards.game')} options={gameChips(SOLO_GAMES, true)} value={soloGame} onChange={setSoloGame} />
          <Segmented<SoloMode>
            value={soloMode}
            onChange={setSoloMode}
            options={[
              { value: 'difficulty', label: t('selection.by_difficulty') },
              { value: 'continent', label: t('selection.by_continent') },
            ]}
          />
          {soloMode === 'difficulty' ? (
            <FilterChips
              options={[
                { value: ALL_DIFFICULTIES, label: t('options.all_scores') },
                ...DIFFICULTIES.map((name: string) => ({ value: name, label: t(`difficulties.${name}`), color: DIFFICULTY_COLORS[name] })),
              ]}
              value={difficulty}
              onChange={setDifficulty}
            />
          ) : (
            <FilterChips
              options={[
                { value: ALL_CONTINENTS, label: t('options.all_continents') },
                ...CONTINENT_NAMES.map((name: string) => ({ value: name, label: t(`continents.${name}`), color: CONTINENT_COLORS[name] })),
              ]}
              value={continent}
              onChange={setContinent}
            />
          )}
          <SoloLeaderboard
            filters={{ game: soloGame, continentMode: soloMode === 'continent', difficulty, continent }}
            allGames={ALL_GAMES}
            refreshKey={refreshKey}
            onSettled={onSettled}
          />
        </>
      )}

      {section === 'ascension' && (
        <>
          <FilterChips label={t('mobile.leaderboards.game')} options={gameChips(SOLO_GAMES, true)} value={ascensionGame} onChange={setAscensionGame} />
          <FilterChips
            label={t('mobile.leaderboards.preset')}
            options={[
              { value: ALL_PRESETS, label: t('options.all_presets') },
              ...ASCENSION_PRESETS.map((item: { name: string; icon: string }) => ({ value: item.name, label: `${item.icon} ${item.name}` })),
            ]}
            value={preset}
            onChange={setPreset}
          />
          <AscensionLeaderboard filters={{ game: ascensionGame, preset }} allGames={ALL_GAMES} refreshKey={refreshKey} onSettled={onSettled} />
        </>
      )}

      {section === 'daily' && (
        <>
          <FilterChips label={t('mobile.leaderboards.game')} options={gameChips(DAILY_GAMES, false)} value={dailyGame} onChange={setDailyGame} />
          <FilterChips
            label={t('mobile.leaderboards.day')}
            options={days.map(({ key, label }: { key: string; label: string }) => ({ value: key, label }))}
            value={day}
            onChange={setDay}
          />
          {dailyGame === GAME_TYPES.RANKING ? (
            <RankingLeaderboard dailyKey={day} refreshKey={refreshKey} maxRows={50} onSettled={onSettled} />
          ) : (
            <DailyLeaderboard
              gameType={dailyDefinition.type}
              dailyKey={day}
              refreshKey={refreshKey}
              maxRows={50}
              onSettled={onSettled}
              // Voyage Voyage stores its error count in elapsedTime.
              formatSecondary={
                dailyGame === GAME_TYPES.VOYAGE_VOYAGE
                  ? (count) => `${count ?? 0} ${errorsLabel(count ?? 0)}`
                  : undefined
              }
            />
          )}
        </>
      )}
    </ScrollView>
  )
}
