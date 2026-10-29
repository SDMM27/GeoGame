// Atlas: an explorable world map, no game. Tapping a country (or picking it in the search) opens its profile
// (the website's utils/countryInfo.js); its neighbors lead on to theirs.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native'
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  countryDisplayName,
  findAtlasCountry,
  getCountryInfo,
  mainPartBounds,
  searchAtlasCountries,
} from '@shared/utils/countryInfo'

import countryHistory from '@shared/data/countryHistory.json'
import { HISTORY_COUNTRIES } from '@shared/utils/quizQuestions'

import { RankingSheet } from '@/components/atlas/RankingSheet'
import { formatMetric, type Metric } from '@/components/atlas/format'
import { WorldMap, type MapLayer, type WorldMapHandle } from '@/components/map/WorldMap'
import { Button, Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { DIFFICULTY_COLORS } from '@/games'
import { clean } from '@/i18n'
import { colors, radius, space } from '@/theme'

const SELECTED = { fillColor: '#7B2FF7', fillOpacity: 0.65, color: '#C4B5FD', weight: 2 }
// Closest zoom a selected country is framed at (Malta is then about 50px wide)
const MAX_FRAME_ZOOM = 8

type Rank = { rank: number; total: number } | null
type Neighbor = { admin: string; iso: string; name: string }
// What getCountryInfo (shared JS) returns
type Info = {
  admin: string
  name: string
  iso: string | null
  continent: string | null
  capital: string | null
  population: number | null
  populationRank: Rank
  areaKm2: number | null
  areaRank: Rank
  density: number | null
  densityRank: Rank
  gdp: number | null
  gdpRank: Rank
  gdpPerCapita: number | null
  gdpPerCapitaRank: Rank
  neighbors: Neighbor[]
  difficulty: { placement: string | null; flags: string | null; capitals: string | null }
}

type TimelineEvent = { year: string; text: Record<string, string> }

function Fact({ label, value, rank, onRank }: { label: string; value: string; rank?: Rank; onRank?: () => void }) {
  const { t } = useTranslation()
  return (
    <View style={styles.fact}>
      <Text variant="caption">{label}</Text>
      <Text variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {rank && (
        <Touchable accessibilityRole="button" accessibilityLabel={t('atlas.see_ranking')} onPress={onRank} style={styles.rankLink}>
          <Text variant="caption" color={colors.highlight}>
            {t(rank.rank === 1 ? 'atlas.rank_first' : 'atlas.rank', rank)}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.highlight} />
        </Touchable>
      )}
    </View>
  )
}

