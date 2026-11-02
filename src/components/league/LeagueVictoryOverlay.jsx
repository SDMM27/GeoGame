// Full-screen reward on the Home page when the player finished on the podium of the league week that just ended
// (useLeagueVictory): a burst and the trophy for the winner, a medal for 2nd and 3rd, with what it paid.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { useLeagueVictory } from '../../hooks/useLeagueVictory'
import { TIER_COLORS } from '../../utils/achievements'
import './LeagueVictoryOverlay.css'

const BURST_COUNT = 24
const MEDALS = { 2: { emoji: '🥈', color: TIER_COLORS.silver }, 3: { emoji: '🥉', color: TIER_COLORS.bronze } }

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function LeagueVictoryOverlay() {
  const { account } = useAccount()
  const { result, dismiss } = useLeagueVictory(account?.username ? account.uid : null)
  return result ? <Victory result={result} onClose={dismiss} /> : null
}

function Victory({ result, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const champion = result.rank === 1
  const medal = MEDALS[result.rank]
  const color = champion ? TIER_COLORS.gold : medal.color
  const reduced = useMemo(prefersReducedMotion, [])
  const ctaRef = useRef(null)
  const closeRef = useRef(null)
  const [particles] = useState(() =>
    Array.from({ length: BURST_COUNT }, (_, index) => {
      const angle = (index / BURST_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const dist = 110 + Math.random() * 100
      return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 5 + Math.random() * 6, white: index % 3 === 0 }
    })
  )

  // Focus goes to the main button, and back to where it was once closed
  useEffect(() => {
    const opener = document.activeElement
    ctaRef.current?.focus()
    return () => opener?.focus?.()
  }, [])

  // Escape closes; Tab stays between the two buttons
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'Tab') {
        const [first, last] = [ctaRef.current, closeRef.current]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = champion ? t('league.win_title') : t('league.podium_title', { rank: result.rank })
  return (
    <div className={`league-victory${reduced ? ' league-victory--reduced' : ''}`} style={{ '--tone': color }} role="dialog" aria-modal="true" aria-labelledby="league-victory-title">
      <div className="league-victory-backdrop" onClick={onClose} />
      <div className="league-victory-content">
        <div className="league-victory-stage" aria-hidden="true">
          <div className="league-victory-glow" />
          {champion && !reduced && (
            <>
              <span className="league-victory-ring" />
              {particles.map((particle, index) => (
                <span
                  key={index}
                  className={`league-victory-particle${particle.white ? ' league-victory-particle--white' : ''}`}
                  style={{ '--dx': `${particle.dx}px`, '--dy': `${particle.dy}px`, '--size': `${particle.size}px` }}
                />
              ))}
            </>
          )}
          <span className="league-victory-icon">{champion ? '🏆' : medal.emoji}</span>
        </div>

        <div className="league-victory-texts">
          <h2 id="league-victory-title" className="league-victory-title">{title}</h2>
          <span className="league-victory-reward">{t('league.win_reward', { count: result.reward })}</span>
          {champion && <span className="league-victory-champion">{t('league.win_champion')}</span>}
          <small>{t('league.last_rank', { rank: result.rank, points: result.points })}</small>
        </div>

        <div className="league-victory-buttons">
          <button
            type="button"
            className="league-victory-cta"
            ref={ctaRef}
            onClick={() => {
              onClose()
              navigate('/league')
            }}
          >
            {t('league.win_cta')}
          </button>
          <button type="button" className="league-victory-close" ref={closeRef} onClick={onClose}>
            {t('league.win_close')}
          </button>
        </div>
      </div>
    </div>
  )
}
