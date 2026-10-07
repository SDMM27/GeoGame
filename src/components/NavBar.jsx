// src/components/NavBar.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../auth'
import './NavBar.css'

const LANGUAGES = ['fr', 'en', 'ru']

export default function NavBar() {
  const { t, i18n } = useTranslation()
  const { account } = useAccount()
  const current = LANGUAGES.includes(i18n.language) ? i18n.language : 'fr'

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src="/logo.png" alt="GeoGame" className="navbar-logo-img" />
      </Link>
      <Link to="/account" className={`navbar-account${account ? ' signed-in' : ''}`}>
        {account?.username ?? t('account.nav')}
      </Link>
      <div className="navbar-lang-group">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className={`navbar-lang-btn${current === lang ? ' active' : ''}`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  )
}
