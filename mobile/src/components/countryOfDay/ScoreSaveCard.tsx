// Leaderboard save of a finished Country of the Day (ResultsSheet has no such kind): signed in, the score is saved on
// its own; otherwise under the name the player types. One score per player and day, even at 0.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'

import { useScoreSave } from '@shared/hooks/useScoreSave'
import { formatTime } from '@shared/utils/formatTime'
import { saveCountryOfDayScore } from '@shared/utils/saveScore'

import { useAccount } from '@/account/auth'
import { Button, Text } from '@/components/ui'
import { colors, fonts, radius, space } from '@/theme'

const PSEUDO_KEY = 'geogame_pseudo'

type Props = { dailyKey: string; mode: string; steps: number[]; score: number; elapsedTime: number; onSaved?: () => void }

export function ScoreSaveCard({ dailyKey, mode, steps, score, elapsedTime, onSaved }: Props) {
  const { t } = useTranslation()
  const [typedPseudo, setTypedPseudo] = useState(() => globalThis.localStorage?.getItem(PSEUDO_KEY) ?? '')
  // Same key as the other daily games: one save per day
  const savedKey = `daily-saved:COUNTRY_OF_DAY:${dailyKey}`
  const saver = useScoreSave(
    useAccount(),
    async (player: { name: string; uid?: string }) => {
      const result = await saveCountryOfDayScore({ ...player, dailyKey, mode, steps, score, elapsedTime })
      if (result.status === 'saved' || result.status === 'updated') {
        globalThis.localStorage?.setItem(savedKey, '1')
        onSaved?.()
      }
      return result
    },
    { alreadySaved: Boolean(globalThis.localStorage?.getItem(savedKey)) }
  )
  if (saver.loading) return null

  const onSave = () => {
    const name = typedPseudo.trim()
    if (!name) return
    globalThis.localStorage?.setItem(PSEUDO_KEY, name)
    saver.submit(name)
  }
  const record = saver.existing
    ? t('score_save.record_kept', { record: `${saver.existing.score} ${t('units.pts')} · ${formatTime(saver.existing.elapsedTime ?? 0)}` })
    : null

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('buttons.save_score')}</Text>
      {saver.status === 'saving' && <Text variant="caption">{t('score_save.saving')}</Text>}
      {saver.done && (
        <Text variant="caption" color={colors.accent}>
          {saver.name ? t('score_save.saved_as', { name: saver.name }) : t('form.score_saved')}
        </Text>
      )}
      {saver.status === 'blocked' && <Text variant="caption">{record}</Text>}
      {saver.status === 'error' && (
        <Text variant="caption" color={colors.danger}>
          {t('mobile.game.save_error')}
        </Text>
      )}
      {saver.signedIn ? (
        saver.status === 'error' && <Button label={t('score_save.retry')} variant="secondary" onPress={saver.retry} />
      ) : (
        <>
          <View style={styles.row}>
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
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: space.sm },
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
