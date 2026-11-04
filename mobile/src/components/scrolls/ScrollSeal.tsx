// The wax seal of a scroll: a disc with a lighter ring.
import { StyleSheet, View } from 'react-native'

import { waxSeal } from '@/components/scrolls/ScrollImage'

export function ScrollSeal({ size = 44 }: { size?: number }) {
  return (
    <View
      accessible={false}
      style={[styles.seal, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={{ width: size * 0.66, height: size * 0.66, borderRadius: size / 3, borderWidth: Math.max(2, size / 16), borderColor: 'rgba(255,255,255,0.18)' }} />
    </View>
  )
}

const styles = StyleSheet.create({
  seal: {
    backgroundColor: waxSeal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7D2518',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
})
