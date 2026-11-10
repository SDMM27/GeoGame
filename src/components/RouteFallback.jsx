import React from 'react'
import { useTranslation } from 'react-i18next'
import './RouteFallback.css'

// Shown while a lazily loaded page (or its data) is being fetched: boarding in progress.
export default function RouteFallback() {
  const { t } = useTranslation()
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback__spinner" aria-hidden="true" />
      <span className="gg-kicker route-fallback__boarding">{t('route_fallback.boarding')}</span>
    </div>
  )
}
