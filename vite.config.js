import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registro manual no main.jsx (só fora do Capacitor)
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Mesa pra Dois',
        short_name: 'Mesa pra Dois',
        description: 'Diário gastronômico do casal',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#f4f7fb',
        theme_color: '#f4f7fb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
    }),
  ],
  base: './',
  server: { host: true, port: 5199 },
})
