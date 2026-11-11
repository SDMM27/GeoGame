// Dark « board » strip of cells: mono label (9 px) over a mono value (18 px). Used for the game HUD
// (ESCALE / SCORE / TEMPS) and « PROCHAIN DÉPART ».
// Props:
//   cells  { label, value, color? (value color, default text), suffix? (small muted text after the value, « /400 »),
//          accessibilityLabel? }[]. The first cell is
//          left-aligned, the last right-aligned, the ones in between centered. Without accessibilityLabel a cell is
//          read as « label, value ».
//   style  container style
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { fonts, makeStyles } from '@/theme'

export type BoardCell = { label: string; value: string; color?: string; suffix?: string; accessibilityLabel?: string }

export function BoardStrip({ cells, style }: { cells: BoardCell[]; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles()
  return (
    <View style={[styles.strip, style]}>
      {cells.map((cell, index) => {
        const align = index === 0 ? 'flex-start' : index === cells.length - 1 ? 'flex-end' : 'center'
        return (
          <View
            key={cell.label}
            accessible
            accessibilityLabel={cell.accessibilityLabel ?? `${cell.label}, ${cell.value}${cell.suffix ?? ''}`}
            style={{ flex: 1, alignItems: align, gap: 2 }}>
            <Text style={styles.label}>{cell.label}</Text>
            <Text style={[styles.value, cell.color ? { color: cell.color } : null]}>
              {cell.value}
              {cell.suffix ? <Text style={styles.suffix}>{` ${cell.suffix}`}</Text> : null}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  strip: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.board,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 12, letterSpacing: 1.08, color: colors.textMuted },
  suffix: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  value: { fontFamily: fonts.monoBold, fontSize: 18, lineHeight: 24, color: colors.text, fontVariant: ['tabular-nums'] },
}))
