// Country Clue: closer or farther than the previous guess, and the closest guess (see utils/clueProgress.js)
import React from 'react'
import { useTranslation } from 'react-i18next'
import './ClueProgressBadges.css'

export default function ClueProgressBadges({ progress, lang }) {
  const { t, i18n } = useTranslation()
  if (!progress) return null
  const { deltaKm, closest } = progress
  const km = deltaKm == null ? '' : Math.abs(deltaKm).toLocaleString(lang ?? i18n.language)
  return (
    <>
      {deltaKm != null && (
        <span className={`country-clue-progress country-clue-progress--${deltaKm < 0 ? 'closer' : deltaKm > 0 ? 'farther' : 'same'}`}>
          {deltaKm < 0 ? `🔥 ${t('country_clue.closer', { km })}` : deltaKm > 0 ? `❄️ ${t('country_clue.farther', { km })}` : t('country_clue.same_distance')}
        </span>
      )}
      {closest && <span className="country-clue-progress country-clue-progress--best">📍 {t('country_clue.closest')}</span>}
    </>
  )
}

