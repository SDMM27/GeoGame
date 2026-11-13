// Own profile: a button opening a sheet where the player picks the frame around their avatar and the color of their
// name (catalog in @shared/utils/decorations), and the flag of their collection worn as their picture. A tap saves at once; the choice shows right away and is reverted if the
// write fails.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native'

import { useDecoration } from '@shared/hooks/useDecoration'
import { useXp } from '@shared/hooks/useXp'
import { DEFAULT_DECORATION, decorationStyle, FRAMES, isUnlocked, NAME_COLORS, saveAvatarFlag, saveDecoration } from '@shared/utils/decorations'
import { fetchCollection } from '@shared/utils/flagCollectionData'
import { getCountryName } from '@shared/utils/getCountryName'
import { onPublicDataPatched } from '@shared/utils/publicProfile'

import { Kicker, ScreenTitle } from '@/components/flight'
import { Button, Text, Touchable } from '@/components/ui'
import { makeStyles, radius, space, useColors } from '@/theme'
import { Avatar, FlagDisc, type Decoration } from './ProfileSections'

type Item = { id: string; unlock?: { kind: string; level?: number } }

// Flags listed before "show all" (up to ~240 flags: the grid stays light), and from how many a search box shows up
const FLAGS_SHOWN = 36
const SEARCH_FROM = 12

// The flags of the player's collection, sorted by name in `lang`; empty until loaded.
function useUnlockedFlags(uid: string, lang: string): string[] {
  const [unlocked, setUnlocked] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchCollection(uid)
        .then((collection: { flags: { unlocked: string[] } }) => !cancelled && setUnlocked(collection.flags.unlocked))
        .catch((error: unknown) => console.warn('[decoration]', error))
    load()
    const stop = onPublicDataPatched((patched: string) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])
  return useMemo(() => {
    const name = (iso: string) => (getCountryName(iso, lang) as string) || iso
    return [...unlocked].sort((a, b) => name(a).localeCompare(name(b), lang))
  }, [unlocked, lang])
}

// Lower case without accents, so "ecosse" finds "Écosse"
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function DecorationPicker({ uid, username }: { uid: string; username: string }) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const flags = useUnlockedFlags(uid, i18n.language)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
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

  const chooseFlag = async (iso: string | null) => {
    setPending({ ...current, flag: iso })
    setFailed(false)
    try {
      await saveAvatarFlag(uid, iso, flags)
    } catch (error) {
      console.warn('[decoration]', error)
      setFailed(true)
    } finally {
      setPending(null)
    }
  }

  const countryName = (iso: string) => (getCountryName(iso, i18n.language) as string) || iso
  const query = fold(search.trim())
  const matching = query ? flags.filter((iso) => fold(countryName(iso)).includes(query)) : flags
  const listed = showAll || query ? matching : matching.slice(0, FLAGS_SHOWN)

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
            <ScreenTitle size={20}>{t('decorations.title')}</ScreenTitle>
            <Text variant="caption">{t('decorations.hint')}</Text>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.lg }}>
              <View style={styles.preview} accessibilityLabel={t('decorations.preview')}>
                <Avatar username={username} size={56} decoration={current} />
                <Text variant="title" numberOfLines={1} color={nameColor ?? undefined} style={{ flexShrink: 1 }}>
                  {username}
                </Text>
              </View>

              <View style={{ gap: space.sm }}>
                <Kicker>{t('decorations.frames')}</Kicker>
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
                <Kicker>{t('decorations.colors')}</Kicker>
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

              <View style={{ gap: space.sm }}>
                <Kicker>{t('decorations.flag_section')}</Kicker>
                <Text variant="caption">{t('decorations.flag_hint')}</Text>
                {flags.length === 0 ? (
                  <Text variant="caption">{t('decorations.flag_empty')}</Text>
                ) : (
                  <>
                    {flags.length > SEARCH_FROM && (
                      <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('decorations.flag_search')}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.search}
                      />
                    )}
                    <View style={styles.options}>
                      <Touchable
                        testID="flag-none"
                        accessibilityRole="radio"
                        accessibilityState={{ selected: !current.flag }}
                        onPress={() => chooseFlag(null)}
                        style={[styles.option, !current.flag && styles.optionSelected]}>
                        <Avatar username={username} size={36} flag={null} />
                        <Text variant="caption" numberOfLines={1} color={!current.flag ? colors.text : colors.textMuted}>
                          {t('decorations.flag_none')}
                        </Text>
                      </Touchable>
                      {listed.map((iso) => {
                        const selected = current.flag === iso
                        return (
                          <Touchable
                            key={iso}
                            testID={`flag-option-${iso}`}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            accessibilityLabel={t('decorations.flag_alt', { country: countryName(iso) })}
                            onPress={() => chooseFlag(iso)}
                            style={[styles.option, selected && styles.optionSelected]}>
                            <FlagDisc iso={iso} size={36} />
                            <Text variant="caption" numberOfLines={1} color={selected ? colors.text : colors.textMuted} style={{ maxWidth: 76 }}>
                              {countryName(iso)}
                            </Text>
                          </Touchable>
                        )
                      })}
                    </View>
                    {!query && matching.length > FLAGS_SHOWN && (
                      <Touchable accessibilityRole="button" onPress={() => setShowAll(!showAll)}>
                        <Text variant="caption" color={colors.highlight}>
                          {t(showAll ? 'collection.show_less' : 'collection.show_all')}
                        </Text>
                      </Touchable>
                    )}
                  </>
                )}
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

const useStyles = makeStyles((colors) => ({
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
  search: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
  },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
}))
