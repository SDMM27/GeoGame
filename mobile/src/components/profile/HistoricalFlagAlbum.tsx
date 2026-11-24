import { useTranslation } from 'react-i18next'

import { View } from 'react-native'

import { HISTORICAL_FLAG_COST, hasHistoricalPackReward } from '@shared/utils/historicalFlagCollection'

import { Text } from '@/components/ui'

import { makeStyles, radius, space } from '@/theme'

export type HistoricalCard = {
  id: string
  years: string
  name: { fr: string; en: string }
  description: { fr: string; en: string }
  source?: string
  artwork?: { url: string; credit: string }
}

export type HistoricalAlbum = {
  state: { active: string | null; progress: Record<string, number>; unlocked: string[]; next?: string } | null
  error: boolean
}

export function HistoricalPackStatus({ album }: { album: HistoricalAlbum }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { state, error } = album
  if (!state) return error ? <Text accessibilityRole="alert">{t('collection.historical.load_error')}</Text> : null
  if (state.next) {
    return (
      <View style={styles.panel}>
        <Text variant="caption">{t('collection.historical.queued')}</Text>
      </View>
    )
  }
  if (!hasHistoricalPackReward(state)) {
    return state.active ? null : (
      <View style={styles.panel}>
        <Text variant="caption">{t('collection.historical.catalog_complete')}</Text>
      </View>
    )
  }
  return (
    <View style={styles.panel}>
      <Text variant="caption">{t('collection.historical.pack_hint', { total: HISTORICAL_FLAG_COST })}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  panel: { gap: space.sm, padding: space.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
}))
