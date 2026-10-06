import { useTranslation } from 'react-i18next'

import { ComingSoon } from '@/components/ComingSoon'

export default function ProfileScreen() {
  const { t } = useTranslation()
  return <ComingSoon title={t('mobile.tabs.profile')} icon="account-circle-outline" />
}
