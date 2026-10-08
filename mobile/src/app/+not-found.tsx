import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { ErrorScreen } from '@/components/ErrorScreen'

// Any route that matches no screen (a stale link, a mistyped URL on the web).
export default function NotFound() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <ErrorScreen
      icon="compass-off-outline"
      title={t('mobile.common.not_found_title')}
      message={t('mobile.common.not_found_message')}
      actions={[{ label: t('mobile.common.go_home'), onPress: () => router.replace('/') }]}
    />
  )
}
