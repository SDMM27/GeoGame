// A discreet flag next to a leaderboard name: opens a small sheet (reason, optional note) and files a report
// for the entry (collection reports, see the website's utils/reports.js and firestore.rules).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'

import { REPORT_NOTE_MAX, REPORT_REASONS, reportEntry } from '@shared/utils/reports'

import { useAccount } from '@/account/auth'
import { colors, fonts, radius, space } from '@/theme'
import { Button, Text, Touchable } from '../ui'

export type ReportTarget = { collection: string; id: string; name: string }

type Status = 'idle' | 'sending' | 'sent' | 'already' | 'error'

export function ReportFlag({ target }: { target: ReportTarget }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>(REPORT_REASONS[0])
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const done = status === 'sent' || status === 'already'

  const close = () => {
    setOpen(false)
    setStatus((current) => (current === 'error' ? 'idle' : current))
  }

  const send = async () => {
    setStatus('sending')
    try {
      const result = await reportEntry({ ...target, reason, note, uid: account?.uid })
      setStatus(result.status as Status)
    } catch (error) {
      console.error('[report]', error)
      setStatus('error')
    }
  }

  return (
    <>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('report.button', { name: target.name })}
        haptic={false}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={styles.flag}>
        <MaterialCommunityIcons name={done ? 'flag' : 'flag-outline'} size={16} color={done ? colors.warning : colors.textFaint} />
      </Touchable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('report.cancel')}>
            <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
              <Text variant="heading">{t('report.title', { name: target.name })}</Text>
              {done ? (
                <>
                  <Text variant="body" color={colors.accent}>
                    {t(status === 'sent' ? 'report.sent' : 'report.already')}
                  </Text>
                  <Button label={t('report.close')} variant="secondary" onPress={close} />
                </>
              ) : (
                <>
                  <Text variant="label">{t('report.reason')}</Text>
                  {REPORT_REASONS.map((value: string) => {
                    const selected = value === reason
                    return (
                      <Touchable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setReason(value)}
                        style={[styles.option, selected && styles.optionSelected]}>
                        <Text variant="bodyStrong" color={selected ? colors.accent : colors.text}>
                          {t(`report.reasons.${value}`)}
                        </Text>
                        {selected && <MaterialCommunityIcons name="check" size={20} color={colors.accent} />}
                      </Touchable>
                    )
                  })}
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('report.note')}
                    placeholderTextColor={colors.textFaint}
                    maxLength={REPORT_NOTE_MAX}
                    style={styles.input}
                  />
                  {status === 'error' && (
                    <Text variant="caption" color={colors.danger}>
                      {t('report.error')}
                    </Text>
                  )}
                  <View style={styles.actions}>
                    <Button label={t('report.cancel')} variant="secondary" onPress={close} style={{ flex: 1 }} />
                    <Button label={t('report.submit')} onPress={send} loading={status === 'sending'} style={{ flex: 1 }} />
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  flag: { padding: 2 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    width: '100%',
    maxWidth: 420,
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  optionSelected: { borderColor: colors.accent },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
})
