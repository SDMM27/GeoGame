// Light/dark switch: shows the sun in the dark theme (to go light) and the moon in the light one.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from './useColorScheme'
import './theme.css'

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { scheme, toggle } = useColorScheme()
  const dark = scheme === 'dark'
  return (
    <button
      type="button"
      className={`gg-theme-toggle ${className}`.trim()}
      onClick={toggle}
      aria-label={dark ? t('nav.theme_light') : t('nav.theme_dark')}
      title={dark ? t('nav.theme_light') : t('nav.theme_dark')}
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="9" cy="9" r="3.5" />
          <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 10.5A6.5 6.5 0 017.5 3a6.5 6.5 0 107.5 7.5z" />
        </svg>
      )}
    </button>
  )
}
