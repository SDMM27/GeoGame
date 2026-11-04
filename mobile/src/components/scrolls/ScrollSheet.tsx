// The sheet of an owned scroll, over the screen: its map (zoom and pan) fixed at the top, then the title, the date, the
// kind of map, the story and the detail to spot when the texts of the player's language (or English, or French) have
// them, and the credit line. The caller only opens it for a scroll the account owns.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { hasEmpireMap } from '@shared/data/empires'
import { loadScrollText } from '@shared/data/scrollTexts'
import { formatScrollDate, formatScrollYear } from '@shared/utils/scrollCollectionData'

import { EmpireMap } from '@/components/scrolls/EmpireMap'
import { ScrollMap } from '@/components/scrolls/ScrollMap'
import { Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Scroll = { id: string; family: 'period' | 'atlas'; year: number }
type SheetText = { body?: string; detail?: string; credit?: string }

export function ScrollSheet({ scroll, onClose }: { scroll: Scroll; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  // Texts with the scroll and language they were loaded for: others are not shown
  const [interactive, setInteractive] = useState(false)
  const [loaded, setLoaded] = useState<{ key: string; text: SheetText } | null>(null)
  const key = `${scroll.id}:${i18n.language}`
  const text: SheetText = loaded?.key === key ? loaded.text : {}
  const title = t(`scrolls.title_${scroll.id}`)
  const year = formatScrollYear(t, scroll.year) as string

  useEffect(() => {
    let cancelled = false
    ;(loadScrollText(scroll.id, i18n.language) as Promise<SheetText>).then((result) => {
      if (!cancelled) setLoaded({ key: `${scroll.id}:${i18n.language}`, text: result })
    })
    return () => {
      cancelled = true
    }
  }, [scroll.id, i18n.language])

  // Android's back button closes the sheet, not the screen under it
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => subscription.remove()
  }, [onClose])

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <Text variant="heading" numberOfLines={2} style={{ flex: 1 }}>
          {title}
        </Text>
        <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.close')} onPress={onClose} style={styles.close}>
          <MaterialCommunityIcons name="close" size={22} color={colors.text} />
        </Touchable>
      </View>
      {hasEmpireMap(scroll.id) ? (
        <View style={styles.views}>
          {[false, true].map((on) => (
            <Touchable
              key={String(on)}
              testID={on ? 'scroll-view-interactive' : 'scroll-view-old'}
              accessibilityRole="button"
              accessibilityState={{ selected: interactive === on }}
              onPress={() => setInteractive(on)}
              style={[styles.view, interactive === on && styles.viewOn]}>
              <Text variant="bodyStrong" color={interactive === on ? colors.onAccent : colors.text}>
                {t(on ? 'scrolls.view_interactive' : 'scrolls.view_old')}
              </Text>
            </Touchable>
          ))}
        </View>
      ) : null}
      <View style={{ paddingHorizontal: space.lg }}>
        {interactive && hasEmpireMap(scroll.id) ? (
          <EmpireMap key={scroll.id} id={scroll.id} maxHeight={height * 0.3} />
        ) : (
          <ScrollMap key={scroll.id} id={scroll.id} label={title} maxHeight={height * 0.45} />
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xxl, gap: space.md }}>
        <View style={{ gap: 2 }}>
          {scroll.family !== 'atlas' ? (
            <Text variant="bodyStrong" color={colors.accent}>
              {formatScrollDate(t, scroll) as string}
            </Text>
          ) : null}
          <Text variant="caption">{scroll.family === 'atlas' ? t('scrolls.family_atlas', { year }) : t('scrolls.family_period')}</Text>
        </View>
        {text.body ? <Text variant="body">{text.body}</Text> : null}
        {text.detail ? (
          <View style={styles.detail}>
            <Text variant="bodyStrong">{t('scrolls.detail_title')}</Text>
            <Text variant="body">{text.detail}</Text>
          </View>
        ) : null}
        {text.credit ? (
          <Text variant="caption">
            {t('scrolls.credit_title')} · {text.credit}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 50, elevation: 50, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  close: { width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  views: { flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, paddingBottom: space.sm },
  view: { flex: 1, minHeight: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  viewOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  detail: { gap: 4, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, borderLeftWidth: 3, borderLeftColor: colors.warning },
})
