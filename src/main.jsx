import React from 'react'
import ReactDOM from 'react-dom/client'
// Inter and Bricolage Grotesque (the app's fonts) served by the site itself rather than Google Fonts, which would see
// every visitor's IP address.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/900.css'
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import './index.css'
import { i18nReady } from './i18n/index.js'
import App from './App'
import { redirectIphoneToApp } from './utils/appLinks'

// Rendered once the player's language is loaded (only languages other than French and English take a request).
// A failed load still renders: missing strings fall back to English.
if (!redirectIphoneToApp()) {
  const render = () =>
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  i18nReady.then(render, render)
}
