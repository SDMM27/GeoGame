import React from 'react'

import { useTranslation } from 'react-i18next'

import { HISTORICAL_FLAG_COST, hasHistoricalPackReward } from '../../utils/historicalFlagCollection'

import './HistoricalFlagAlbum.css'


export function HistoricalPackStatus({ album }) {

  const { t } = useTranslation()
  const { state, error } = album
  if (!state) return error ? <p role="alert">{t('collection.historical.load_error')}</p> : null
  if (state.next) {
    return (
      <div className="historical-pack">
        <small>{t('collection.historical.queued')}</small>
      </div>
    )
  }
  if (!hasHistoricalPackReward(state)) {
    return state.active ? null : (
      <div className="historical-pack">
        <small>{t('collection.historical.catalog_complete')}</small>
      </div>
    )
  }
  return (
    <div className="historical-pack">
      <small>{t('collection.historical.pack_hint', { total: HISTORICAL_FLAG_COST })}</small>
    </div>
  )
}
