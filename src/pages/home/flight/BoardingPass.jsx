// A daily challenge as a boarding pass: flight number and gate, « Board » (the daily), ∞ (infinite mode) and the
// multiplayer button, and a tear-off stub (gate, departure at midnight, barcode) that tilts on hover.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MultiIcon } from '../../../components/NavIcons'
import { gameColor } from '../../../utils/roomGames'

const GATES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']

// `status`: today's daily 'won', 'played' or 'todo' (signed-in player), null when unknown (visitor, loading)
export default function BoardingPass({ game, index, status = null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const flight = `GG-${String(index + 1).padStart(2, '0')}`
  const gate = GATES[index % GATES.length]
  const done = status && status !== 'todo'
  return (
    <article
      className={`boarding-pass sd-punch${done ? ' boarding-pass--done' : ''}`}
      style={{ '--game': gameColor(game.id), '--i': index }}
    >
      <div className="boarding-pass-main">
        <div className="boarding-pass-top">
          <span className="gg-mono boarding-pass-code">
            {t('home.boarding_pass')} · {flight}
          </span>
          {status && (
            <span className={`boarding-pass-status boarding-pass-status--${status}`}>
              {done && <span aria-hidden="true">✓ </span>}
              {t(`home.daily_status_${status}`)}
            </span>
          )}
        </div>
        <h3 className="boarding-pass-title">
          <span className="boarding-pass-icon" aria-hidden="true">{game.icon}</span>
          {t(game.titleKey)}
        </h3>
        <p className="boarding-pass-desc">{t(game.descKey)}</p>
        <div className="boarding-pass-actions">
          <button type="button" className="boarding-pass-board" onClick={() => navigate(game.route, { state: { mode: 'daily' } })}>
            {t('home.board')}
          </button>
          {!game.dailyOnly && (
            <button
              type="button"
              className="boarding-pass-more"
              onClick={() => navigate(game.route, { state: { mode: 'infinite' } })}
              aria-label={t('home.infinite')}
              title={t('home.infinite')}
            >
              <span aria-hidden="true">∞</span>
            </button>
          )}
          {game.multiId && (
            <button
              type="button"
              className="boarding-pass-more"
              onClick={() => navigate('/multiplayer/create', { state: { gameId: game.multiId } })}
              aria-label={t('home.multi')}
              title={t('home.multi')}
            >
              <MultiIcon />
            </button>
          )}
        </div>
      </div>
      <div className="boarding-pass-stub" aria-hidden="true">
        <span className="boarding-pass-field">
          <small>{t('home.gate')}</small>
          <strong className="boarding-pass-gate">{gate}</strong>
        </span>
        <span className="boarding-pass-field">
          <small>{t('home.departure')}</small>
          <strong>00:00</strong>
        </span>
        <span className="boarding-pass-barcode" />
      </div>
    </article>
  )
}
