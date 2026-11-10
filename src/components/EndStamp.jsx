import React from 'react'
import { useTranslation } from 'react-i18next'
import './EndStamp.css'

// Round stamp slammed on the end-of-game ticket. Decorative: the result is already written in the ticket.
// `label`: the word under the value (defaults to « Atterri » / « Landed »); `tone`: 'success' | 'warning' | 'danger'.
export default function EndStamp({ value, label, tone = 'success' }) {
  const { t } = useTranslation()
  return (
    <span className={`gg-stamp sd-stamp end-stamp end-stamp--${tone}`} aria-hidden="true">
      {value != null && <strong>{value}</strong>}
      {label ?? t('carnet_games.stamp_landed')}
    </span>
  )
}
