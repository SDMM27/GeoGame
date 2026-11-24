import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Linking, View } from 'react-native'

import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COLOR } from '@shared/data/historicalFlags'
import { HISTORICAL_FLAG_COST } from '@shared/utils/historicalFlagCollection'

import { replayFlag } from '@/components/collection/replay'
import { Button, Text, Touchable } from '@/components/ui'
import { getHistoricalFlag } from '@/historicalFlags'
import { makeStyles, radius, space, useColors } from '@/theme'

type Card = {
  id: string
  years: string
  name: { fr: string; en: string }
  description: { fr: string; en: string }
  source?: string
  artwork?: { url: string; credit: string }
}

type AlbumState = { active: string | null; progress: Record<string, number>; unlocked: string[] }
export type HistoricalAlbum = {
  state: AlbumState | null
  select: (id: string | null) => Promise<boolean>
  busy: boolean
  error: boolean
}

const CARDS = HISTORICAL_FLAGS as Card[]
const COST = HISTORICAL_FLAG_COST as number

export function HistoricalFlagAlbumView({ album, own }: { album: HistoricalAlbum; own: boolean }) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const [selected, setSelected] = useState<string | null>(null)
  const { state, select, busy, error } = album
  if (!state) {
    return own && error ? <Text variant="caption" accessibilityRole="alert">{t('collection.historical.load_error')}</Text> : null
  }
  if (!own && state.unlocked.length === 0) return null

  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const cards = own ? CARDS : CARDS.filter(({ id }) => state.unlocked.includes(id))
  const card = cards.find(({ id }) => id === selected) ?? cards.find(({ id }) => id === state.active) ?? cards[0]
  const unlocked = state.unlocked.includes(card.id)
  const active = own && card.id === state.active
  const pieces = unlocked ? COST : state.progress[card.id] ?? 0
  const { artwork, source: sourceUrl } = card
  return (
      <View style={styles.album}>
        <Text variant="heading">{t('collection.historical.title')}</Text>
        {own && <Text variant="caption">{t('collection.historical.hint', { total: COST })}</Text>}
        <View style={styles.grid}>
          {cards.map(({ id, name, years }) => {
            const complete = state.unlocked.includes(id)
            const targeted = own && id === state.active
            const count = complete ? COST : state.progress[id] ?? 0
            const label = targeted ? `${t('collection.historical.active')} · ${count}/${COST}` : `${count}/${COST}`
            const source = getHistoricalFlag(id)
            return (
              <Touchable
                key={id}
                onPress={() => setSelected(id)}
                accessibilityRole="button"
                accessibilityLabel={[name[language], years, own && label].filter(Boolean).join(', ')}
                accessibilityState={{ selected: card.id === id }}
                style={[styles.tile, card.id === id && styles.tileSelected]}
              >
                <Image source={source} resizeMode="contain" accessible={false} style={[styles.flag, !complete && styles.flagPreview]} />
                <Text variant="caption" color={colors.text} style={styles.name}>{name[language]}</Text>
                <Text variant="caption" style={styles.meta}>{years}</Text>
                {own && <Text variant="caption" color={targeted ? colors.accent : undefined} style={styles.meta}>{label}</Text>}
              </Touchable>
            )
          })}
        </View>
        <View style={styles.detail}>
          <Text variant="bodyStrong">{card.name[language]}</Text>
          <Text variant="caption" style={styles.meta}>{card.years}</Text>
          <Text variant="caption">{card.description[language]}</Text>
          {sourceUrl && (
            <Touchable accessibilityRole="link" onPress={() => Linking.openURL(sourceUrl).catch(() => {})}>
              <Text variant="caption" color={colors.highlight}>{t('collection.historical.source')}</Text>
            </Touchable>
          )}
          {artwork && (
            <Touchable accessibilityRole="link" onPress={() => Linking.openURL(artwork.url).catch(() => {})}>
              <Text variant="caption" color={colors.highlight}>{artwork.credit}</Text>
            </Touchable>
          )}
          {unlocked && <Button variant="secondary" label={t('collection.replay_animation')} onPress={() => replayFlag(card.id)} />}
          {own && (
            <>
              <Text variant="caption">{unlocked ? t('collection.historical.unlocked') : t('collection.pieces', { count: pieces, total: COST })}</Text>
              <View style={styles.pips} accessible={false} importantForAccessibility="no-hide-descendants">
                {Array.from({ length: COST }, (_, index) => <View key={index} style={[styles.pip, index < pieces && styles.pipFilled]} />)}
              </View>
              {!unlocked && !active && (
                <Button label={t(`collection.historical.${pieces > 0 ? 'resume' : 'select'}`)} disabled={busy} onPress={() => void select(card.id)} />
              )}
              {active && <Text variant="caption" color={colors.accent}>{t('collection.historical.next_fragments')}</Text>}
            </>
          )}
        </View>
        {own && state.active && (
          <Button variant="secondary" label={t('collection.historical.back_to_classic')} disabled={busy} onPress={() => void select(null)} />
        )}
        {own && error && <Text variant="caption" accessibilityRole="alert">{t('collection.historical.error')}</Text>}
      </View>
  )
}

const useStyles = makeStyles((colors) => ({
  album: { gap: space.md, backgroundColor: colors.board, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '31%', gap: 2, padding: space.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh },
  tileSelected: { borderColor: HISTORICAL_FLAG_COLOR },
  flag: { width: '100%', height: 42, marginBottom: space.xs },
  flagPreview: { opacity: 0.48 },
  name: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 11, fontVariant: ['tabular-nums'] },
  detail: { gap: space.xs, padding: space.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  pips: { flexDirection: 'row', gap: 3, marginBottom: space.xs },
  pip: { flex: 1, height: 6, borderRadius: 2, backgroundColor: colors.borderStrong },
  pipFilled: { backgroundColor: HISTORICAL_FLAG_COLOR },
}))
