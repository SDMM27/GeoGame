import React from 'react'
import i18n from 'i18next'
import './RouteFallback.css'

// Catches the failure of a lazily loaded page or of its data (offline, stale chunk after a deploy...).
export default class RouteErrorBoundary extends React.Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="route-fallback" role="alert">
        <span>{i18n.t('messages.page_load_error')}</span>
        <button type="button" className="route-fallback__retry" onClick={() => window.location.reload()}>
          {i18n.t('messages.reload')}
        </button>
      </div>
    )
  }
}
