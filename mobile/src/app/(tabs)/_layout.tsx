import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useTranslation } from 'react-i18next'

import { useFriendships } from '@shared/hooks/usePlayerProfile'

import { useAccount } from '@/account/auth'
import { fonts, useColors } from '@/theme'

export default function TabsLayout() {
  const { t } = useTranslation()
  const colors = useColors()
  const { account } = useAccount()
  // Friend requests waiting for an answer: a badge on the Profile tab, which leads to the friends screen.
  const requests = useFriendships(account?.uid).incoming.length
  return (
    <NativeTabs
      backgroundColor={colors.bg}
      tintColor={colors.accent}
      iconColor={{ default: colors.textMuted, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.bodyBold },
        selected: { color: colors.accent, fontSize: 11, fontFamily: fonts.bodyBold },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'globe.europe.africa', selected: 'globe.europe.africa.fill' }} md="public" />
        <NativeTabs.Trigger.Label>{t('mobile.tabs.play')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="multiplayer">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Label>{t('mobile.tabs.multiplayer')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboards">
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} md="emoji_events" />
        <NativeTabs.Trigger.Label>{t('mobile.tabs.leaderboards')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        <NativeTabs.Trigger.Label>{t('profile.passport')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={requests === 0}>{String(requests)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
