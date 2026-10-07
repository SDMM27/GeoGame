// End-of-game screen: score, stats, save to leaderboard, share, replay.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { buildChallengeUrl } from '@shared/utils/challenge'
import { formatTime } from '@shared/utils/formatTime'
import { saveAscensionScore, saveDailyScore, saveScore } from '@shared/utils/saveScore'
import { generateShareText } from '@shared/utils/shareScore'

import { useRecordGame, type GameRecord } from '@/account/history'
import { saveRankingScore } from '@/rankingScores'
import { colors, fonts, radius, space } from '@/theme'
import { Button, Text } from '../ui'

const PSEUDO_KEY = 'geogame_pseudo'
// Challenge links open the daily on the website.
const SITE_ORIGIN = 'https://geogame.vercel.app'

export type SaveConfig =
  | { kind: 'standard'; gameType: string; difficulty: string; elapsedTime: number; continent?: string | null }
  | { kind: 'ascension'; gameType: string; presetName: string; timer: number; stats: unknown; phaseStats: unknown }
  | {
      kind: 'daily'
      gameType: string
      dailyKey: string
      attempts: number
      elapsedTime: number | null
      guesses: string[]
      hints?: number
      // Shown for an existing better score; defaults to its time
      formatSecondary?: (elapsedTime: number | null | undefined) => string
    }
  | { kind: 'ranking'; dailyKey: string; totalError: number; attemptsUsed: number; playerOrder: string[] }

export type ShareConfig = {
  gameType: string
  difficulty?: string | null
  details?: string
  scoreLabel?: string
  // Daily games: share a link to beat this score (website route, e.g. '/border-guess')
  challenge?: { route: string; dailyKey: string; solved: boolean } | null
}

type Props = {
  title?: string
  score: number
  // Displayed instead of the rounded score (e.g. Voyage Voyage's half points)
  scoreText?: string
  scoreLabel?: string
  accent?: string
  stats: { label: string; value: string; color?: string }[]
  save?: SaveConfig | null
  share?: ShareConfig | null
  // Saved to the signed-in player's history when the sheet appears
  record?: GameRecord | null
  onReplay?: () => void
  onHome: () => void
  homeLabel?: string
  onSaved?: () => void
  children?: React.ReactNode
}

type SaveState = 'idle' | 'saving' | 'saved' | 'blocked' | 'error'

// Same key as the website's DailyForm: one save per daily challenge.
// Ranking uses the website's RankingGamePage key.
const dailySavedKey = (save: SaveConfig | null | undefined) =>
  save?.kind === 'daily'
    ? `daily-saved:${save.gameType}:${save.dailyKey}`
    : save?.kind === 'ranking'
      ? `ranking-saved:${save.dailyKey}`
      : null

export function ResultsSheet({ title, score, scoreText, scoreLabel, accent = colors.accent, stats, save, share, record, onReplay, onHome, homeLabel, onSaved, children }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [pseudo, setPseudo] = useState(() => globalThis.localStorage?.getItem(PSEUDO_KEY) ?? '')
  const [saveState, setSaveState] = useState<SaveState>(() => {
    const key = dailySavedKey(save)
    return key && globalThis.localStorage?.getItem(key) ? 'saved' : 'idle'
  })
  const [blockedBy, setBlockedBy] = useState<string | null>(null)
  useRecordGame(record)

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
        save.kind === 'daily'
          ? await saveDailyScore({ name, ...save })
          : save.kind === 'ranking'
            ? await saveRankingScore({
                name,
                score,
                dailyKey: save.dailyKey,
                totalError: save.totalError,
                attemptsUsed: save.attemptsUsed,
                playerOrder: save.playerOrder,
              })
            : save.kind === 'ascension'
              ? await saveAscensionScore({ name, score, ...save })
              : await saveScore({ name, score, ...save })
      if (result.status === 'blocked') {
        const existing = result.existing as { score?: number; attempts?: number; elapsedTime?: number; timeMs?: number; totalError?: number }
        if (save.kind === 'ranking') {
          setBlockedBy(`${existing.score} ${t('units.pts')} · ${existing.totalError} ${t('units.position', { count: existing.totalError })}`)
        } else {
          const value =
            save.kind === 'daily'
              ? `${existing.attempts} ${existing.attempts === 1 ? t('units.attempt_one') : t('units.attempt_other')}`
              : `${existing.score} ${t('units.pts')}`
          const secondary =
            save.kind === 'daily' && save.formatSecondary
              ? save.formatSecondary(existing.elapsedTime)
              : formatTime(existing.elapsedTime ?? existing.timeMs ?? 0)
          setBlockedBy(`${value} · ${secondary}`)
        }
        setSaveState('blocked')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        return
      }
      const savedKey = dailySavedKey(save)
      if (savedKey) globalThis.localStorage?.setItem(savedKey, '1')
      setSaveState('saved')
      onSaved?.()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error(error)
      setSaveState('error')
    }
  }

  const onShare = async () => {
    if (!share) return
    const { challenge, ...rest } = share
    const challengeUrl = challenge
      ? buildChallengeUrl({ ...challenge, pseudo, score, origin: SITE_ORIGIN })
      : undefined
    const message = generateShareText({ score, pseudo, ...rest, challengeUrl })
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
              {scoreText ?? Math.round(score).toLocaleString()}
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
                  {save.kind === 'daily' || save.kind === 'ranking'
                    ? `${t('form.better_daily_score')} ${blockedBy}. ${t('form.use_different_name_daily')}`
                    : `${t('form.better_score_exists')} (${blockedBy}). ${t('form.use_different_name')}`}
                </Text>
              )}
              {saveState === 'error' && (
                <Text variant="caption" color={colors.danger}>
                  {t('mobile.game.save_error')}
                </Text>
              )}
            </Animated.View>
          )}

          {children}

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
            <Button label={homeLabel ?? t('mobile.game.home')} variant="ghost" onPress={onHome} />
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
    minWidth: 0,
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
