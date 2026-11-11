// Small design-system primitives for the app.
import * as Haptics from 'expo-haptics'
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { fonts, makeStyles, radius, space, useColors } from '@/theme'

type TextVariant = 'hero' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'number'

const textStyles: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, letterSpacing: -1 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  number: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] },
}

export function Text({
  variant = 'body',
  color,
  style,
  ...props
}: TextProps & { variant?: TextVariant; color?: string }) {
  const colors = useColors()
  const ink = variant === 'caption' || variant === 'label' ? colors.textMuted : colors.text
  return <RNText {...props} style={[{ color: ink }, textStyles[variant], color ? { color } : null, style]} />
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Pressable with a spring "press" scale and haptic tick.
export function Touchable({
  children,
  style,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children?: ReactNode }) {
  const pressed = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressed.get() }] }))
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        pressed.set(withSpring(0.96, { damping: 20, stiffness: 400 }))
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        pressed.set(withSpring(1, { damping: 15, stiffness: 300 }))
        onPressOut?.(event)
      }}
      onPress={(event) => {
        if (haptic) Haptics.selectionAsync()
        onPress?.(event)
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  color,
}: {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  icon?: ReactNode
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  color?: string
}) {
  const colors = useColors()
  const buttonStyles = useButtonStyles()
  const background =
    variant === 'primary' ? (color ?? colors.accent) : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surfaceHigh : 'transparent'
  const foreground =
    variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.onDanger : colors.text
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        buttonStyles.base,
        { backgroundColor: background, opacity: disabled ? 0.4 : 1 },
        variant === 'secondary' && buttonStyles.secondary,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon}
          <Text variant="bodyStrong" color={foreground}>
            {label}
          </Text>
        </>
      )}
    </Touchable>
  )
}

const useButtonStyles = makeStyles((colors) => ({
  base: {
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  secondary: { borderWidth: 1, borderColor: colors.border },
}))

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const cardStyles = useCardStyles()
  return <View style={[cardStyles.card, style]}>{children}</View>
}

const useCardStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
}))

// Segmented control (e.g. Standard / Ascension)
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const colors = useColors()
  const segmentStyles = useSegmentStyles()
  // Segments share the width; when their labels don't fit (narrow phone, long translation, large font) the row scrolls.
  return (
    <View style={segmentStyles.track}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false} contentContainerStyle={segmentStyles.row}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <Touchable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[segmentStyles.item, active && segmentStyles.itemActive]}>
              <Text variant="bodyStrong" numberOfLines={1} color={active ? colors.text : colors.textMuted} style={{ fontSize: 14 }}>
                {option.label}
              </Text>
            </Touchable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const useSegmentStyles = makeStyles((colors) => ({
  track: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexGrow: 1 },
  item: { flexGrow: 1, paddingVertical: 9, paddingHorizontal: 10, alignItems: 'center', borderRadius: radius.sm },
  itemActive: { backgroundColor: colors.surfaceHigh },
}))

export function Pill({ label, color, background, icon }: { label: string; color?: string; background?: string; icon?: ReactNode }) {
  const colors = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: background ?? colors.surfaceHigh, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      {icon}
      <Text variant="caption" color={color ?? colors.textMuted} style={{ fontFamily: fonts.bodyBold, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  )
}
