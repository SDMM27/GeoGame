import React from 'react'
import ReactDOM from 'react-dom/client'
// Inter served by the site itself rather than Google Fonts, which would see every visitor's IP address.
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/900.css'
import './index.css'
import './i18n/index.js'
import App from './App'
import { redirectIphoneToApp } from './utils/appLinks'

if (!redirectIphoneToApp()) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
