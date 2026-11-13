// The home globe's skin picker: a round button over the globe's corner opening a sheet of skins (catalog in
// @shared/utils/globeSkins). Same locked/unlocked option style as the profile's DecorationPicker; a tap applies at once.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { isSkinUnlocked, visibleSkins } from '@shared/utils/globeSkins'

import { ScreenTitle } from '@/components/flight'
import { Button, Text, Touchable } from '@/components/ui'
import { makeStyles, radius, space, useColors } from '@/theme'

type Skin = { id: string; unlock: { kind: string; level?: number }; swatch: [string, string] | null }

export function GlobeSkinPicker({
  uid,
  level,
  secret,
  choice,
  onChoose,
}: {
  uid?: string | null
  level: number
  secret: boolean
  choice: string
  onChoose: (id: string) => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const [open, setOpen] = useState(false)
  const progress = { level, secret }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t('globe.skins_open')} onPress={() => setOpen(true)} hitSlop={6} style={styles.button}>
        <MaterialCommunityIcons name="palette" size={20} color={colors.text} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('decorations.close')}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <ScreenTitle size={20}>{t('globe.skins_title')}</ScreenTitle>
            <Text variant="caption">{t('globe.skins_hint')}</Text>
            {!uid && <Text variant="caption">{t('globe.skins_signin')}</Text>}
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.options}>
              {(visibleSkins(progress) as Skin[]).map((skin) => {
                const selected = choice === skin.id
                const locked = !isSkinUnlocked(skin, progress)
                const [ocean, land] = skin.swatch ?? [colors.globeOcean, colors.globeLand]
                return (
                  <Touchable
                    key={skin.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: locked }}
                    disabled={locked}
                    onPress={() => onChoose(skin.id)}
                    style={[styles.option, selected && styles.optionSelected, locked && { opacity: 0.45 }]}>
                    <View style={[styles.swatch, { backgroundColor: ocean }]}>
                      <View style={[styles.land, { backgroundColor: land }]} />
                    </View>
                    <Text variant="caption" numberOfLines={1} color={selected ? colors.text : colors.textMuted}>
                      {t(`globe.skin.${skin.id}`)}
                    </Text>
                    {locked && (
                      <Text variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
                        {t('globe.skins_locked', { level: skin.unlock.level })}
                      </Text>
                    )}
                  </Touchable>
                )
              })}
            </ScrollView>
            <Button label={t('decorations.close')} variant="secondary" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const useStyles = makeStyles((colors) => ({
  button: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.board,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  land: { position: 'absolute', left: 14, top: 8, width: 14, height: 14, borderRadius: 7 },
}))
