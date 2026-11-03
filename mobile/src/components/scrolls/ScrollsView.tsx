// The collection page's content: the scrolls by era and the sheet of the ones owned. An owned scroll shows its thumbnail,
// title and year and opens its sheet; a missing one is a sealed tile that only names its era (no title, no image, not
// pressable). A sheet opens only for an owned scroll: `requested` is ignored otherwise.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { formatScrollDate, scrollById, scrollsByEra, SCROLLS, SEALS_PER_SCROLL } from '@shared/utils/scrollCollectionData'

import { ScrollImage, parchment } from '@/components/scrolls/ScrollImage'
import { ScrollSeal } from '@/components/scrolls/ScrollSeal'
import { ScrollSheet } from '@/components/scrolls/ScrollSheet'
import { Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

export type Scrolls = { unlocked: string[]; seals: number }
type Tile = { id: string; era: string; family: 'period' | 'atlas'; year: number; owned: boolean }
type Group = { era: string; scrolls: Tile[] }

export function ScrollGrid({ unlocked, onOpen }: { unlocked: string[]; onOpen: (id: string) => void }) {
  const { t } = useTranslation()
  return (
    <View style={{ gap: space.xl }}>
      {(scrollsByEra(unlocked) as Group[]).map(({ era, scrolls }) => (
        <View key={era} style={{ gap: space.sm }}>
          <Text variant="label">{t(`scrolls.era.${era}`)}</Text>
          <View style={styles.grid}>
            {scrolls.map((scroll) =>
              scroll.owned ? (
                <Touchable
                  key={scroll.id}
                  testID={`scroll-${scroll.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t(`scrolls.title_${scroll.id}`)}
                  onPress={() => onOpen(scroll.id)}
                  style={styles.tile}>
                  <ScrollImage id={scroll.id} style={styles.thumb} />
                  <View style={styles.tileText}>
                    <Text variant="bodyStrong" style={{ fontSize: 13, lineHeight: 17 }} numberOfLines={3}>
                      {t(`scrolls.title_${scroll.id}`)}
                    </Text>
                    <Text variant="caption" style={{ fontSize: 12 }}>
                      {formatScrollDate(t, scroll) as string}
                    </Text>
                  </View>
                </Touchable>
              ) : (
                <View key={scroll.id} testID="sealed-scroll" accessible accessibilityLabel={t('scrolls.sealed')} style={[styles.tile, styles.sealed]}>
                  <ScrollSeal size={40} />
                  <Text variant="caption" style={{ fontSize: 12, textAlign: 'center' }}>
                    {t(`scrolls.era.${era}`)}
                  </Text>
                </View>
              ),
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

export function ScrollsView({ scrolls, requested = null }: { scrolls: Scrolls; requested?: string | null }) {
  const { t } = useTranslation()
  const owned = (id: string | null) => (id && scrolls.unlocked.includes(id) ? (scrollById(id) as Tile | null) : null)
  const [openId, setOpenId] = useState<string | null>(requested)
  const open = owned(openId)
  return (
    <>
      <View style={{ gap: space.xl }}>
        <Text variant="caption">{t('scrolls.progress', { count: scrolls.unlocked.length, total: SCROLLS.length })}</Text>
        <View style={styles.howTo}>
          <Text variant="bodyStrong">{t('scrolls.seals', { count: scrolls.seals, total: SEALS_PER_SCROLL })}</Text>
          <Text variant="caption">{t('scrolls.hint', { total: SEALS_PER_SCROLL })}</Text>
        </View>
        <ScrollGrid unlocked={scrolls.unlocked} onOpen={(id) => owned(id) && setOpenId(id)} />
      </View>
      {open && <ScrollSheet scroll={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  howTo: { gap: space.xs, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tile: { width: '47.5%', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  thumb: { width: '100%', aspectRatio: 4 / 3, backgroundColor: parchment.mid },
  tileText: { padding: space.sm, gap: 2 },
  sealed: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.md, borderStyle: 'dashed', backgroundColor: colors.surfaceHigh },
})
