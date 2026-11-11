// src/components/NavBar.jsx
// The site's main navigation, the same four sections as the app's tabs: Play, Multi, Rankings, Profile.
// Wide screens: in the top bar. Phones: a tab bar at the bottom, hidden while a game is played.
import React from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import { isGamePath } from '../utils/gamePaths'
import LanguageMenu from './LanguageMenu'
import { LeaderboardIcon, MultiIcon, PlayIcon, ProfileIcon } from './NavIcons'
import ThemeToggle from './theme/ThemeToggle'
import './NavBar.css'

const TABS = [
  { to: '/', labelKey: 'nav.play', Icon: PlayIcon, end: true },
  { to: '/multiplayer', labelKey: 'nav.multiplayer', Icon: MultiIcon },
  { to: '/scores', labelKey: 'nav.leaderboards', Icon: LeaderboardIcon },
  { to: '/account', labelKey: 'nav.profile', Icon: ProfileIcon },
]

export default function NavBar() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const { pathname } = useLocation()
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
      <LanguageMenu />
      <ThemeToggle />
    </header>
  )
}
