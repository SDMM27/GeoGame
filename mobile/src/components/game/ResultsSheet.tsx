// End-of-game screen: score, stats, save to leaderboard, share, replay.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { formatTime } from '@shared/utils/formatTime'
import { saveAscensionScore, saveScore } from '@shared/utils/saveScore'
import { generateShareText } from '@shared/utils/shareScore'

import { colors, fonts, radius, space } from '@/theme'
import { Button, Text } from '../ui'

const PSEUDO_KEY = 'geogame_pseudo'

export type SaveConfig =
  | { kind: 'standard'; gameType: string; difficulty: string; elapsedTime: number; continent?: string | null }
  | { kind: 'ascension'; gameType: string; presetName: string; timer: number; stats: unknown; phaseStats: unknown }

export type ShareConfig = { gameType: string; difficulty?: string | null; details?: string; scoreLabel?: string }

type Props = {
  title?: string
  score: number
  scoreLabel?: string
  accent?: string
  stats: { label: string; value: string; color?: string }[]
  save?: SaveConfig | null
  share?: ShareConfig | null
  onReplay?: () => void
  onHome: () => void
  children?: React.ReactNode
}

type SaveState = 'idle' | 'saving' | 'saved' | 'blocked' | 'error'

export function ResultsSheet({ title, score, scoreLabel, accent = colors.accent, stats, save, share, onReplay, onHome, children }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [pseudo, setPseudo] = useState(() => globalThis.localStorage?.getItem(PSEUDO_KEY) ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [blockedBy, setBlockedBy] = useState<string | null>(null)

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [])

  const onSave = async () => {
    const name = pseudo.trim()
    if (!name || !save) return
    globalThis.localStorage?.setItem(PSEUDO_KEY, name)
    setSaveState('saving')
    try {
      const result =
        save.kind === 'ascension'
          ? await saveAscensionScore({ name, score, ...save })
          : await saveScore({ name, score, ...save })
      if (result.status === 'blocked') {
        const existing = result.existing as { score: number; elapsedTime?: number; timeMs?: number }
        setBlockedBy(`${existing.score} ${t('units.pts')} · ${formatTime(existing.elapsedTime ?? existing.timeMs ?? 0)}`)
        setSaveState('blocked')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        return
      }
      setSaveState('saved')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error(error)
      setSaveState('error')
    }
  }

  const onShare = async () => {
    if (!share) return
    const message = generateShareText({ score, pseudo, ...share })
    await Share.share({ message })
  }

  return (
    <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,18,0.92)' }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center' }}>
            <Text variant="label">{title ?? t('mobile.game.finished')}</Text>
            <Text variant="hero" color={accent} style={{ fontSize: 64, lineHeight: 72, marginTop: space.sm }}>
              {Math.round(score).toLocaleString()}
            </Text>
            <Text variant="caption">{scoreLabel ?? t('units.pts')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.stats}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text variant="number" color={stat.color}>
                  {stat.value}
                </Text>
                <Text variant="caption" style={{ textAlign: 'center' }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </Animated.View>

          {children}

          {save && (
            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.saveCard}>
              <Text variant="bodyStrong">{t('buttons.save_score')}</Text>
              <View style={styles.saveRow}>
                <TextInput
                  value={pseudo}
                  onChangeText={(value) => {
                    setPseudo(value)
                    if (saveState !== 'saving') setSaveState('idle')
                  }}
                  placeholder={t('labels.your_username')}
                  placeholderTextColor={colors.textFaint}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={saveState !== 'saved'}
                  returnKeyType="done"
                  onSubmitEditing={onSave}
                  style={styles.input}
                />
                <Button
                  label={saveState === 'saved' ? '✓' : t('mobile.game.save')}
                  onPress={onSave}
                  loading={saveState === 'saving'}
                  disabled={!pseudo.trim() || saveState === 'saved'}
                  style={{ paddingHorizontal: space.lg }}
                />
              </View>
              {saveState === 'saved' && (
                <Text variant="caption" color={colors.accent}>
                  {t('form.score_saved')}
                </Text>
              )}
              {saveState === 'blocked' && (
                <Text variant="caption" color={colors.warning}>
                  {t('form.better_score_exists')} ({blockedBy}). {t('form.use_different_name')}
                </Text>
              )}
              {saveState === 'error' && (
                <Text variant="caption" color={colors.danger}>
                  {t('mobile.game.save_error')}
                </Text>
              )}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(320).springify()} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              {share && (
                <Button
                  label={t('mobile.game.share')}
                  variant="secondary"
                  onPress={onShare}
                  icon={<MaterialCommunityIcons name="export-variant" size={18} color={colors.text} />}
                  style={{ flex: 1 }}
                />
              )}
              {onReplay && (
                <Button
                  label={t('mobile.game.replay')}
                  onPress={onReplay}
                  color={accent}
                  icon={<MaterialCommunityIcons name="replay" size={18} color={colors.onAccent} />}
                  style={{ flex: 1 }}
                />
              )}
            </View>
            <Button label={t('mobile.game.home')} variant="ghost" onPress={onHome} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.xl },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveCard: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  saveRow: { flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
})
