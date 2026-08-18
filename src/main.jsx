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
    .then(({ registerSW }) => registerSW({
      immediate: true,
      onRegisteredSW(_url, reg) {
        // iOS demora a checar sozinho: confere nova versao quando o app volta ao foco
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg?.update?.()
        })
      },
    }))
    .catch(() => {})

  // Evita que o iOS descarte os dados apos dias sem abrir o app
  navigator.storage?.persist?.().catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
