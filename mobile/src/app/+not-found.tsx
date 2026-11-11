import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text as RNText, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DepartureRow, DeparturesBoard, Kicker, ScreenTitle, Stamp } from '@/components/flight'
import { Button, Text } from '@/components/ui'
import { getGame } from '@/games'
import { colors, fonts, space } from '@/theme'

// Any route that matches no screen (a stale link, a mistyped URL on the web): a departures board where the flight is cancelled.
export default function NotFound() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const before = getGame('placement')
  const after = getGame('flags')

  return (
    <View accessibilityRole="alert" style={[styles.screen, { paddingTop: insets.top + space.xl, paddingBottom: Math.max(insets.bottom, space.xl) }]}>
      <DeparturesBoard>
        {before && <DepartureRow game={before.id} code={before.code} name={t(before.titleKey).toUpperCase()} status={t('home.status_on_time').toUpperCase()} />}
        <View style={[styles.row, styles.cancelled]} accessible accessibilityLabel={`${t('not_found.title')}, ${t('not_found.status_cancelled')}`}>
          <RNText style={styles.code}>GG-404</RNText>
          <RNText style={[styles.name, styles.struck]} numberOfLines={2}>
            {t('not_found.title').toUpperCase()}
          </RNText>
          <RNText style={styles.status}>{t('not_found.status_cancelled').toUpperCase()}</RNText>
        </View>
        {after && <DepartureRow game={after.id} code={after.code} name={t(after.titleKey).toUpperCase()} status={t('home.status_boarding').toUpperCase()} statusTone="boarding" last />}
      </DeparturesBoard>

      <View style={styles.hero}>
        <View>
          <MaterialCommunityIcons name="compass-off-outline" size={88} color={colors.textMuted} />
          <Stamp label={t('not_found.cancelled').toUpperCase()} tone="bad" rotate={-8} size={13} style={styles.stamp} />
        </View>
        <Kicker color={colors.gold}>{t('not_found.flight')} GG-404</Kicker>
        <ScreenTitle size={34} style={{ textAlign: 'center' }}>
          {t('not_found.title')}
        </ScreenTitle>
        <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 320 }}>
          {t('not_found.message')}
        </Text>
      </View>

      <Button
        label={t('not_found.home')}
        onPress={() => router.replace('/')}
        icon={<MaterialCommunityIcons name="arrow-right" size={20} color={colors.onAccent} />}
        style={{ alignSelf: 'stretch' }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg, gap: space.xxl, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: space.md },
  stamp: { position: 'absolute', right: -64, bottom: -4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.boardLine },
  cancelled: { backgroundColor: `${colors.danger}14` },
  code: { width: 52, fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold },
  name: { flex: 1, minWidth: 0, fontFamily: fonts.monoBold, fontSize: 12, color: colors.textMuted },
  struck: { textDecorationLine: 'line-through' },
  status: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8, color: colors.danger },
})
