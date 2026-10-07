import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { APK_URL, APP_URL } from '../utils/appLinks'
import './AppBanner.css'

const DISMISSED_KEY = 'app_banner_dismissed'

// 'ios' : app web à installer depuis Safari (le tuto s'affiche dans l'app web elle-même).
// 'android' : téléchargement de l'APK.
function detectPlatform() {
  if (typeof window === 'undefined') return null
  const ua = window.navigator.userAgent
  if (/iPhone/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return null
}

function shouldShow(platform) {
  if (!platform) return false
  try {
    return window.localStorage.getItem(DISMISSED_KEY) !== '1'
  } catch {
    return true
  }
}

// Bandeau sur téléphone qui propose l'app : app web sur iPhone, APK sur Android.
export default function AppBanner() {
  const { t } = useTranslation()
  const [platform] = useState(detectPlatform)
  const [visible, setVisible] = useState(() => shouldShow(platform))
  if (!visible) return null

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // stockage indisponible (navigation privée) : on masque juste pour cette visite
    }
    setVisible(false)
  }

  const isAndroid = platform === 'android'

  return (
    <div className="app-banner" role="region" aria-label={t('app_banner.title')}>
      <img src="/app-icon.png" alt="" className="app-banner__icon" />
      <div className="app-banner__text">
        <p className="app-banner__title">{t('app_banner.title')}</p>
        <p className="app-banner__subtitle">
          {t(isAndroid ? 'app_banner.subtitle_android' : 'app_banner.subtitle')}
        </p>
      </div>
      <a className="app-banner__open" href={isAndroid ? APK_URL : APP_URL} download={isAndroid ? 'geogame.apk' : undefined}>
        {t(isAndroid ? 'app_banner.download' : 'app_banner.open')}
      </a>
      <button type="button" className="app-banner__close" onClick={dismiss} aria-label={t('app_banner.close')}>
        ×
      </button>
    </div>
  )
}
