// Flag collection of an account (rules in @shared/utils/flagCollection): the flag being rebuilt with the pieces won so
// far, the unlocked flags by rarity, and the progress of the "Légende" badge.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'

import { fetchCollection, FLAG_POOL } from '@shared/utils/flagCollectionData'
import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COLOR, HISTORICAL_FLAG_COST } from '@shared/data/historicalFlags'
import { pieceGrid, piecesFor, RARITIES, RARITY_COLORS } from '@shared/utils/flagCollection'
import { getCountryName } from '@shared/utils/getCountryName'
import { useHistoricalFlags } from '@shared/utils/historicalFlagCollectionData'
import { onPublicDataPatched } from '@shared/utils/publicProfile'

import ArchiveSigil from '@/components/collection/ArchiveSigil'
import { FlagPiece } from '@/components/collection/FlagPiece'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { replayFlag } from '@/components/collection/replay'
import { Kicker } from '@/components/flight'
import { Segmented, Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { getHistoricalFlag } from '@/historicalFlags'
import { makeStyles, radius, space, useColors } from '@/theme'

import { HistoricalPackStatus, type HistoricalAlbum, type HistoricalCard } from './HistoricalFlagAlbum'

type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
type Progress = { found: number; total: number }
export type Collection = {
  flags: { unlocked: string[]; current: string | null; pieces: number }
  mastery: { placement: Progress; flags: Progress; hardcore: Progress; capitals: Progress; found: number; total: number }
}

const RARITY_OF = new Map<string, Rarity>((FLAG_POOL as { iso: string; rarity: Rarity }[]).map((flag) => [flag.iso, flag.rarity]))
const RARITY_ORDER = RARITIES as Rarity[]
const COLORS = RARITY_COLORS as Record<Rarity, string>
const FIRST = 24

/** Unlocked flags, rarest first then by name. */
export function sortFlags(unlocked: string[], lang: string): string[] {
  const rank = (iso: string) => RARITY_ORDER.indexOf(RARITY_OF.get(iso) ?? 'common')
  const name = (iso: string) => (getCountryName(iso, lang) as string) || iso
  return [...unlocked].sort((a, b) => rank(b) - rank(a) || name(a).localeCompare(name(b), lang))
}

// The pieces of a flag (cost pieces, cut by pieceGrid), left to right then top to bottom; the pieces not won yet are covered.
function PieceFlag({ iso, pieces, cost, historical }: { iso: string; pieces: number; cost: number; historical: boolean }) {
  const styles = useStyles()
  const { cols, rows } = historical ? { cols: 5, rows: 2 } : pieceGrid(cost)
  const quarters = Array.from({ length: cost }, (_, index) => index)
  return (
    <View style={styles.pieceFlag} testID="piece-flag">
      {quarters.map((index) =>
        <View
          key={index}
          testID={index < pieces ? 'visible-piece' : 'hidden-piece'}
          style={[
            styles.quarter,
            {
              left: `${(index % cols) * (100 / cols)}%`,
              top: `${Math.floor(index / cols) * (100 / rows)}%`,
              width: `${100 / cols}%`,
              height: `${100 / rows}%`,
            },
          ]}
        >
          {index < pieces && (historical ? <View style={styles.mysteryPiece} /> : <FlagPiece iso={iso} index={index} cols={cols} rows={rows} />)}
          {index >= pieces && <View style={styles.cover} />}
        </View>,
      )}
    </View>
  )
}

// A rarity spelled out with its colour (the border of its flags below) and how many of its flags are unlocked.
function RarityCount({ rarity, count }: { rarity: Rarity | 'historical'; count: number }) {
  const { t } = useTranslation()
  const styles = useStyles()
  return (
    <View style={styles.rarityItem}>
      <View style={[styles.dot, { backgroundColor: rarity === 'historical' ? HISTORICAL_FLAG_COLOR : COLORS[rarity] }]} />
      <Text variant="caption" style={{ fontSize: 12 }}>
        {t(rarity === 'historical' ? 'collection.historical.title' : `collection.rarity.${rarity}`)} · {count}
      </Text>
    </View>
  )
}

type Filter = 'all' | 'classic' | 'historical'

export function FlagCollectionView({ collection, sectionId = 'collection', historicalAlbum, own = false }: { collection: Collection; sectionId?: string; historicalAlbum?: HistoricalAlbum; own?: boolean }) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const { flags, mastery } = collection
  const total = FLAG_POOL.length
  const historicalCount = historicalAlbum?.state?.unlocked.length ?? 0
  const hasHistorical = historicalAlbum && (own || historicalCount > 0)
  const activeFilter = hasHistorical ? filter : 'all'
  const count = (activeFilter === 'historical' ? 0 : flags.unlocked.length) + (activeFilter === 'classic' ? 0 : historicalCount)
  const shownTotal = (activeFilter === 'historical' ? 0 : total) + (historicalAlbum && activeFilter !== 'classic' ? HISTORICAL_FLAGS.length : 0)
  const sorted = useMemo(() => sortFlags(flags.unlocked, i18n.language), [flags.unlocked, i18n.language])
  const counts = useMemo(() => {
    const result: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    for (const iso of flags.unlocked) result[RARITY_OF.get(iso) ?? 'common'] += 1
    return result
  }, [flags.unlocked])
  const historicalTiles = (HISTORICAL_FLAGS as HistoricalCard[]).filter(({ id }) => historicalAlbum?.state?.unlocked.includes(id))
  const tiles = [...(activeFilter === 'classic' ? [] : historicalTiles.map(({ id }) => id)), ...(activeFilter === 'historical' ? [] : sorted)]
  const shown = showAll ? tiles : tiles.slice(0, FIRST)
  const complete = flags.unlocked.length >= total && count >= shownTotal
  const historicalCurrent = own && historicalAlbum?.state?.active
  const current = historicalCurrent || flags.current
  const pieces = historicalCurrent ? historicalAlbum?.state?.progress[historicalCurrent] ?? 0 : flags.pieces
  const cost = historicalCurrent ? HISTORICAL_FLAG_COST : piecesFor(current ? RARITY_OF.get(current) : undefined)
  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const modes = [
    ['placement', mastery.placement],
    ['flags', mastery.flags],
    ['hardcore', mastery.hardcore],
    ['capitals', mastery.capitals],
  ] as const

  // The title already says "flags" and leaves little room on a phone: only the numbers fit next to it.
  const summary = (
    <Text variant="caption" numberOfLines={1} accessibilityLabel={t('collection.progress', { count, total: shownTotal })}>
      {count} / {shownTotal}
    </Text>
  )

  return (
    <CollapsibleSection id={sectionId} title={t('collection.title')} summary={summary} defaultOpen>
      <View style={styles.sections}>
        {hasHistorical && <Segmented
          value={activeFilter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('collection.filter_all') },
            { value: 'classic', label: t('collection.filter_classic') },
            { value: 'historical', label: t('collection.historical.title') },
          ]}
        />}
        <View style={styles.card}>
        {own && historicalAlbum && <HistoricalPackStatus album={historicalAlbum} />}
        {complete ? (
          <Text variant="bodyStrong" color={colors.accent}>
            {t('collection.complete')}
          </Text>
        ) : current && (activeFilter === 'all' || (activeFilter === 'historical') === Boolean(historicalCurrent)) ? (
          <View style={styles.current}>
            <PieceFlag iso={current} pieces={pieces} cost={cost} historical={Boolean(historicalCurrent)} />
            <View style={{ flex: 1, gap: 2 }}>
              <Kicker>{t(historicalCurrent ? 'collection.historical.current' : 'collection.current')}</Kicker>
              {historicalCurrent
                ? <ArchiveSigil size={22} color="#EFCB86" />
                : <Text variant="bodyStrong" accessibilityElementsHidden>⚑</Text>}
              <Text variant="caption" color={colors.accent}>
                {t('collection.pieces', { count: pieces, total: cost })}
              </Text>
              {!historicalCurrent && <Text variant="caption" style={{ fontSize: 12 }}>
                {t('collection.hint')}
              </Text>}
            </View>
          </View>
        ) : !tiles.length ? <Text variant="caption">{t('collection.empty')}</Text> : null}

        {tiles.length > 0 && (
          <>
            <Kicker>{t('collection.unlocked')}</Kicker>
            <View style={styles.rarities}>
              {activeFilter !== 'classic' && historicalTiles.length > 0 && <RarityCount rarity="historical" count={historicalCount} />}
              {activeFilter !== 'historical' && RARITY_ORDER.map((rarity) => (
                <RarityCount key={rarity} rarity={rarity} count={counts[rarity]} />
              ))}
            </View>
            <View style={styles.grid}>
              {shown.map((iso) => {
                const historical = historicalTiles.find(({ id }) => id === iso)
                const source = historical ? getHistoricalFlag(iso) : getFlag(iso)
                return (
                  <Touchable
                    key={iso}
                    testID={`flag-${iso}`}
                    accessibilityRole="button"
                    accessibilityLabel={historical ? `${historical.name[language]} · ${t('collection.historical.title')}` : getCountryName(iso, i18n.language) as string}
                    onPress={() => replayFlag(iso)}
                    style={[styles.cell, { borderColor: historical ? HISTORICAL_FLAG_COLOR : COLORS[RARITY_OF.get(iso) ?? 'common'] }]}
                  >
                    {source != null && <Image source={source} style={styles.cellImage} resizeMode={historical ? 'contain' : 'cover'} accessible={false} alt="" />}
                  </Touchable>
                )
              })}
            </View>
            {tiles.length > FIRST && (
              <Touchable accessibilityRole="button" onPress={() => setShowAll(!showAll)}>
                <Text variant="caption" color={colors.highlight}>
                  {t(showAll ? 'collection.show_less' : 'collection.show_all')}
                </Text>
              </Touchable>
            )}
          </>
        )}

        {activeFilter !== 'historical' && <View style={styles.legend}>
          <Kicker>{t('collection.legend_progress', { count: mastery.found, total: mastery.total })}</Kicker>
          {modes.map(([mode, progress]) => (
            <View key={mode} style={styles.modeRow}>
              <Text variant="caption" style={{ flex: 1 }}>
                {t(`collection.mode_${mode}`)}
              </Text>
              <Text variant="caption">
                {progress.found}/{progress.total}
              </Text>
            </View>
          ))}
        </View>}
        </View>
      </View>
    </CollapsibleSection>
  )
}

