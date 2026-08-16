import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App'
import './theme.css'

if (Capacitor.isNativePlatform()) {
  StatusBar.setBackgroundColor({ color: '#f4f7fb' }).catch(() => {})
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
} else {
  // PWA: service worker p/ funcionar offline no navegador/iPhone
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
