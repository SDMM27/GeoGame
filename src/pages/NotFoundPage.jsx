import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import './NotFoundPage.css'

// Any URL that matches no route: a cancelled flight.
export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="not-found-page">
      <NavBar />
      <main className="not-found">
        <div className="not-found__ticket gg-ticket">
          <div className="not-found__main">
            <p className="gg-kicker not-found__kicker">{t('not_found.title')}</p>
            <h1 className="gg-title not-found__title">{t('not_found.cancelled')}</h1>
            <p className="not-found__message">{t('not_found.message')}</p>
            <Link to="/" className="not-found__home">{t('not_found.home')}</Link>
          </div>
          <div className="gg-ticket-stub not-found__stub">
            <span className="gg-field"><small>{t('not_found.flight')}</small><strong>GG 404</strong></span>
            <span className="gg-field"><small>{t('not_found.gate')}</small><strong>404</strong></span>
            <span className="gg-field"><small>{t('not_found.status')}</small><strong className="not-found__status">{t('not_found.status_cancelled')}</strong></span>
            <span className="gg-stamp sd-stamp not-found__stamp" aria-hidden="true">{t('not_found.status_cancelled')}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
