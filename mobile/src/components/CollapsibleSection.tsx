// A section whose header folds its content away; the choice is kept per `id` (@shared/hooks/useSectionOpen).
// `summary` stays visible next to the title, folded or not. The content is not rendered while folded.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import useSectionOpen from '@shared/hooks/useSectionOpen'

import { Kicker, ScreenTitle } from '@/components/flight'
import { Touchable } from '@/components/ui'
import { colors, space } from '@/theme'

export function CollapsibleSection({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id: string
  title: string
  summary?: ReactNode
  defaultOpen?: boolean
  children?: ReactNode
}) {
  const [open, toggle] = useSectionOpen(id, defaultOpen) as [boolean, () => void]
  return (
    <View style={{ gap: space.md }}>
      <Touchable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={toggle} style={styles.header}>
        <MaterialCommunityIcons name={open ? 'chevron-down' : 'chevron-right'} size={24} color={colors.textMuted} />
        <ScreenTitle size={18} numberOfLines={1} style={styles.title}>
          {title}
        </ScreenTitle>
        {summary ? (
          <View style={styles.summary}>
            {typeof summary === 'string' ? (
              <Kicker numberOfLines={2} style={{ flexShrink: 1, textAlign: 'right' }}>
                {summary}
              </Kicker>
            ) : (
              summary
            )}
          </View>
        ) : null}
      </Touchable>
      {open && <Animated.View entering={FadeIn.duration(180)}>{children}</Animated.View>}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  title: { flexShrink: 0 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginLeft: 'auto', flexShrink: 1 },
})
