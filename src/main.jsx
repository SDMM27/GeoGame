import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n/index.js'
import App from './App'
import { redirectIphoneToApp } from './utils/appLinks'
import { initSentry } from './sentry'

initSentry()

if (!redirectIphoneToApp()) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
