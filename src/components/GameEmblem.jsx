// A game's emblem in its own color: `tile` (rounded square, tinted, for lists and headers), `stamp` (a passport
// stamp with the flight code, for tickets and achievements) or `glyph` (the bare stroke, inline with text).
import React from 'react'
import { useTranslation } from 'react-i18next'
import { emblemId, gameEmblem } from '../utils/gameEmblems'
import { gameColor } from '../utils/roomGames'
import './GameEmblem.css'

export default function GameEmblem({ game, variant = 'tile', size = 40, title, className = '' }) {
  const emblem = gameEmblem(game)
  if (!emblem) return null
  const color = gameColor(emblemId(game))
  const style = { '--emblem': color, '--emblem-ink': color.replace(')', '-ink)'), width: size, height: size }
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }
  const paths = (
    <>
      {emblem.d && <path d={emblem.d} />}
      {emblem.d2 && <path d={emblem.d2} strokeDasharray="1.6 1.8" />}
    </>
  )

  if (variant === 'stamp') {
    return (
      <svg className={`game-emblem game-emblem--stamp ${className}`} style={style} viewBox="0 0 132 132" {...a11y}>
        <circle className="game-emblem-fill" cx="66" cy="66" r="60" strokeWidth="3" />
        <circle cx="66" cy="66" r="51" fill="none" strokeWidth="1.4" strokeDasharray="3 4" opacity="0.8" />
        <g transform="translate(42 26) scale(2)" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {paths}
        </g>
        <text x="66" y="98" textAnchor="middle" className="game-emblem-code">{emblem.code}</text>
      </svg>
    )
  }

  if (variant === 'glyph') {
    return (
      <svg className={`game-emblem game-emblem--glyph ${className}`} style={style} viewBox="0 0 24 24" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...a11y}>
        {paths}
      </svg>
    )
  }

  return (
    <svg className={`game-emblem game-emblem--tile ${className}`} style={style} viewBox="0 0 24 24" {...a11y}>
      <rect className="game-emblem-fill" width="24" height="24" rx="7" />
      <g transform="translate(4.8 4.8) scale(0.6)" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </g>
    </svg>
  )
}

export const flightCode = (game) => gameEmblem(game)?.code ?? ''

// A game's emblem tile next to « VOL DRP » and the game's name (`title` defaults to games.<id>.title): the flight tag of a HUD or of a list row.
export function GameFlightTag({ game, title, size = 36, className = '' }) {
  const { t } = useTranslation()
  const code = flightCode(game)
  if (!code) return null
  return (
    <div className={`game-flight-tag ${className}`}>
      <GameEmblem game={game} size={size} />
      <div className="game-flight-tag-text">
        <span className="gg-mono game-flight-tag-code">{t('game_hud.flight', { code })}</span>
        <span className="game-flight-tag-title">{title ?? t(`games.${emblemId(game)}.title`)}</span>
      </div>
    </div>
  )
}
