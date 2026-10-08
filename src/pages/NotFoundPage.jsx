import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import './NotFoundPage.css'

// Any URL that matches no route.
export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="not-found-page">
      <NavBar />
      <main className="not-found">
        <p className="not-found__code" aria-hidden="true">404</p>
        <h1 className="not-found__title">{t('not_found.title')}</h1>
        <p className="not-found__message">{t('not_found.message')}</p>
        <Link to="/" className="not-found__home">{t('not_found.home')}</Link>
      </main>
    </div>
  )
}
