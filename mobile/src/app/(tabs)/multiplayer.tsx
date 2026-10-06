import { useTranslation } from 'react-i18next'

import { ComingSoon } from '@/components/ComingSoon'

export default function MultiplayerScreen() {
  const { t } = useTranslation()
  return <ComingSoon title={t('mobile.tabs.multiplayer')} icon="account-group-outline" />
}
