// Web version of the tab bar: NativeTabs renders its tabs at the top on web, under the
// iPhone status bar where they can't be tapped. JS tabs sit at the bottom like on native.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Tabs } from 'expo-router/js-tabs'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { colors, fonts } from '@/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const TABS: { name: string; labelKey: string; icon: IconName; iconSelected: IconName }[] = [
  { name: 'index', labelKey: 'mobile.tabs.play', icon: 'earth', iconSelected: 'earth' },
  { name: 'multiplayer', labelKey: 'mobile.tabs.multiplayer', icon: 'account-group-outline', iconSelected: 'account-group' },
  { name: 'leaderboards', labelKey: 'mobile.tabs.leaderboards', icon: 'trophy-outline', iconSelected: 'trophy' },
  { name: 'profile', labelKey: 'mobile.tabs.profile', icon: 'account-circle-outline', iconSelected: 'account-circle' },
]

export default function TabsLayout() {
  const { t } = useTranslation()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ color, focused, size }) => (
              <MaterialCommunityIcons name={focused ? tab.iconSelected : tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
