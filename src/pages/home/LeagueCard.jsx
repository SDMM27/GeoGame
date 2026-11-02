// Home page: where the player stands in the weekly league (rank, points, gap to the next), what last week paid when
// they aren't ranked yet, or an invitation. Links to the League page.
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { useLeague } from '../../hooks/useLeague'
import './LeagueCard.css'

function Card({ children }) {
  const { t } = useTranslation()
  return (
    <Link to="/league" className="league-home-card">
      <span className="home-icon" aria-hidden="true">🏅</span>
      <span className="league-home-text">
        <strong>{t('league.card_title')}</strong>
        {children}
      </span>
      <span className="league-home-arrow" aria-hidden="true">›</span>
    </Link>
  )
}

function PlayerCard({ uid }) {
  const { t } = useTranslation()
  const { me, lastResult } = useLeague(uid)
  if (me) {
    return (
      <Card>
        <span>{t('league.me_rank', { rank: me.rank })} · {me.points} {t('units.pts')}</span>
        <small>{me.ahead ? t('league.me_gap', { gap: me.ahead.gap, name: me.ahead.name }) : t('league.me_leader')}</small>
      </Card>
    )
  }
  return (
    <Card>
      {lastResult?.reward > 0 && <span>{t('league.card_last', { count: lastResult.reward })}</span>}
      <small>{t('league.card_play')}</small>
    </Card>
  )
}

export default function LeagueCard() {
  const { t } = useTranslation()
  const { account } = useAccount()
  if (!account?.username) {
    return (
      <Card>
        <small>{t('league.card_cta')}</small>
      </Card>
    )
  }
  return <PlayerCard uid={account.uid} />
}
