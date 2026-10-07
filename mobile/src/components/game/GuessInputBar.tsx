// Bottom bar of the "guess a country" daily games: suggestions, input, reveal and submit.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useEffectEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { clean } from '@/i18n'
import { colors, fonts, radius, space } from '@/theme'
import { Text, Touchable } from '../ui'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export function GuessInputBar({
  value,
  onChangeText,
  onSubmit,
  onReveal,
  suggestions,
  locked,
  placeholder,
  accent,
  revealLabel,
  revealIcon = 'flag-outline',
}: {
  value: string
  onChangeText: (value: string) => void
  // Called after render, so the hook's handleSubmit sees the current input
  onSubmit: () => void
  onReveal?: () => void
  suggestions: string[]
  locked: boolean
  placeholder: string
  accent: string
  revealLabel?: string
  revealIcon?: IconName
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  // The keyboard covers the home indicator: no bottom inset under the input while typing.
  const keyboardVisible = useKeyboardVisible()
  const inputRef = useRef<TextInput>(null)
  const trimmed = value.trim()
  const visibleSuggestions = locked || suggestions.includes(trimmed) ? [] : suggestions

  // A tapped suggestion fills the input, then is submitted once rendered.
  const pendingSubmitRef = useRef<string | null>(null)
  const submit = useEffectEvent(() => onSubmit())
  useEffect(() => {
    if (pendingSubmitRef.current === null || pendingSubmitRef.current !== value) return
    pendingSubmitRef.current = null
    submit()
  }, [value])

  return (
    <View style={[styles.bar, { paddingBottom: keyboardVisible ? space.md : Math.max(insets.bottom, space.md) }]}>
      {visibleSuggestions.length > 0 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}>
          {visibleSuggestions.map((name) => (
            <Touchable
              key={name}
              onPress={() => {
                pendingSubmitRef.current = name
                onChangeText(name)
                inputRef.current?.focus()
              }}
              style={styles.suggestion}>
              <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                {name}
              </Text>
            </Touchable>
          ))}
        </ScrollView>
      )}
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          submitBehavior="submit"
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          returnKeyType="send"
          editable={!locked}
          style={[styles.input, locked && { opacity: 0.5 }]}
        />
        {onReveal && (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={revealLabel}
            onPress={onReveal}
            disabled={locked}
            style={[styles.iconButton, locked && { opacity: 0.4 }]}>
            <MaterialCommunityIcons name={revealIcon} size={22} color={colors.text} />
          </Touchable>
        )}
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={clean(t('buttons.validate'))}
          onPress={onSubmit}
          disabled={locked || !trimmed}
          style={[styles.iconButton, { backgroundColor: accent, borderColor: accent }, (locked || !trimmed) && { opacity: 0.4 }]}>
          <MaterialCommunityIcons name="arrow-right" size={22} color={colors.bg} />
        </Touchable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestions: { gap: space.sm, paddingHorizontal: space.lg },
  suggestion: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
