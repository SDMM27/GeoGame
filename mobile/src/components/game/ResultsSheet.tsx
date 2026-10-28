// End-of-game screen: score, stats, save to leaderboard, share, replay.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { buildChallengeUrl } from '@shared/utils/challenge'
import { CHALLENGE_ROUNDS } from '@shared/utils/dailyChallenge'
import { formatTime } from '@shared/utils/formatTime'
import { useScoreSave } from '@shared/hooks/useScoreSave'
import { saveAscensionScore, saveChallengeScore, saveDailyScore, saveRankingScore, saveScore, saveSurvivalScore } from '@shared/utils/saveScore'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { generateShareText } from '@shared/utils/shareScore'

import { announce } from '@/a11y'
import { useAccount } from '@/account/auth'
import { useRecordGame, type GameRecord } from '@/account/history'
import { SITE_ORIGIN } from '@/links'
import { colors, fonts, radius, space } from '@/theme'
import { Button, Text } from '../ui'
import { NudgeFriends } from './NudgeFriends'

const PSEUDO_KEY = 'geogame_pseudo'

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
  // Daily Challenge: `score` is the right answers, `results` the 12 rounds
  | { kind: 'challenge'; dailyKey: string; elapsedTime: number; results: boolean[] }
  | { kind: 'ranking'; dailyKey: string; totalError: number; attemptsUsed: number; playerOrder: string[] }
  // Survival: `score` is the rounds cleared
  | { kind: 'survival'; modes: string; lives: number; timer: number; ramp: string; elapsedTime: number }

