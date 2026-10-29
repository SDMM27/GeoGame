// The atlas' rankings: every country sorted by one metric, in a bottom sheet shaped like the country sheet.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Platform, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getAtlasRanking } from '@shared/utils/countryInfo'

import { Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { colors, radius, space } from '@/theme'

import { METRICS, METRIC_LABEL_KEYS, formatMetric, type Metric } from './format'

type Row = { admin: string; iso: string; name: string; value: number | null; rank: number }

const ROW_HEIGHT = 44

export function RankingSheet({
  metric,
  selected,
  onMetric,
  onPick,
  onClose,
  maxHeight,
}: {
  metric: Metric
  selected: string | null
  onMetric: (metric: Metric) => void
  onPick: (admin: string) => void
  onClose: () => void
  maxHeight: number
}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const lang = i18n.language
  const listRef = useRef<FlatList<Row>>(null)
  const rows = useMemo(() => getAtlasRanking(metric, lang) as Row[], [metric, lang])

  // Bring the selected country to the middle of the list, when opened and when the metric changes
  useEffect(() => {
    const index = selected ? rows.findIndex((row) => row.admin === selected) : -1
    const timer = setTimeout(() => {
      if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false })
      else listRef.current?.scrollToOffset({ offset: 0, animated: false })
    }, 50)
    return () => clearTimeout(timer)
    // Only on open / metric change: picking elsewhere closes the sheet anyway
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  return (
    <Animated.View
      entering={Platform.OS === 'android' ? FadeInDown.duration(220) : SlideInDown.springify().damping(20)}
      style={[styles.sheet, { maxHeight, height: maxHeight }]}>
      <View style={styles.header}>
        <Text variant="title" style={{ flex: 1 }}>
          {t('atlas.rankings')}
        </Text>
        <Touchable accessibilityRole="button" accessibilityLabel={t('atlas.close')} onPress={onClose} style={styles.iconButton}>
          <MaterialCommunityIcons name="close" size={20} color={colors.text} />
        </Touchable>
      </View>

      <View style={{ flexGrow: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metrics}>
          {METRICS.map((id) => {
            const active = id === metric
            return (
              <Touchable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onMetric(id)}
                style={[styles.metric, active && styles.metricActive]}>
                <Text variant="caption" color={active ? colors.onAccent : colors.text}>
                  {t(METRIC_LABEL_KEYS[id])}
                </Text>
              </Touchable>
            )
          })}
        </ScrollView>
      </View>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.admin}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
        renderItem={({ item }) => {
          const flag = getFlag(item.iso)
          return (
            <Touchable
              accessibilityRole="button"
              onPress={() => onPick(item.admin)}
              style={[styles.row, item.admin === selected && styles.rowSelected]}>
              <Text variant="caption" style={styles.rank}>
                {item.rank}
              </Text>
              {flag ? <Image source={flag} contentFit="cover" style={styles.flag} accessible={false} alt="" /> : <View style={styles.flag} />}
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.value == null ? t('atlas.unknown') : formatMetric(metric, item.value, t, lang)}
              </Text>
            </Touchable>
          )
        }}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
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
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingBottom: space.sm },
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
  metrics: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  metric: {
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  rowSelected: { backgroundColor: colors.surfaceHigh },
  rank: { width: 28, textAlign: 'right' },
  flag: { width: 22, height: 15, borderRadius: 2 },
})
