// Weekly league: the ranking of the week's daily games (Monday to Sunday), among friends and in the world, and what
// last week paid. Replaces the community directory; the server computes it once a day (api/_lib/weeklyTop.mjs).
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import FriendCandidates from '../components/profile/FriendCandidates'
import { useAccount } from '../auth'
import { useBadges } from '../hooks/useBadges'
import { useLeague } from '../hooks/useLeague'
import { useFriendships } from '../hooks/usePlayerProfile'
import { LEAGUE_MIN_PLAYED, LEAGUE_REWARDS } from '../utils/leagueRewards'
import './AccountPage.css'
import './LeaguePage.css'

function LastWeek({ result }) {
  const { t } = useTranslation()
  if (result.rank != null) {
    return (
      <div className="league-card league-last">
        <strong>{t('league.last_rank', { rank: result.rank, points: result.points })}</strong>
        {result.reward > 0 && <span className="league-reward">{t('league.last_reward', { count: result.reward })}</span>}
        {result.reward > 0 && (
          <span className="gg-stamp sd-stamp league-stamp" aria-hidden="true">
            {t('league.stamp_label')}
            <strong>+{result.reward}</strong>
          </span>
        )}
      </div>
    )
  }
  if (result.podium.length === 0) return null
  return <p className="profile-muted">{t('league.last_podium', { names: result.podium.map((player) => `${player.rank}. ${player.name}`).join(' · ') })}</p>
}

function Me({ account, me }) {
  const { t } = useTranslation()
  if (!account) {
    return (
      <div className="league-card">
        <p className="profile-muted">{t('league.need_account')}</p>
        <Link to="/account" className="friends-btn friends-btn--primary">{t('friends.add_page.login_button')}</Link>
      </div>
    )
  }
  if (!me) {
    return (
      <div className="league-card">
        <p className="profile-muted">{t('league.me_none')}</p>
        <Link to="/" className="friends-btn friends-btn--primary">{t('league.me_play')}</Link>
      </div>
    )
  }
  return (
    <div className="league-card league-me gg-ticket">
      <span className="league-me-rank">{t('league.me_rank', { rank: me.rank })}</span>
      <div className="league-me-text">
        <strong>{me.points} {t('units.pts')}</strong>
        <small>{t('league.me_played', { count: me.played })}</small>
      </div>
      <span className="league-me-gap gg-ticket-stub">{me.ahead ? t('league.me_gap', { gap: me.ahead.gap, name: me.ahead.name }) : t('league.me_leader')}</span>
    </div>
  )
}

export default function LeaguePage() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const league = useLeague(account?.username ? account.uid : null, friendships.friends, account?.username)
  const [chosen, setChosen] = useState(null)
  const [message, setMessage] = useState(null)
  const tab = chosen ?? (friendships.friends.length > 0 ? 'friends' : 'world')
  const shown = tab === 'friends' ? league.friendsBoard : league.world
  const badges = useBadges(shown.map((player) => player.uid))
  const players = shown.map((player) => ({
    uid: player.uid,
    name: player.name,
    rank: player.rank,
    detail: `${player.points} ${t('units.pts')}`,
    badges: badges[player.uid],
    // What the rank pays at the end of the week (the world board only: friends compete for pride)
    reward: tab === 'world' ? LEAGUE_REWARDS[player.rank] : undefined,
  }))

  return (
    <div className="account-page">
      <NavBar />
      <main className="account-main account-main--wide league-main">
        <header className="league-header">
          <p className="gg-kicker">{t('league.season')}</p>
          <h1 className="account-title gg-title">{t('league.title')}</h1>
          <p className="account-pitch">{t('league.intro')}</p>
          <p className="profile-muted">
            <strong className="gg-mono league-days">{t('league.days_left', { count: league.daysLeft })}</strong> · {t('league.updated_hint')}
          </p>
        </header>

        {league.lastResult && <LastWeek result={league.lastResult} />}

        <Me account={account?.username ? account : null} me={league.me} />

        <section className="profile-section">
          <div className="account-tabs" role="tablist">
            {['friends', 'world'].map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`account-tab gg-mono${tab === id ? ' active' : ''}`} onClick={() => setChosen(id)}>
                {t(`league.tab_${id}`)}
              </button>
            ))}
          </div>
          {message && <p className={message.kind === 'error' ? 'account-error' : 'account-notice'}>{message.text}</p>}
          <FriendCandidates players={players} account={account} friendships={friendships} onMessage={setMessage} />
          {tab === 'friends' && account?.username && friendships.friends.length === 0 && (
            <p className="profile-muted">
              {t('league.friends_empty')} <Link to="/account">{t('league.friends_link')}</Link>
            </p>
          )}
          {tab === 'world' && !league.loading && !league.error && players.length === 0 && <p className="profile-muted">{t('league.world_empty')}</p>}
          {league.error && (
            <p className="account-error">
              {t('league.error')}{' '}
              <button type="button" className="account-link" aria-label={t('friends.errors.generic')} onClick={league.reload}>
                ↻
              </button>
            </p>
          )}
        </section>

        <p className="profile-muted">
          {t('league.rewards', { first: LEAGUE_REWARDS[1], second: LEAGUE_REWARDS[2], third: LEAGUE_REWARDS[3], rest: LEAGUE_REWARDS[4], min: LEAGUE_MIN_PLAYED })}
        </p>
      </main>
    </div>
  )
}
