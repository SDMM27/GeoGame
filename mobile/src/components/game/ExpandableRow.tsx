// Leaderboard row that opens on tap to show the player's game (countries tried, order played...),
// like the website's leaderboards. Without details it is a plain row.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, space } from '@/theme'
import { Text, Touchable } from '../ui'

export function ExpandableRow({ style, details, children }: { style: StyleProp<ViewStyle>; details?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  if (!details) return <View style={[style, styles.row]}>{children}</View>
  // No button role: on web that renders a <button>, and the row holds other buttons (report flag).
  return (
    <Touchable accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={style}>
      <View style={styles.row}>
        {children}
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textFaint} />
      </View>
      {open && <View style={styles.details}>{details}</View>}
    </Touchable>
  )
}

// Numbered list of answers; the last one is highlighted when it was the right one.
export function AnswerList({ title, answers, lastCorrect }: { title: string; answers: string[]; lastCorrect?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="label">{title}</Text>
      {answers.map((answer, index) => {
        const correct = lastCorrect && index === answers.length - 1
        return (
          <Text key={`${answer}-${index}`} variant={correct ? 'bodyStrong' : 'caption'} color={correct ? colors.accent : undefined}>
            {index + 1}. {answer}
          </Text>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  details: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.xs, paddingLeft: 28 + space.md },
})
