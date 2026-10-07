import { useTranslation } from 'react-i18next'

import { ComingSoon } from '@/components/ComingSoon'

export default function LeaderboardsScreen() {
  const { t } = useTranslation()
  return <ComingSoon title={t('mobile.tabs.leaderboards')} icon="trophy-outline" />
}
