// "What's new" dialog: the newest note of whatsNew.ts, once, to players who had the app before the update.
// Never over a game; the language note lets the player switch language right there.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { usePathname } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'

import { LANGUAGES as SHARED_LANGUAGES, toLanguage } from '@shared/i18n/languages'
import { colors, radius, space } from '@/theme'
import { hasPlayedBefore, markSeen, pendingNote } from '@/whatsNew'
import { Button, Text, Touchable } from './ui'

const LANGUAGES: { code: string; label: string }[] = SHARED_LANGUAGES

// Read when the module loads, before the app stores anything for this launch.
const playedBefore = hasPlayedBefore(globalThis.localStorage)

export function WhatsNew() {
  const { t, i18n } = useTranslation()
  const pathname = usePathname()
  const [note, setNote] = useState(() => pendingNote(globalThis.localStorage, playedBefore))
  const current = toLanguage(i18n.resolvedLanguage ?? i18n.language)

  const close = () => {
    if (note) markSeen(globalThis.localStorage, note)
    setNote(null)
  }

  const visible = note !== null && !pathname.startsWith('/game')

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        {note && (
          <Animated.View entering={ZoomIn.springify().damping(18).stiffness(220)} style={styles.card}>
            <View style={styles.content}>
              <View style={styles.badge}>
                <Text variant="caption" color={colors.accent} style={styles.badgeText}>
                  {t('mobile.whats_new.title')}
                </Text>
              </View>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={note.icon} size={30} color={colors.accent} />
              </View>
              <Text variant="heading" style={styles.center}>
                {t(note.titleKey)}
              </Text>
              <Text variant="body" color={colors.textMuted} style={styles.center}>
                {t(note.bodyKey)}
              </Text>
              {note.languagePicker && (
                <View style={styles.languages} accessibilityLabel={t('mobile.whats_new.pick_language')}>
                  {LANGUAGES.map((language) => {
                    const selected = language.code === current
                    return (
                      <Touchable
                        key={language.code}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => i18n.changeLanguage(language.code)}
                        style={[styles.chip, selected && styles.chipSelected]}>
                        <Text variant="caption" color={selected ? colors.onAccent : colors.text} style={styles.chipText}>
                          {language.label}
                        </Text>
                      </Touchable>
                    )
                  })}
                </View>
              )}
              <Button label={t('mobile.whats_new.ok')} onPress={close} style={styles.ok} />
            </View>
          </Animated.View>
        )}
        {/* Tapping outside closes it too */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('mobile.whats_new.ok')} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(3, 6, 14, 0.72)' },
  card: {
    zIndex: 1,
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  content: { alignItems: 'center', gap: space.sm, padding: space.xl },
  badge: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: `${colors.accent}1F` },
  badgeText: { textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    backgroundColor: `${colors.accent}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space.xs,
  },
  center: { textAlign: 'center' },
  languages: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs, marginTop: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13 },
  ok: { alignSelf: 'stretch', marginTop: space.md },
})
