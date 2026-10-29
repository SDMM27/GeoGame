// Flag collection of an account (rules in @shared/utils/flagCollection): the flag being rebuilt with the pieces won so
// far, the unlocked flags by rarity, and the progress of the "Légende" badge.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'

import { fetchCollection, FLAG_POOL } from '@shared/utils/flagCollectionData'
import { pieceGrid, piecesFor, RARITIES, RARITY_COLORS } from '@shared/utils/flagCollection'
import { getCountryName } from '@shared/utils/getCountryName'
import { onPublicDataPatched } from '@shared/utils/publicProfile'

import { FlagPiece } from '@/components/collection/FlagPiece'
import { replayFlag } from '@/components/collection/replay'
import { Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { colors, radius, space } from '@/theme'

type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
type Progress = { found: number; total: number }
export type Collection = {
  flags: { unlocked: string[]; current: string | null; pieces: number }
  mastery: { placement: Progress; flags: Progress; hardcore: Progress; found: number; total: number }
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
function PieceFlag({ iso, pieces, cost }: { iso: string; pieces: number; cost: number }) {
  const { cols, rows } = pieceGrid(cost)
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
          <FlagPiece iso={iso} index={index} cols={cols} rows={rows} />
          {index >= pieces && <View style={styles.cover} />}
        </View>,
      )}
    </View>
  )
}

function Dot({ rarity, count }: { rarity: Rarity; count: number }) {
  const { t } = useTranslation()
  return (
    <View style={styles.dotItem} accessibilityLabel={`${t(`collection.rarity.${rarity}`)} ${count}`}>
      <View style={[styles.dot, { backgroundColor: COLORS[rarity] }]} />
      <Text variant="caption" style={{ fontSize: 12 }}>
        {count}
      </Text>
    </View>
  )
}

export function FlagCollectionView({ collection }: { collection: Collection }) {
  const { t, i18n } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const { flags, mastery } = collection
  const total = FLAG_POOL.length
  const sorted = useMemo(() => sortFlags(flags.unlocked, i18n.language), [flags.unlocked, i18n.language])
  const counts = useMemo(() => {
    const result: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    for (const iso of flags.unlocked) result[RARITY_OF.get(iso) ?? 'common'] += 1
    return result
  }, [flags.unlocked])
  const shown = showAll ? sorted : sorted.slice(0, FIRST)
  const complete = flags.unlocked.length >= total
  const cost = piecesFor(flags.current ? RARITY_OF.get(flags.current) : undefined)
  const nothing = flags.unlocked.length === 0 && !flags.current
  const modes = [
    ['placement', mastery.placement],
    ['flags', mastery.flags],
    ['hardcore', mastery.hardcore],
  ] as const

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="heading" style={{ flex: 1 }}>
          {t('collection.title')}
        </Text>
        <Text variant="caption">{t('collection.progress', { count: flags.unlocked.length, total })}</Text>
      </View>
      <View style={styles.dots}>
        {RARITY_ORDER.map((rarity) => (
          <Dot key={rarity} rarity={rarity} count={counts[rarity]} />
        ))}
      </View>

      {complete ? (
        <Text variant="bodyStrong" color={colors.accent}>
          {t('collection.complete')}
        </Text>
      ) : nothing ? (
        <Text variant="caption">{t('collection.empty')}</Text>
      ) : flags.current ? (
        <View style={styles.current}>
          <PieceFlag iso={flags.current} pieces={flags.pieces} cost={cost} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label">{t('collection.current')}</Text>
            <Text variant="bodyStrong">?</Text>
            <Text variant="caption" color={colors.accent}>
              {t('collection.pieces', { count: flags.pieces, total: cost })}
            </Text>
            <Text variant="caption" style={{ fontSize: 12 }}>
              {t('collection.hint')}
            </Text>
          </View>
        </View>
      ) : null}

      {sorted.length > 0 && (
        <>
          <Text variant="label">{t('collection.unlocked')}</Text>
          <View style={styles.grid}>
            {shown.map((iso) => {
              const source = getFlag(iso)
              return (
                <Touchable
                  key={iso}
                  testID={`flag-${iso}`}
                  accessibilityRole="button"
                  accessibilityLabel={getCountryName(iso, i18n.language) as string}
                  onPress={() => replayFlag(iso)}
                  style={[styles.cell, { borderColor: COLORS[RARITY_OF.get(iso) ?? 'common'] }]}
                >
                  {source != null && <Image source={source} style={styles.cellImage} resizeMode="cover" accessible={false} alt="" />}
                </Touchable>
              )
            })}
          </View>
          {sorted.length > FIRST && (
            <Touchable accessibilityRole="button" onPress={() => setShowAll(!showAll)}>
              <Text variant="caption" color={colors.highlight}>
                {t(showAll ? 'collection.show_less' : 'collection.show_all')}
              </Text>
            </Touchable>
          )}
        </>
      )}

      <View style={styles.legend}>
        <Text variant="label">{t('collection.legend_progress', { count: mastery.found, total: mastery.total })}</Text>
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
      </View>
    </View>
  )
}

// Renders nothing while the collection loads.
export function FlagCollection({ uid }: { uid: string }) {
  const [collection, setCollection] = useState<{ uid: string; value: Collection } | null>(null)
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
  return collection?.uid === uid ? <FlagCollectionView collection={collection.value} /> : null
}

const CELL = 44
const styles = StyleSheet.create({
  card: {
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dots: { flexDirection: 'row', gap: space.lg },
  dotItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  current: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pieceFlag: { width: 96, height: 64, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  quarter: { position: 'absolute', overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.borderStrong },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: CELL, height: CELL * 0.7, borderRadius: 6, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  cellImage: { width: CELL - 4, height: CELL * 0.7 - 4 },
  legend: { gap: 6, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
})
