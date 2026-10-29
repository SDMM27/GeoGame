// The answers offered by a step: buttons (country or capital names) or a grid of flags. A wrong answer is greyed out,
// the right one is highlighted once the step is over.
import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

import { Text, Touchable } from '@/components/ui'
import { getFlag } from '@/flags'
import { colors, radius, space } from '@/theme'
import type { Feature } from './labels'

type ChoiceProps = {
  choices: Feature[]
  // ADMIN of the wrong answers so far and of the country to find
  wrong: string[]
  target: string
  resolved: boolean
  onPick: (admin: string) => void
}

type State = 'idle' | 'wrong' | 'right' | 'dim'

function stateOf(admin: string, { wrong, target, resolved }: Pick<ChoiceProps, 'wrong' | 'target' | 'resolved'>): State {
  if (resolved && admin === target) return 'right'
  if (wrong.includes(admin)) return 'wrong'
  return resolved ? 'dim' : 'idle'
}

const stateStyle = (state: State) => [
  state === 'right' && { borderColor: colors.accent, borderWidth: 2 },
  state === 'wrong' && { borderColor: colors.danger, opacity: 0.4 },
  state === 'dim' && { opacity: 0.45 },
]

export function ChoiceList({ label, ...props }: ChoiceProps & { label: (feature: Feature) => string }) {
  return (
    <View style={{ gap: space.sm }}>
      {props.choices.map((choice) => {
        const admin = choice.properties.ADMIN
        const state = stateOf(admin, props)
        return (
          <Touchable
            key={admin}
            accessibilityRole="button"
            accessibilityState={{ disabled: state !== 'idle', selected: state === 'right' }}
            disabled={state !== 'idle'}
            onPress={() => props.onPick(admin)}
            style={[styles.choice, stateStyle(state)]}>
            <Text variant="bodyStrong" color={state === 'right' ? colors.accent : state === 'wrong' ? colors.textMuted : colors.text}>
              {label(choice)}
            </Text>
          </Touchable>
        )
      })}
    </View>
  )
}

export function FlagGrid(props: ChoiceProps) {
  return (
    <View style={styles.grid}>
      {props.choices.map((choice, index) => {
        const admin = choice.properties.ADMIN
        const state = stateOf(admin, props)
        const flag = getFlag(choice.properties.ISO_A2)
        return (
          <Touchable
            key={admin}
            accessibilityRole="button"
            // The flag is the question: the cell is only numbered
            accessibilityLabel={String(index + 1)}
            accessibilityState={{ disabled: state !== 'idle', selected: state === 'right' }}
            disabled={state !== 'idle'}
            onPress={() => props.onPick(admin)}
            style={[styles.flagCell, stateStyle(state)]}>
            {flag && <Image source={flag} contentFit="cover" style={styles.flag} accessible={false} alt="" />}
          </Touchable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  choice: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  flagCell: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flag: { width: '100%', aspectRatio: 3 / 2, borderRadius: radius.sm },
})