// Renders nothing while the collection loads.
export function FlagCollection({ uid, own = false }: { uid: string; own?: boolean }) {
  const [collection, setCollection] = useState<{ uid: string; value: Collection } | null>(null)
  const historicalAlbum = useHistoricalFlags(uid)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchCollection(uid).then((value: Collection) => {
        if (!cancelled) setCollection({ uid, value })
      })
    load()
    const stop = onPublicDataPatched((patched: string) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])
  if (collection?.uid !== uid) return null
  const sectionId = own ? 'own.collection' : 'player.collection'
  return (
    <FlagCollectionView key={uid} collection={collection.value} sectionId={sectionId} historicalAlbum={historicalAlbum} own={own} />
  )
}

const CELL = 44
const useStyles = makeStyles((colors) => ({
  sections: { gap: space.md },
  card: {
    gap: space.md,
    backgroundColor: colors.board,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  rarities: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: space.xs },
  rarityItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  current: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pieceFlag: { width: 96, height: 64, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  quarter: { position: 'absolute', overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.borderStrong },
  mysteryPiece: { ...StyleSheet.absoluteFill, backgroundColor: '#B89660', borderWidth: 1, borderColor: '#EFCB86' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: CELL, height: CELL * 0.7, borderRadius: 6, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  cellImage: { width: CELL - 4, height: CELL * 0.7 - 4 },
  legend: { gap: 6, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
}))
