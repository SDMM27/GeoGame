// src/components/NavBar.jsx
// The site's main navigation, the same four sections as the app's tabs: Play, Multi, Rankings, Profile.
// Wide screens: in the top bar. Phones: a tab bar at the bottom, hidden while a game is played.
import React from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import { LANGUAGES, toLanguage } from '../i18n/languages'
import { isGamePath } from '../utils/gamePaths'
import { LeaderboardIcon, MultiIcon, PlayIcon, ProfileIcon } from './NavIcons'
import './NavBar.css'

const TABS = [
  { to: '/', labelKey: 'nav.play', Icon: PlayIcon, end: true },
  { to: '/multiplayer', labelKey: 'nav.multiplayer', Icon: MultiIcon },
  { to: '/scores', labelKey: 'nav.leaderboards', Icon: LeaderboardIcon },
  { to: '/account', labelKey: 'nav.profile', Icon: ProfileIcon },
]

export default function NavBar() {
  const { t, i18n } = useTranslation()
  const { account } = useAccount()
  const { pathname } = useLocation()
  const current = toLanguage(i18n.resolvedLanguage ?? i18n.language)
  const inGame = isGamePath(pathname)
  // Pending friend requests show on the Profile tab, so they are seen from any page
  const { incoming } = useFriendships(account?.uid ?? null)

  return (
    <header className="navbar">
      <Link to="/" className="navbar-logo">
        <img src="/logo.png" alt="" className="navbar-logo-img" />
        <span className="navbar-logo-name">GeoGame</span>
      </Link>
      <nav className={`navbar-tabs${inGame ? ' navbar-tabs--in-game' : ''}`} aria-label={t('nav.main')}>
        {TABS.map(({ to, labelKey, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `navbar-tab${isActive || (end && inGame) ? ' active' : ''}`}>
            <Icon />
            <span className="navbar-tab-label">
              {to === '/account' && account?.username ? account.username : t(labelKey)}
            </span>
            {to === '/account' && account && <span className="navbar-signed-in" aria-hidden="true" />}
            {to === '/account' && incoming.length > 0 && (
              <span className="navbar-requests" title={t('friends.requests_title')} aria-label={`${t('friends.requests_title')} (${incoming.length})`}>
                {incoming.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <label className="navbar-lang" title={t('nav.language')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span aria-hidden="true">{current.toUpperCase()}</span>
        <select
          className="navbar-lang-select"
          value={current}
          onChange={(event) => i18n.changeLanguage(event.target.value)}
          aria-label={t('nav.language')}
        >
          {LANGUAGES.map(({ code, label }) => (
            <option key={code} value={code} lang={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </header>
  )
}
