import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LEGAL_PATHS } from '../legal/legalInfo'
import './LegalLinks.css'

// Links to the legal pages, at the bottom of the home, account and legal pages.
export default function LegalLinks() {
  const { t } = useTranslation()
  return (
    <footer className="legal-links">
      <Link to={LEGAL_PATHS.privacy}>{t('legal.privacy')}</Link>
      <Link to={LEGAL_PATHS.terms}>{t('legal.terms')}</Link>
      <Link to={LEGAL_PATHS.legal}>{t('legal.legal')}</Link>
      <Link to={LEGAL_PATHS.deleteAccount}>{t('legal.delete_account')}</Link>
    </footer>
  )
}
