// Result of the step on screen: the points when found, the answer when missed, and the way on to the next step.
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'

export function StepFeedback({
  found,
  points,
  answer,
  nextLabel,
  onNext,
}: {
  found: boolean
  points: number
  answer: string
  nextLabel: string
  onNext: () => void
}) {
  const { t } = useTranslation()
  const color = found ? colors.accent : colors.warning
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.box, { borderColor: color }]}>
      <Text variant="bodyStrong" color={color} style={{ flex: 1 }}>
        {found ? `${t('country_of_day.right')} ${answer} · ${t('country_of_day.points', { count: points })}` : t('country_of_day.missed', { answer })}
      </Text>
      <Button label={nextLabel} variant="secondary" onPress={onNext} style={{ minHeight: 40, paddingHorizontal: space.lg }} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
})
