// Own profile: a button opening a sheet where the player picks the frame around their avatar and the color of their
// name (catalog in @shared/utils/decorations). A tap saves at once; the choice shows right away and is reverted if the
// write fails.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useDecoration } from '@shared/hooks/useDecoration'
import { useXp } from '@shared/hooks/useXp'
import { DEFAULT_DECORATION, decorationStyle, FRAMES, isUnlocked, NAME_COLORS, saveDecoration } from '@shared/utils/decorations'

import { Button, Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'
import { Avatar, type Decoration } from './ProfileSections'

type Item = { id: string; unlock?: { kind: string; level?: number } }

export function DecorationPicker({ uid, username }: { uid: string; username: string }) {
  const { t } = useTranslation()
  const level: number = useXp(uid)?.level ?? 1
  const saved: Decoration = useDecoration(uid) ?? DEFAULT_DECORATION
  const [open, setOpen] = useState(false)
  // The choice being saved, shown instead of the saved one meanwhile
  const [pending, setPending] = useState<Decoration | null>(null)
  const [failed, setFailed] = useState(false)
  const current = pending ?? saved
  const { nameColor } = decorationStyle(current)

  const choose = async (change: Partial<Decoration>) => {
    const next = { ...current, ...change }
    setPending(next)
    setFailed(false)
    try {
      await saveDecoration(uid, next, { level })
    } catch (error) {
      console.warn('[decoration]', error)
      setFailed(true)
    } finally {
      setPending(null)
    }
  }

  const lockedLabel = (item: Item) => (isUnlocked(item, { level }) ? null : t('decorations.locked', { level: item.unlock?.level }))

  return (
    <>
      <Button
        label={t('decorations.open')}
        variant="secondary"
        onPress={() => setOpen(true)}
        icon={<MaterialCommunityIcons name="palette-outline" size={20} color={colors.text} />}
      />
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('decorations.close')}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text variant="heading">{t('decorations.title')}</Text>
            <Text variant="caption">{t('decorations.hint')}</Text>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.lg }}>
              <View style={styles.preview} accessibilityLabel={t('decorations.preview')}>
                <Avatar username={username} size={56} decoration={current} />
                <Text variant="title" numberOfLines={1} color={nameColor ?? undefined} style={{ flexShrink: 1 }}>
                  {username}
                </Text>
              </View>

              <View style={{ gap: space.sm }}>
                <Text variant="label">{t('decorations.frames')}</Text>
                <View style={styles.options}>
                  {(FRAMES as Item[]).map((item) => {
                    const selected = current.frame === item.id
                    const locked = lockedLabel(item)
                    return (
                      <Touchable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: !!locked }}
                        disabled={!!locked}
                        onPress={() => choose({ frame: item.id })}
                        style={[styles.option, selected && styles.optionSelected, !!locked && { opacity: 0.45 }]}>
                        <Avatar username={username} size={36} decoration={{ frame: item.id, color: DEFAULT_DECORATION.color }} />
                        <Text variant="caption" numberOfLines={1} color={selected ? colors.text : colors.textMuted}>
                          {t(`decorations.frame.${item.id}`)}
                        </Text>
                        {locked && (
                          <Text variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
                            {locked}
                          </Text>
                        )}
                      </Touchable>
                    )
                  })}
                </View>
              </View>

              <View style={{ gap: space.sm }}>
                <Text variant="label">{t('decorations.colors')}</Text>
                <View style={styles.options}>
                  {(NAME_COLORS as (Item & { value: string | null })[]).map((item) => {
                    const selected = current.color === item.id
                    const locked = lockedLabel(item)
                    return (
                      <Touchable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: !!locked }}
                        disabled={!!locked}
                        onPress={() => choose({ color: item.id })}
                        style={[styles.option, selected && styles.optionSelected, !!locked && { opacity: 0.45 }]}>
                        <View style={[styles.swatch, { backgroundColor: item.value ?? colors.textMuted }]} />
                        <Text variant="caption" numberOfLines={1} color={selected ? colors.text : colors.textMuted}>
                          {t(`decorations.color.${item.id}`)}
                        </Text>
                        {locked && (
                          <Text variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
                            {locked}
                          </Text>
                        )}
                      </Touchable>
                    )
                  })}
                </View>
              </View>
            </ScrollView>
            {pending && <Text variant="caption">{t('decorations.saving')}</Text>}
            {failed && (
              <Text variant="caption" color={colors.danger}>
                {t('decorations.error')}
              </Text>
            )}
            <Button label={t('decorations.close')} variant="secondary" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    minWidth: 76,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: `${colors.accent}1F` },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
})
