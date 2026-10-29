// The country's sheet shown once the game is over: the facts to remember, with their world rank, and its neighbors.
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { getCountryInfo } from '@shared/utils/countryInfo'

import { formatMetric, type Metric } from '@/components/atlas/format'
import { Button, Text } from '@/components/ui'
import { getFlag } from '@/flags'
import { colors, radius, space } from '@/theme'
import type { Feature } from './labels'

type Rank = { rank: number; total: number } | null
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
  neighbors: { admin: string; iso: string; name: string }[]
}

function Fact({ label, value, rank }: { label: string; value: string; rank?: Rank }) {
  const { t } = useTranslation()
  return (
    <View style={styles.fact}>
      <Text variant="caption">{label}</Text>
      <Text variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {rank && <Text variant="caption" color={colors.highlight}>{t(rank.rank === 1 ? 'atlas.rank_first' : 'atlas.rank', rank)}</Text>}
    </View>
  )
}

export function CountrySheet({ country }: { country: Feature }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const info = useMemo(() => getCountryInfo(country, lang) as Info | null, [country, lang])
  if (!info) return null
  const unknown = t('atlas.unknown')
  const flag = getFlag(info.iso)
  const metric = (key: Metric, value: number | null) => (value ? formatMetric(key, value, t, lang) : unknown)

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('country_of_day.sheet_title')}</Text>
      <View style={styles.header}>
        {flag && <Image source={flag} contentFit="cover" style={styles.flag} accessible={false} alt="" />}
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={2} adjustsFontSizeToFit>
            {info.name}
          </Text>
          {info.continent && <Text variant="caption">{t(`continents.${info.continent}`, { defaultValue: info.continent })}</Text>}
        </View>
      </View>
      <View style={styles.facts}>
        <Fact label={t('atlas.capital')} value={info.capital ?? unknown} />
        <Fact label={t('atlas.population')} value={metric('population', info.population)} rank={info.populationRank} />
        <Fact label={t('atlas.area')} value={metric('area', info.areaKm2)} rank={info.areaRank} />
        <Fact label={t('atlas.density')} value={metric('density', info.density)} rank={info.densityRank} />
        <Fact label={t('atlas.gdp')} value={metric('gdp', info.gdp)} rank={info.gdpRank} />
        <Fact label={t('atlas.gdp_per_capita')} value={metric('gdpPerCapita', info.gdpPerCapita)} rank={info.gdpPerCapitaRank} />
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
                <View key={neighbor.admin} style={styles.chip}>
                  {neighborFlag && <Image source={neighborFlag} contentFit="cover" style={styles.chipFlag} accessible={false} alt="" />}
                  <Text variant="caption" color={colors.text}>
                    {neighbor.name}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </View>
      {/* The Atlas opens on the country given in `country` */}
      <Button label={t('country_of_day.see_atlas')} variant="secondary" onPress={() => router.push({ pathname: '/atlas', params: { country: info.admin } })} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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
})
