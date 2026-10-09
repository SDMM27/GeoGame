// A daily challenge the signed-in player already finished on another device (useDailyPlayedElsewhere):
// their result and the day's leaderboard (children) in place of a new game. Without `game`, the lookup
// is still running.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { formatTime } from '@shared/utils/formatTime'
import { describeResult } from '@shared/utils/profileFormat'

import { navigate } from '@/shims/react-router-dom'
import { colors, radius, space } from '@/theme'
import { Button, Text } from '../ui'
import { GameTopBar } from './GameTopBar'

type DailyGame = { solved?: boolean; elapsedTime?: number | null; [field: string]: unknown }

export function DailyPlayedElsewhere({ title, game, accent, children }: { title: string; game: DailyGame | null; accent: string; children?: ReactNode }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const result = game
    ? [describeResult(game, t), game.elapsedTime != null ? formatTime(game.elapsedTime) : null].filter(Boolean).join(' · ')
    : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 42 + space.md, paddingBottom: insets.bottom + space.xl }]}>
        <Text variant="label" color={accent}>
          {t('mobile.home.daily')} · {title}
        </Text>
        {!game ? (
          <View style={styles.checking}>
            <ActivityIndicator color={accent} />
            <Text variant="caption">{t('daily_elsewhere.checking')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <MaterialCommunityIcons name="cellphone-check" size={32} color={accent} />
              <Text variant="heading" style={{ textAlign: 'center' }}>
                {t('daily_elsewhere.title')}
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {t('daily_elsewhere.text')}
              </Text>
              <Text variant="body" style={{ textAlign: 'center' }}>
                {t('daily_elsewhere.your_result')}{' '}
                <Text variant="bodyStrong" color={game.solved === false ? colors.danger : accent}>
                  {result}
                </Text>
              </Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {t('daily_elsewhere.come_back')}
              </Text>
              <Button
                label={t('buttons.return_home')}
                color={accent}
                onPress={() => navigate('/')}
                icon={<MaterialCommunityIcons name="home" size={20} color={colors.onAccent} />}
                style={{ alignSelf: 'stretch', marginTop: space.sm }}
              />
            </View>
            {children}
          </>
        )}
      </ScrollView>
      <GameTopBar confirmQuit={false} />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.lg },
  checking: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  card: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
