// A daily challenge as a boarding pass: today's status, « Board » (the daily), ∞ (infinite mode) and the
// multiplayer button, and a tear-off stub with a paper fold and a crisp decorative barcode.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MultiIcon } from '../../../components/NavIcons'
import { gameColor } from '../../../utils/roomGames'
import GameEmblem, { flightCode } from '../../../components/GameEmblem'
import FlapText from './FlapText'

const GATES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']
const BARCODE_BARS = [[0, 2], [4, 1], [7, 3], [12, 1], [15, 2], [19, 1], [22, 3], [27, 2], [31, 1], [34, 2], [38, 1], [41, 3], [46, 1], [49, 2], [53, 3], [58, 1], [61, 2], [65, 1], [68, 3], [73, 1], [76, 2]]

// `status`: today's daily 'won', 'played' or 'todo' (signed-in player), null when unknown (visitor, loading)
export default function BoardingPass({ game, index, status = null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const title = t(game.titleKey)
  const gate = GATES[index % GATES.length]
  const done = status && status !== 'todo'
  return (
    <article
      className={`boarding-pass sd-punch${done ? ' boarding-pass--done' : ''}`}
      style={{ '--game': gameColor(game.id), '--game-ink': gameColor(`${game.id}-ink`), '--i': index }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div className="boarding-pass-main">
        {status && (
          <div className="boarding-pass-top">
            <span className={`boarding-pass-status boarding-pass-status--${status}`}>
              {done && <span aria-hidden="true">✓ </span>}
              {t(`home.daily_status_${status}`)}
            </span>
          </div>
        )}
        <h3 className="boarding-pass-title">
          <GameEmblem game={game.id} size={36} />
          <span className="boarding-pass-title-label">
            <span className="boarding-pass-title-measure" aria-hidden="true">{title}</span>
            <FlapText text={title} active={hovered || focused} />
          </span>
        </h3>
        <p className="boarding-pass-desc">{t(game.descKey)}</p>
        <div className="boarding-pass-actions">
          <button type="button" className="boarding-pass-board" onClick={() => navigate(game.route, { state: { mode: 'daily' } })}>
            {t('buttons.play')}
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
        <span className="boarding-pass-flight">{flightCode(game.id)}</span>
        <span className="boarding-pass-field">
          <small>{t('home.gate')}</small>
          <strong className="boarding-pass-gate">{gate}</strong>
        </span>
        <span className="boarding-pass-field">
          <small>{t('home.departure')}</small>
          <strong>00:00</strong>
        </span>
        <svg className="boarding-pass-barcode" viewBox="0 0 80 34" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
          {BARCODE_BARS.map(([x, width]) => <rect key={x} x={x} y={0} width={width} height={34} />)}
        </svg>
      </div>
    </article>
  )
}