function CountrySheet({
  info,
  onSelect,
  onClose,
  onRanking,
  onBack,
  maxHeight,
}: {
  info: Info
  onSelect: (admin: string) => void
  onClose: () => void
  onRanking: (metric: Metric) => void
  onBack?: () => void
  maxHeight: number
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const lang = i18n.language
  const unknown = t('atlas.unknown')
  const flag = getFlag(info.iso)
  const games = (
    [
      ['placement', t('games.placement.title'), info.difficulty.placement],
      ['flags', t('games.flags.title'), info.difficulty.flags],
      ['capitals', t('games.capitals.title'), info.difficulty.capitals],
    ] as const
  ).filter(([, , level]) => level)
  const timeline = (info.iso ? (countryHistory as Record<string, TimelineEvent[]>)[info.iso] : null) ?? []
  const hasHistoryQuiz = !!info.iso && (HISTORY_COUNTRIES as string[]).includes(info.iso)

  return (
    // No spring on Android, where it made the sheet bounce many times: a short fade and slide instead.
    <Animated.View
      entering={Platform.OS === 'android' ? FadeInDown.duration(220) : SlideInDown.springify().damping(20)}
      style={[styles.sheet, { maxHeight }]}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.lg }}>
        {onBack && (
          <Touchable accessibilityRole="button" onPress={onBack} style={styles.back}>
            <Text variant="label" color={colors.highlight}>
              {t('atlas.back_to_ranking')}
            </Text>
          </Touchable>
        )}
        <View style={styles.sheetHeader}>
          {flag && <Image source={flag} contentFit="cover" style={styles.flag} accessible={false} alt="" />}
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={2} adjustsFontSizeToFit>
              {info.name}
            </Text>
            {info.continent && <Text variant="caption">{t(`continents.${info.continent}`, { defaultValue: info.continent })}</Text>}
          </View>
          <Touchable accessibilityRole="button" accessibilityLabel={t('atlas.close')} onPress={onClose} style={styles.iconButton}>
            <MaterialCommunityIcons name="close" size={20} color={colors.text} />
          </Touchable>
        </View>

        <View style={styles.facts}>
          <Fact label={t('atlas.capital')} value={info.capital ?? unknown} />
          <Fact
            label={t('atlas.population')}
            value={info.population ? formatMetric('population', info.population, t, lang) : unknown}
            rank={info.populationRank}
            onRank={() => onRanking('population')}
          />
          <Fact
            label={t('atlas.area')}
            value={info.areaKm2 ? formatMetric('area', info.areaKm2, t, lang) : unknown}
            rank={info.areaRank}
            onRank={() => onRanking('area')}
          />
          <Fact
            label={t('atlas.density')}
            value={info.density ? formatMetric('density', info.density, t, lang) : unknown}
            rank={info.densityRank}
            onRank={() => onRanking('density')}
          />
          <Fact
            label={t('atlas.gdp')}
            value={info.gdp ? formatMetric('gdp', info.gdp, t, lang) : unknown}
            rank={info.gdpRank}
            onRank={() => onRanking('gdp')}
          />
          <Fact
            label={t('atlas.gdp_per_capita')}
            value={info.gdpPerCapita ? formatMetric('gdpPerCapita', info.gdpPerCapita, t, lang) : unknown}
            rank={info.gdpPerCapitaRank}
            onRank={() => onRanking('gdpPerCapita')}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="label">{t('atlas.neighbors')}</Text>
          {info.neighbors.length === 0 ? (
            <Text variant="caption">{t('atlas.no_neighbors')}</Text>
          ) : (
            <View style={styles.chips}>
              {info.neighbors.map((neighbor) => {
                const neighborFlag = getFlag(neighbor.iso)
                return (
                  <Touchable key={neighbor.admin} accessibilityRole="button" onPress={() => onSelect(neighbor.admin)} style={styles.chip}>
                    {neighborFlag && <Image source={neighborFlag} contentFit="cover" style={styles.chipFlag} accessible={false} alt="" />}
                    <Text variant="caption" color={colors.text}>
                      {neighbor.name}
                    </Text>
                  </Touchable>
                )
              })}
            </View>
          )}
        </View>

        {(timeline.length > 0 || hasHistoryQuiz) && (
          <View style={{ gap: space.sm }}>
            <Text variant="label">{t('atlas.history')}</Text>
            {timeline.length > 0 && (
              <View style={styles.timeline}>
                {timeline.map((event) => (
                  <View key={event.year} style={{ gap: 1 }}>
                    <Text variant="label" color={colors.accent}>
                      {event.year}
                    </Text>
                    <Text variant="body">{event.text[lang] ?? event.text.en}</Text>
                  </View>
                ))}
              </View>
            )}
            {hasHistoryQuiz && (
              <Button
                label={clean(t('atlas.history_quiz'))}
                variant="secondary"
                onPress={() => router.push({ pathname: '/game/quiz', params: { mode: 'infinite', theme: 'history', country: info.iso as string } })}
              />
            )}
          </View>
        )}

        {games.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Text variant="label">{t('atlas.difficulty')}</Text>
            {games.map(([id, label, level]) => (
              <View key={id} style={styles.difficultyRow}>
                <Text variant="body" style={{ flex: 1 }}>
                  {label}
                </Text>
                <Text variant="bodyStrong" color={DIFFICULTY_COLORS[level as string]}>
                  {t(`difficulties.${level}`)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  )
}

export default function AtlasScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const mapRef = useRef<WorldMapHandle>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // The open ranking's metric (the ranking sheet is open when set), and whether the country sheet came from a ranking row
  const [ranking, setRanking] = useState<Metric | null>(null)
  const [lastMetric, setLastMetric] = useState<Metric>('population')
  const [fromRanking, setFromRanking] = useState(false)
  const sheetHeight = Math.round(height * 0.55)
  // Back button / search row over the top of the map
  const topBarHeight = insets.top + space.sm + 44

  const info = useMemo(
    () => (selected ? (getCountryInfo(findAtlasCountry(selected), i18n.language) as Info | null) : null),
    [selected, i18n.language]
  )
  const results = useMemo(() => searchAtlasCountries(query, i18n.language, 6), [query, i18n.language])

  // Frame the selected country's main piece of land between the search bar and the sheet. Small islands get a
  // closer zoom, and a map the player already zoomed in further is not zoomed back out.
  const pendingFrame = useRef<string | null>(null)
  const frame = useCallback(() => {
    const map = mapRef.current
    const admin = pendingFrame.current
    const bounds = admin && mainPartBounds(findAtlasCountry(admin))
    if (!map || !bounds) return
    map.fitBounds(bounds, {
      maxZoom: Math.max(MAX_FRAME_ZOOM, map.getZoom()),
      padding: 32,
      paddingTop: topBarHeight,
      paddingBottom: sheetHeight,
      animate: true,
    })
  }, [topBarHeight, sheetHeight])

  // Where the keyboard resizes the map (Android), the map's onResize frames with the new size; elsewhere this does.
  // Either way the frame is only pending until shortly after the keyboard has closed.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      frame()
      setTimeout(() => { pendingFrame.current = null }, 400)
    })
    return () => subscription.remove()
  }, [frame])

  const select = useCallback(
    (admin: string) => {
      const map = mapRef.current
      setSelected(admin)
      setQuery('')
      if (!map) return
      map.geoJson.resetStyle()
      map.geoJson
        .getLayers()
        .filter((layer: MapLayer) => layer.feature.properties.ADMIN === admin)
        .forEach((layer: MapLayer) => layer.setStyle(SELECTED))
      pendingFrame.current = admin
      // Picked from the search: the keyboard is still open and shrinks the map, so frame once it has closed
      if (Keyboard.isVisible()) Keyboard.dismiss()
      else {
        frame()
        pendingFrame.current = null
      }
    },
    [frame]
  )

  // Any selection other than a ranking row leaves the ranking
  const selectCountry = (admin: string) => {
    setRanking(null)
    setFromRanking(false)
    select(admin)
  }

  const openRanking = (metric: Metric) => {
    Keyboard.dismiss()
    setQuery('')
    setLastMetric(metric)
    setRanking(metric)
  }

  const pickFromRanking = (admin: string) => {
    setRanking(null)
    setFromRanking(true)
    select(admin)
  }

  const close = () => {
    setSelected(null)
    setFromRanking(false)
    mapRef.current?.geoJson.resetStyle()
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.ocean }}>
      <WorldMap ref={mapRef} onCountryPress={(layer) => selectCountry(layer.feature.properties.ADMIN)} onResize={() => pendingFrame.current && frame()} />

      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + space.sm }]}>
        <View style={styles.searchRow}>
          <Touchable accessibilityRole="button" accessibilityLabel={t('atlas.close')} onPress={() => router.back()} style={styles.iconButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Touchable>
          <View style={styles.search}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('atlas.search_placeholder')}
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => results[0] && selectCountry(results[0].properties.ADMIN)}
              style={styles.searchInput}
            />
          </View>
          <Touchable accessibilityRole="button" accessibilityLabel={clean(t('atlas.rankings_button'))} onPress={() => openRanking(lastMetric)} style={styles.iconButton}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color={colors.text} />
          </Touchable>
        </View>
        {query.trim() !== '' && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.results}>
            {results.length === 0 ? (
              <Text variant="caption" style={{ padding: space.md }}>
                {t('atlas.no_results')}
              </Text>
            ) : (
              results.map((feature: any) => {
                const flag = getFlag(feature.properties.ISO_A2)
                return (
                  <Touchable key={feature.properties.ADMIN} onPress={() => selectCountry(feature.properties.ADMIN)} style={styles.result}>
                    {flag && <Image source={flag} contentFit="cover" style={styles.chipFlag} accessible={false} alt="" />}
                    <Text variant="body">{countryDisplayName(feature, i18n.language)}</Text>
                  </Touchable>
                )
              })
            )}
          </Animated.View>
        )}
        {!info && !ranking && query.trim() === '' && (
          <Text variant="caption" style={styles.hint}>
            {t('atlas.subtitle')}
          </Text>
        )}
      </View>

      {ranking ? (
        <RankingSheet
          metric={ranking}
          selected={selected}
          onMetric={(metric) => {
            setLastMetric(metric)
            setRanking(metric)
          }}
          onPick={pickFromRanking}
          onClose={() => setRanking(null)}
          maxHeight={sheetHeight}
        />
      ) : (
        info && (
          <CountrySheet
            key={info.admin}
            info={info}
            onSelect={selectCountry}
            onClose={close}
            onRanking={openRanking}
            onBack={fromRanking ? () => setRanking(lastMetric) : undefined}
            maxHeight={sheetHeight}
          />
        )
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: space.lg, right: space.lg, gap: space.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16 },
  results: { marginLeft: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.md },
  hint: { marginLeft: 48, textShadowColor: '#000A', textShadowRadius: 4 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flag: { width: 64, height: 43, borderRadius: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fact: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  back: { alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipFlag: { width: 22, height: 15, borderRadius: 2 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center' },
  timeline: { gap: space.sm, paddingLeft: space.md, borderLeftWidth: 2, borderLeftColor: colors.border },
})
