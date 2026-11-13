// A small corner pill while the test mode is on (testMode.ts), with a button to leave it. Never in production.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { setTestMode, useTestMode } from '@/testMode'

// Above the tab bar
const TAB_BAR = 64

export function TestModeBadge() {
  const on = useTestMode()
  const insets = useSafeAreaInsets()
  if (!on) return null
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { left: 12 + insets.left, bottom: TAB_BAR + insets.bottom }]}>
      <View style={styles.pill} accessibilityRole="alert">
        <Text style={styles.text}>Mode test : tout est débloqué (aperçu local)</Text>
        <Pressable accessibilityRole="button" onPress={() => setTestMode(false)} hitSlop={8}>
          <Text style={[styles.text, styles.quit]}>Quitter</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 12, zIndex: 1000, alignItems: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FF2BD6' },
  text: { flexShrink: 1, color: '#fff', fontFamily: 'JetBrainsMono_700Bold', fontSize: 11 },
  quit: { textDecorationLine: 'underline' },
})
