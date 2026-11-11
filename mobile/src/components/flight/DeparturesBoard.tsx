// « Tableau des départs »: a dark board of mono rows, one per game.
// DeparturesBoard props: children (DepartureRow[]), style.
// DepartureRow props:
//   game     game id (emblem tile, 30 px)
//   code     flight code, in gold (« DRP »)
//   name     game name (capitals recommended)
//   status   status text (« ATTERRI », « EMBARQUEMENT », « À L'HEURE »)
//   statusTone   'done' (muted), 'boarding' (menthe) or 'ontime' (default, text color); statusColor: literal color
//   onPress  makes the row a button (min height 52 px)
//   accessibilityLabel  default « name, status »
//   last     hides the bottom divider
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import GameEmblem from '@/components/GameEmblem'
import { colors, fonts } from '@/theme'

export type DepartureTone = 'done' | 'boarding' | 'ontime'

const TONE_COLORS: Record<DepartureTone, string> = { done: colors.textMuted, boarding: colors.accent, ontime: colors.text }

export function DeparturesBoard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.board, style]}>{children}</View>
}

type RowProps = {
  game: string
  code: string
  name: string
  status: string
  statusTone?: DepartureTone
  statusColor?: string
  onPress?: () => void
  accessibilityLabel?: string
  last?: boolean
}

export function DepartureRow({ game, code, name, status, statusTone = 'ontime', statusColor, onPress, accessibilityLabel, last }: RowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? `${name}, ${status}`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, !last && styles.divider]}>
      <GameEmblem game={game} size={30} />
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.status, { color: statusColor ?? TONE_COLORS[statusTone] }]}>{status}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  board: { borderRadius: 16, backgroundColor: colors.board, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.boardLine },
  code: { width: 34, fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold },
  name: { flex: 1, minWidth: 0, fontFamily: fonts.monoBold, fontSize: 12, color: colors.text },
  status: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8 },
})
