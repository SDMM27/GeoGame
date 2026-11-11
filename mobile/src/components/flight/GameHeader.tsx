// Header of a game screen: close button (44 px), emblem tile, « VOL DRP · PORTE A3 » and the game title.
// Props:
//   game        game id (emblem and flight code)
//   title       game title
//   gate        gate (« A3 »); empty: no « · PORTE » in the kicker
//   tag         optional word between the flight and the gate (« QUOTIDIEN », « 12 ESCALES »)
//   onClose     close handler; the button is labelled closeLabel (translated, required)
//   flightLabel / gateLabel  words around the codes (default « VOL » / « PORTE »)
//   right       optional node on the right (timer, menu...)
//   style       container style
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import GameEmblem, { flightCode } from '@/components/GameEmblem'
import { colors } from '@/theme'
import { Kicker } from './Kicker'
import { ScreenTitle } from './ScreenTitle'

type Props = {
  game: string
  title: string
  gate: string
  tag?: string
  onClose: () => void
  closeLabel: string
  flightLabel?: string
  gateLabel?: string
  right?: ReactNode
  style?: StyleProp<ViewStyle>
}

export function GameHeader({ game, title, gate, tag, onClose, closeLabel, flightLabel = 'VOL', gateLabel = 'PORTE', right, style }: Props) {
  return (
    <View style={[styles.header, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.close}>
        <Svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round">
          <Path d="M4 4l10 10M14 4L4 14" />
        </Svg>
      </Pressable>
      <GameEmblem game={game} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Kicker numberOfLines={1}>{[`${flightLabel} ${flightCode(game)}`, tag, gate ? `${gateLabel} ${gate}` : ''].filter(Boolean).join(' · ')}</Kicker>
        <ScreenTitle size={18} numberOfLines={1}>
          {title}
        </ScreenTitle>
      </View>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
