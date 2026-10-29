// Card above the XP toast when a claim pays flag fragments (and unlocks no flag, see FlagUnlockOverlay): the flag being
// rebuilt with the new pieces popping in, and its progress bar. Nothing without the data (XpToast shows a text line).
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { onXpClaimed } from '../../utils/xp'
import { pieceGrid, piecesFor } from '../../utils/flagCollection'
import { flagsAfter, pieceStyle, rarityColor, rarityOf, rewardLines } from './claim'
import './FragmentToast.css'

const DURATION = 3200

export default function FragmentToast() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const uid = account?.uid
  const [card, setCard] = useState(null)
  const nextId = useRef(0)
  const timer = useRef(null)

  useEffect(
    () =>
      onXpClaimed((claim) => {
        const fragments = claim.fragments ?? 0
        if (fragments <= 0 || (claim.unlockedFlags?.length ?? 0) > 0) return
        const flags = flagsAfter(claim, uid)
        if (!flags?.current) return
        const cost = piecesFor(rarityOf(flags.current))
        nextId.current += 1
        setCard({ id: nextId.current, iso: flags.current, pieces: flags.pieces, added: Math.min(fragments, flags.pieces, cost), fragments, lines: rewardLines(t, claim) })
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCard(null), DURATION)
      }),
    [uid, t]
  )
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!card) return null
  const rarity = rarityOf(card.iso)
  const color = rarityColor(rarity)
  const cost = piecesFor(rarity)
  const { cols, rows } = pieceGrid(cost)
  const firstNew = card.pieces - card.added
  return (
    <div className="fragment-toast" role="status" key={card.id} style={{ '--rarity': color }}>
      <div className="fragment-toast-flag" data-testid="fragment-flag">
        {Array.from({ length: cost }, (_, index) => {
          const isNew = index >= firstNew && index < card.pieces
          const owned = index < card.pieces
          return (
            <span
              key={index}
              className={`fragment-toast-piece${isNew ? ' fragment-toast-piece--new' : ''}${owned ? '' : ' fragment-toast-piece--covered'}`}
              style={{
                left: `${(index % cols) * (100 / cols)}%`,
                top: `${Math.floor(index / cols) * (100 / rows)}%`,
                width: `${100 / cols}%`,
                height: `${100 / rows}%`,
                '--delay': `${250 + (index - firstNew) * 130}ms`,
                ...(owned ? pieceStyle(card.iso, index, cols, rows) : {}),
              }}
            />
          )
        })}
      </div>
      <div className="fragment-toast-text">
        <strong>{t('level.fragments', { count: card.fragments })}</strong>
        {card.lines.map((line) => (
          <small key={line} className="fragment-toast-reason">{line}</small>
        ))}
        <small>{t('collection.pieces', { count: card.pieces, total: cost })}</small>
        <div className="fragment-toast-track">
          <div
            className="fragment-toast-fill"
            style={{ '--from': `${(firstNew / cost) * 100}%`, '--to': `${(card.pieces / cost) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
