import React from 'react'
import { useTranslation } from 'react-i18next'
import './MapAssistToggle.css'

// Switch for the optional map of the countries already guessed. In a daily, showing the map puts the score
// in the lower tier of the leaderboard: the hint says so, and tells once it was applied.
export default function MapAssistToggle({ checked, onChange, used, penalized }) {
  const { t } = useTranslation()
  const hint = penalized
    ? used ? t('map_assist.applied') : t('map_assist.hint')
    : t('map_assist.hint_free')

  return (
    <div className={`map-assist${penalized && used ? ' map-assist--used' : ''}`}>
      <label className="map-assist__switch">
        <input
          type="checkbox"
          className="map-assist__input"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="map-assist__track" aria-hidden="true" />
        <span className="map-assist__label">🗺️ {t('map_assist.toggle')}</span>
      </label>
      <p className="map-assist__hint">{hint}</p>
    </div>
  )
}
