// Your scroll collection: the scrolls by era, and the sheet of the ones you own. It reads the signed-in account only and
// takes no player id: nobody else's scrolls can be opened. `open=<scroll id>` opens a sheet (from the reward).
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { onPublicDataPatched } from '@shared/utils/publicProfile'
import { fetchScrolls } from '@shared/utils/scrollCollectionData'

import { useAccount } from '@/account/auth'
import { ScrollsView, type Scrolls } from '@/components/scrolls/ScrollsView'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'

export default function ParchmentsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { open } = useLocalSearchParams<{ open?: string }>()
  const { loading, account } = useAccount()
  const uid = account?.username ? account.uid : null
  const [scrolls, setScrolls] = useState<{ uid: string; value: Scrolls } | null>(null)

  useEffect(() => {
    if (!uid) return undefined
    let cancelled = false
    const load = () =>
      fetchScrolls(uid).then((value: Scrolls) => {
        if (!cancelled) setScrolls({ uid, value })
      })
    load()
    const stop = onPublicDataPatched((patched: string) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}>
        <ScreenHeader title={t('scrolls.title')} />
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
        ) : !uid ? (
          <View style={styles.card}>
            <Text variant="caption">{t('scrolls.need_account')}</Text>
            <Button label={t('friends.add_page.login_button')} onPress={() => router.replace('/profile')} />
          </View>
        ) : scrolls?.uid === uid ? (
          <ScrollsView scrolls={scrolls.value} requested={open ?? null} />
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
})
