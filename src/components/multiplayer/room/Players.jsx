import React from 'react'
import { useTranslation } from 'react-i18next'

export default function Players({ room, playerId }) {
  const { t } = useTranslation()
  const players = Object.entries(room.players)
  return (
    <div className="mpr-card">
      <h3>{t('mp_room.players', { count: players.length })}</h3>
      <ul className="mpr-list">
        {players.map(([id, player]) => (
          <li key={id} className={`mpr-row${id === playerId ? ' mpr-row--me' : ''}`}>
            <span className="mpr-name">
              {player.pseudo}
              {id === playerId && ` (${t('mp_room.you')})`}
            </span>
            {id === room.hostId && <span className="mpr-badge">{t('mp_room.host')}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
