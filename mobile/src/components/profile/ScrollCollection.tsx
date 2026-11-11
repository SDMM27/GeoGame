// Scroll collection of an account, in the profile: on your own, the count, the seals toward the next scroll and the link
// to the collection screen; on another player's profile only the count (no titles, no grid, no link: the maps stay
// private to their owner). Rules and data: @shared/utils/scrollCollection. Renders nothing while it loads.
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { onPublicDataPatched } from '@shared/utils/publicProfile'
import { fetchScrolls, SCROLLS, SEALS_PER_SCROLL } from '@shared/utils/scrollCollectionData'

import { CollapsibleSection } from '@/components/CollapsibleSection'
import { waxSeal } from '@/components/scrolls/ScrollImage'
import { Button, Text } from '@/components/ui'
import { makeStyles, radius, space, useColors } from '@/theme'

export type Scrolls = { unlocked: string[]; seals: number }

export function ScrollCollectionView({ scrolls, own = false, sectionId = 'scrolls' }: { scrolls: Scrolls; own?: boolean; sectionId?: string }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const total = SCROLLS.length
  const count = scrolls.unlocked.length
  const progress = t('scrolls.progress', { count, total })

  if (!own) return <Text variant="caption">{progress}</Text>

  const summary = (
    <Text variant="caption" numberOfLines={1} accessibilityLabel={progress}>
      {count} / {total}
    </Text>
  )
  return (
    <CollapsibleSection id={sectionId} title={t('scrolls.title')} summary={summary} defaultOpen>
      <View style={styles.card}>
        {count >= total ? (
          <Text variant="bodyStrong" color={colors.accent}>
            {t('scrolls.complete')}
          </Text>
        ) : (
          <View style={styles.seals}>
            <View style={styles.pips}>
              {Array.from({ length: SEALS_PER_SCROLL as number }, (_, index) => (
                <View key={index} style={[styles.pip, index < scrolls.seals && styles.pipFull]} />
              ))}
            </View>
            <Text variant="bodyStrong">{t('scrolls.seals', { count: scrolls.seals, total: SEALS_PER_SCROLL })}</Text>
          </View>
        )}
        <Text variant="caption" style={{ fontSize: 12 }}>
          {t('scrolls.hint', { total: SEALS_PER_SCROLL })}
        </Text>
        <Button label={t('scrolls.open_collection')} onPress={() => router.push('/parchments')} />
      </View>
    </CollapsibleSection>
  )
}

export function ScrollCollection({ uid, own = false }: { uid: string; own?: boolean }) {
  const [scrolls, setScrolls] = useState<{ uid: string; value: Scrolls } | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchScrolls(uid).then((value: Scrolls) => {
        if (!cancelled) setScrolls({ uid, value })
      })
    load()
    // A claim patches the cached account: the seals and scrolls it paid show at once
    const stop = onPublicDataPatched((patched: string) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])
  return scrolls?.uid === uid ? <ScrollCollectionView scrolls={scrolls.value} own={own} sectionId={own ? 'own.scrolls' : 'player.scrolls'} /> : null
}

const useStyles = makeStyles((colors) => ({
  card: { gap: space.md, backgroundColor: colors.board, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  seals: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pips: { flexDirection: 'row', gap: 6 },
  pip: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.borderStrong },
  pipFull: { backgroundColor: waxSeal, borderColor: '#D8664F' },
}))
