import React from 'react'
import * as Sentry from '@sentry/react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './RouteFallback.css'

function ErrorScreen() {
  const { t } = useTranslation()
  return (
    <div className="route-fallback route-fallback--error" role="alert">
      <h1 className="route-fallback__title">{t('errors.title')}</h1>
      <p className="route-fallback__message">{t('errors.message')}</p>
      <div className="route-fallback__actions">
        <button type="button" className="route-fallback__retry" onClick={() => window.location.reload()}>
          {t('messages.reload')}
        </button>
        {/* A plain link: a full load also recovers from a broken router or a stale chunk. */}
        <a className="route-fallback__retry route-fallback__retry--secondary" href="/">
          {t('errors.home')}
        </a>
      </div>
    </div>
  )
}

// Catches the failure of a page, of a lazily loaded page or of its data (offline, stale chunk after a deploy...).
// The error clears when `resetKey` changes (the route boundary passes the current path).
export class ErrorBoundary extends React.Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error(error)
    // Caught here, the error never reaches Sentry's global handler (no-op without VITE_SENTRY_DSN)
    Sentry.captureException(error, { contexts: { react: { componentStack: info?.componentStack } } })
  }

  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children
  }
}

// Around the routes (inside the router): moving to another page leaves the error screen.
export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}
