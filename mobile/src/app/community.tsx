// Community: the players who chose to be listed, newest first, to add as friends without knowing their username.
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useCommunityList, useMembership, useWeeklyTop } from '@shared/hooks/useCommunity'
import { useFriendships } from '@shared/hooks/usePlayerProfile'

import { type Account, useAccount } from '@/account/auth'
import { type CandidateMessage, FriendCandidates } from '@/components/profile/FriendCandidates'
import { SectionTitle } from '@/components/profile/ProfileSections'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Member = { uid: string; username: string; badges: never }

function Membership({ account, onChange }: { account: Account; onChange: () => void }) {
  const { t } = useTranslation()
  const membership = useMembership(account.uid, onChange) as {
    listed: boolean | null
    busy: boolean
    error: boolean
    join: () => void
    leave: () => void
  }
  if (membership.listed == null) return null

  return (
    <View style={styles.card}>
      {membership.listed ? (
        <>
          <Text variant="bodyStrong" color={colors.accent}>
            {t('community.listed')}
          </Text>
          <Button label={t('community.leave')} variant="secondary" loading={membership.busy} onPress={membership.leave} />
        </>
      ) : (
        <>
          <Text variant="heading">{t('community.join_title')}</Text>
          <Text variant="caption">{t('community.join_hint')}</Text>
          <Button label={t('community.join')} loading={membership.busy} onPress={membership.join} />
        </>
      )}
      {membership.error && (
        <Text variant="caption" color={colors.danger}>
          {t('friends.errors.generic')}
        </Text>
      )}
    </View>
  )
}

export default function CommunityScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const community = useCommunityList() as {
    members: Member[]
    loading: boolean
    error: boolean
    done: boolean
    loadMore: () => void
    reload: () => void
  }
  const [message, setMessage] = useState<CandidateMessage | null>(null)
  const weekly = useWeeklyTop() as { entries: { uid: string; name: string; points: number }[]; loading: boolean }
  const top = weekly.entries.map((entry, index) => ({ uid: entry.uid, name: entry.name, rank: index + 1, detail: `${entry.points} ${t('units.pts')}` }))
  const players = community.members.map((member) => ({ uid: member.uid, name: member.username, badges: member.badges }))

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}
      style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t('community.title')} />
      <Text variant="caption">{t('community.intro')}</Text>

      {account?.username ? (
        <Membership account={account} onChange={community.reload} />
      ) : (
        <View style={styles.card}>
          <Text variant="caption">{t('community.need_account')}</Text>
          <Button label={t('friends.add_page.login_button')} onPress={() => router.replace('/profile')} />
        </View>
      )}

      <View style={{ gap: space.md }}>
        <SectionTitle title={t('community.weekly_title')} />
        <Text variant="caption">{t('community.weekly_hint')}</Text>
        <FriendCandidates players={top} account={account} friendships={friendships} onMessage={setMessage} />
        {!weekly.loading && top.length === 0 && <Text variant="caption">{t('community.weekly_empty')}</Text>}
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle title={t('community.members_title')} />
        {message && (
          <Text variant="caption" color={message.kind === 'error' ? colors.danger : colors.accent}>
            {message.text}
          </Text>
        )}
        <FriendCandidates players={players} account={account} friendships={friendships} onMessage={setMessage} />
        {community.loading && <ActivityIndicator color={colors.accent} />}
        {!community.loading && !community.error && players.length === 0 && <Text variant="caption">{t('community.empty')}</Text>}
        {community.error && (
          <View style={{ gap: space.sm }}>
            <Text variant="caption" color={colors.danger}>
              {t('community.error')}
            </Text>
            <Button label="↻" variant="secondary" onPress={community.reload} />
          </View>
        )}
        {!community.done && !community.error && !community.loading && players.length > 0 && (
          <Button label={t('community.more')} variant="secondary" onPress={community.loadMore} />
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
})
