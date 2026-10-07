import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { compareToChallenge, isAttemptsGame, parseChallenge } from '../utils/challenge'
import './ChallengeBanner.css'

// Bandeau affiché quand la page est ouverte depuis un lien de défi.
// `result` ({ score, solved }) : à fournir une fois la partie terminée pour afficher la comparaison.
export default function ChallengeBanner({ gameType, dailyKey, result }) {
  const { t } = useTranslation()
  const location = useLocation()
  const challenge = parseChallenge(location.search)
  if (!challenge) return null

  const name = challenge.challenger ?? t('challenge.a_friend')
  const isStale = Boolean(challenge.day && dailyKey && challenge.day !== dailyKey)

  const formatScore = ({ score, solved }) => {
    if (!isAttemptsGame(gameType)) return t('challenge.points', { score })
    return solved ? t('challenge.attempts', { count: score }) : t('challenge.not_found')
  }

  const outcome = result && !isStale ? compareToChallenge(gameType, result, challenge) : null

  return (
    <div className={`challenge-banner${outcome ? ` challenge-banner--${outcome}` : ''}`} role="status">
      {outcome ? (
        <>
          <p className="challenge-banner__title">{t(`challenge.result_${outcome}`, { name })}</p>
          <p className="challenge-banner__scores">
            {t('challenge.your_score', { score: formatScore(result) })}
            {' · '}
            {t('challenge.their_score', { name, score: formatScore(challenge) })}
          </p>
        </>
      ) : (
        <>
          <p className="challenge-banner__title">{t('challenge.banner_title', { name })}</p>
          <p className="challenge-banner__scores">
            {t('challenge.their_score', { name, score: formatScore(challenge) })}
            {!isStale && !result && ` — ${t('challenge.your_turn')}`}
          </p>
        </>
      )}
      {isStale && <p className="challenge-banner__note">{t('challenge.stale', { day: challenge.day })}</p>}
    </div>
  )
}
