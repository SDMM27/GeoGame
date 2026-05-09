// src/components/NavBar.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './NavBar.css'

const LANGUAGES = ['fr', 'en', 'ru']

export default function NavBar() {
  const { i18n } = useTranslation()
  const current = LANGUAGES.includes(i18n.language) ? i18n.language : 'fr'

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        GEO<span className="navbar-logo-accent">GAME</span>
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
