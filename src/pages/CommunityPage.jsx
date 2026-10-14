// Community: the players who chose to be listed, newest first, to add as friends without knowing their username.
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import FriendCandidates from '../components/profile/FriendCandidates'
import { useAccount } from '../auth'
import { useCommunityList, useMembership, useWeeklyTop } from '../hooks/useCommunity'
import { useFriendships } from '../hooks/usePlayerProfile'
import './AccountPage.css'
import './CommunityPage.css'

function Membership({ account, onChange }) {
  const { t } = useTranslation()
  const membership = useMembership(account.uid, onChange)
  if (membership.listed == null) return null

  return (
    <div className="community-join">
      {membership.listed ? (
        <>
          <strong>✓ {t('community.listed')}</strong>
          <button type="button" className="friends-btn" disabled={membership.busy} onClick={membership.leave}>
            {t('community.leave')}
          </button>
        </>
      ) : (
        <>
          <div>
            <strong>{t('community.join_title')}</strong>
            <p className="profile-muted">{t('community.join_hint')}</p>
          </div>
          <button type="button" className="friends-btn friends-btn--primary" disabled={membership.busy} onClick={membership.join}>
            {t('community.join')}
          </button>
        </>
      )}
      {membership.error && <p className="account-error">{t('friends.errors.generic')}</p>}
    </div>
  )
}

export default function CommunityPage() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const community = useCommunityList()
  const [message, setMessage] = useState(null)
  const weekly = useWeeklyTop()
  const top = weekly.entries.map((entry, index) => ({
    uid: entry.uid,
    name: entry.name,
    rank: index + 1,
    detail: `${entry.points} ${t('units.pts')}`,
  }))
  const players = community.members.map((member) => ({ uid: member.uid, name: member.username, badges: member.badges }))

  return (
    <div className="account-page">
      <NavBar />
      <main className="account-main account-main--wide">
        <header className="community-header">
          <h1 className="account-title">{t('community.title')}</h1>
          <p className="account-pitch">{t('community.intro')}</p>
        </header>

        {account?.username ? (
          <Membership account={account} onChange={community.reload} />
        ) : (
          <p className="profile-muted">
            {t('community.need_account')} <Link to="/account">{t('friends.add_page.login_button')}</Link>
          </p>
        )}

        <section className="profile-section">
          <div className="profile-section-title">
            <h2>{t('community.weekly_title')}</h2>
          </div>
          <p className="profile-muted">{t('community.weekly_hint')}</p>
          <FriendCandidates players={top} account={account} friendships={friendships} onMessage={setMessage} />
          {!weekly.loading && top.length === 0 && <p className="profile-muted">{t('community.weekly_empty')}</p>}
        </section>

        <section className="profile-section">
          <div className="profile-section-title">
            <h2>{t('community.members_title')}</h2>
          </div>
          {message && <p className={message.kind === 'error' ? 'account-error' : 'account-notice'}>{message.text}</p>}
          <FriendCandidates players={players} account={account} friendships={friendships} onMessage={setMessage} />
          {!community.loading && !community.error && players.length === 0 && <p className="profile-muted">{t('community.empty')}</p>}
          {community.error && (
            <p className="account-error">
              {t('community.error')}{' '}
              <button type="button" className="account-link" aria-label={t('friends.errors.generic')} onClick={community.reload}>
                ↻
              </button>
            </p>
          )}
          {!community.done && !community.error && players.length > 0 && (
            <button type="button" className="friends-btn community-more" disabled={community.loading} onClick={community.loadMore}>
              {t('community.more')}
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
