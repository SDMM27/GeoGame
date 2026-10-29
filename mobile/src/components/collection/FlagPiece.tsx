// One piece of a flag cut by pieceGrid (see @shared/utils/flagCollection): the flag image shifted so only piece `index`
// of a cols x rows grid shows. Fills its parent, which positions and sizes it.
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { getFlag } from '@/flags'

export function FlagPiece({
  iso,
  index,
  cols,
  rows,
  style,
}: {
  iso: string
  index: number
  cols: number
  rows: number
  style?: StyleProp<ViewStyle>
}) {
  const source = getFlag(iso)
  if (source == null) return null
  return (
    <View pointerEvents="none" style={[styles.piece, style]}>
      <Image
        accessible={false}
        alt=""
        source={source}
        resizeMode="stretch"
        style={[
          styles.image,
          {
            left: `${-(index % cols) * 100}%`,
            top: `${-Math.floor(index / cols) * 100}%`,
            width: `${cols * 100}%`,
            height: `${rows * 100}%`,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  piece: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  image: { position: 'absolute' },
})
