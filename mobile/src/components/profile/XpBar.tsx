// Level chip and XP bar (rules in @shared/utils/missions).
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { Pill, Text } from '@/components/ui'
import { fonts, makeStyles, radius, space, useColors } from '@/theme'

export type Xp = { total: number; level: number; into: number; needed: number }

export function XpBar({ xp }: { xp: Xp }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const ratio = xp.needed > 0 ? Math.min(1, xp.into / xp.needed) : 0
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pill label={t('level.label', { level: xp.level })} color={colors.onAccent} background={colors.accent} />
        <Text style={styles.progress}>{t('level.progress', { into: xp.into, needed: xp.needed })}</Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: xp.needed, now: xp.into }}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  progress: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },
}))