export type ShareConfig = {
  gameType: string
  difficulty?: string | null
  details?: string
  scoreLabel?: string
  // The score as the text reads it ("9/12"), and lines under the details (the Daily Challenge's rounds)
  scoreText?: string
  grid?: string
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

// Same key as the website's DailyForm: one save per daily challenge.
// Ranking uses the website's RankingGamePage key.
const dailySavedKey = (save: SaveConfig | null | undefined) =>
  save?.kind === 'daily'
    ? `daily-saved:${save.gameType}:${save.dailyKey}`
    : save?.kind === 'challenge'
      ? `daily-saved:${GAME_TYPES.DAILY_CHALLENGE}:${save.dailyKey}`
      : save?.kind === 'ranking'
        ? `ranking-saved:${save.dailyKey}`
        : null

export function ResultsSheet({ title, score, scoreText, scoreLabel, accent = colors.accent, stats, save, share, record, onReplay, onHome, homeLabel, onSaved, children }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [typedPseudo, setTypedPseudo] = useState(() => globalThis.localStorage?.getItem(PSEUDO_KEY) ?? '')
  useRecordGame(record)

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    announce(title ?? t('mobile.game.finished'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Signed in: saved on its own under the account. Visitor: saved under the name they type.
  const savedKey = dailySavedKey(save)
  const saver = useScoreSave(
    useAccount(),
    async (player: { name: string; uid?: string }) => {
      if (!save) return { status: 'saved' }
      const result =
        save.kind === 'daily'
          ? await saveDailyScore({ ...player, ...save })
          : save.kind === 'challenge'
            ? await saveChallengeScore({ ...player, ...save, score })
          : save.kind === 'ranking'
            ? await saveRankingScore({ ...player, score, ...save })
            : save.kind === 'survival'
              ? await saveSurvivalScore({ ...player, score, ...save })
            : save.kind === 'ascension'
              ? await saveAscensionScore({ ...player, score, ...save })
              : await saveScore({ ...player, score, ...save })
      if (result.status === 'saved' || result.status === 'updated') {
        if (savedKey) globalThis.localStorage?.setItem(savedKey, '1')
        onSaved?.()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      return result
    },
    { enabled: Boolean(save), alreadySaved: Boolean(savedKey && globalThis.localStorage?.getItem(savedKey)) }
  )
  const pseudo = saver.username ?? typedPseudo

  const onSave = () => {
    const name = typedPseudo.trim()
    if (!name || !save) return
    globalThis.localStorage?.setItem(PSEUDO_KEY, name)
    saver.submit(name)
  }

  // The player's better entry, when the save is blocked.
  const existingText = (existing: { score?: number; attempts?: number; elapsedTime?: number; timeMs?: number; totalError?: number }) => {
    if (save?.kind === 'ranking') {
      return `${existing.score} ${t('units.pts')} · ${existing.totalError} ${t('units.position', { count: existing.totalError })}`
    }
    if (save?.kind === 'challenge') {
      return `${existing.score}/${CHALLENGE_ROUNDS} · ${existing.elapsedTime != null ? formatTime(existing.elapsedTime) : '—'}`
    }
    const value =
      save?.kind === 'daily'
        ? `${existing.attempts} ${existing.attempts === 1 ? t('units.attempt_one') : t('units.attempt_other')}`
        : save?.kind === 'survival'
          ? t('survival.rounds_count', { count: existing.score ?? 0 })
          : `${existing.score} ${t('units.pts')}`
    const secondary =
      save?.kind === 'daily' && save.formatSecondary
        ? save.formatSecondary(existing.elapsedTime)
        : formatTime(existing.elapsedTime ?? existing.timeMs ?? 0)
    return `${value} · ${secondary}`
  }
  const isDaily = save?.kind === 'daily' || save?.kind === 'challenge' || save?.kind === 'ranking'

  const onShare = async () => {
    if (!share) return
    const { challenge, ...rest } = share
    const challengeUrl = challenge
      ? buildChallengeUrl({ ...challenge, pseudo, score, origin: SITE_ORIGIN })
      : undefined
    const message = generateShareText({ score, pseudo, ...rest, challengeUrl, siteUrl: SITE_ORIGIN })
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

          {save && !saver.loading && (
            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.saveCard}>
              <Text variant="bodyStrong">{t('buttons.save_score')}</Text>
              {saver.signedIn ? (
                <>
                  {saver.status === 'saving' && <Text variant="caption">{t('score_save.saving')}</Text>}
                  {saver.status === 'saved' && (
                    <Text variant="caption" color={colors.accent}>
                      {saver.name ? t('score_save.saved_as', { name: saver.name }) : t('form.score_saved')}
                    </Text>
                  )}
                  {saver.status === 'updated' && (
                    <Text variant="caption" color={colors.accent}>
                      {t('score_save.updated_as', { name: saver.name })}
                    </Text>
                  )}
                  {saver.status === 'blocked' && (
                    <Text variant="caption">{t('score_save.record_kept', { record: existingText(saver.existing) })}</Text>
                  )}
                  {saver.status === 'error' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <Text variant="caption" color={colors.danger} style={{ flex: 1 }}>
                        {t('mobile.game.save_error')}
                      </Text>
                      <Button label={t('score_save.retry')} variant="secondary" onPress={saver.retry} />
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.saveRow}>
                    <TextInput
                      value={typedPseudo}
                      onChangeText={(value) => {
                        setTypedPseudo(value)
                        saver.clear()
                      }}
                      placeholder={t('labels.your_username')}
                      placeholderTextColor={colors.textMuted}
                      maxLength={20}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!saver.done}
                      returnKeyType="done"
                      onSubmitEditing={onSave}
                      style={styles.input}
                    />
                    <Button
                      label={saver.done ? '✓' : t('mobile.game.save')}
                      onPress={onSave}
                      loading={saver.status === 'saving'}
                      disabled={!typedPseudo.trim() || saver.done}
                      style={{ paddingHorizontal: space.lg }}
                    />
                  </View>
                  {saver.done && (
                    <Text variant="caption" color={colors.accent}>
                      {t('form.score_saved')}
                    </Text>
                  )}
                  {saver.status === 'blocked' && (
                    <Text variant="caption" color={colors.warning}>
                      {isDaily
                        ? `${t('form.better_daily_score')} ${existingText(saver.existing)}. ${t('form.use_different_name_daily')}`
                        : `${t('form.better_score_exists')} (${existingText(saver.existing)}). ${t('form.use_different_name')}`}
                    </Text>
                  )}
                  {saver.status === 'forbidden' && (
                    <Text variant="caption" color={colors.warning}>
                      {t('account.errors.username_forbidden')}
                    </Text>
                  )}
                  {saver.status === 'taken' && (
                    <Text variant="caption" color={colors.warning}>
                      {t('score_save.taken')}
                    </Text>
                  )}
                  {saver.status === 'error' && (
                    <Text variant="caption" color={colors.danger}>
                      {t('mobile.game.save_error')}
                    </Text>
                  )}
                  {!saver.done && (
                    <Text variant="caption" onPress={() => router.push('/profile')}>
                      {t('score_save.sign_in_hint')}{' '}
                      <Text variant="caption" color={colors.accent}>
                        {t('score_save.sign_in')}
                      </Text>
                    </Text>
                  )}
                </>
              )}
            </Animated.View>
          )}

          {/* Daily: nudge about the daily challenge; otherwise about the game just recorded in the history */}
          {share && (share.challenge || record) && (
            <Animated.View entering={FadeInDown.delay(280).springify()}>
              <NudgeFriends gameType={share.gameType} recent={!share.challenge} />
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
