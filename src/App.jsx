import { useCallback, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { BarChart3, Plus, Settings as SettingsIcon, Sparkles, UtensilsCrossed } from 'lucide-react'
import { getSettings } from './db'
import { FeedbackProvider } from './components/Feedback'
import { PlacesPage } from './pages/PlacesPage'
import { WishlistPage } from './pages/WishlistPage'
import { PlaceDetailPage } from './pages/PlaceDetailPage'
import { VisitFormPage } from './pages/VisitFormPage'
import { PlaceFormPage } from './pages/PlaceFormPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingPage } from './pages/OnboardingPage'

const TABS = [
  { id: 'places', label: 'Lugares', Icon: UtensilsCrossed },
  { id: 'wishlist', label: 'Quero ir', Icon: Sparkles },
  { id: '_fab' },
  { id: 'dashboard', label: 'Números', Icon: BarChart3 },
  { id: 'settings', label: 'Ajustes', Icon: SettingsIcon },
]

const PAGES = {
  places: PlacesPage,
  wishlist: WishlistPage,
  dashboard: DashboardPage,
  settings: SettingsPage,
  'place-detail': PlaceDetailPage,
  'visit-form': VisitFormPage,
  'place-form': PlaceFormPage,
}

const RAIZES = ['places', 'wishlist', 'dashboard', 'settings']

export default function App() {
  const [settings, setSettings] = useState(undefined) // undefined = carregando, null = onboarding
  const [stack, setStack] = useState([{ page: 'places', params: {}, key: 0 }])

  const reloadSettings = useCallback(async () => setSettings(await getSettings()), [])
  useEffect(() => { reloadSettings() }, [reloadSettings])

  const nav = useMemo(() => ({
    push: (page, params = {}) => setStack(s => [...s, { page, params, key: s.at(-1).key + 1 }]),
    pop: () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    goTab: page => setStack([{ page, params: {}, key: Math.random() }]),
  }), [])

  // Botão voltar do Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('backButton', () => {
      setStack(s => {
        if (s.length > 1) return s.slice(0, -1)
        CapApp.exitApp()
        return s
      })
    })
    return () => { sub.then(h => h.remove()) }
  }, [])

  if (settings === undefined) return null
  if (settings === null || !settings.nomes?.p1) {
    return (
      <FeedbackProvider>
        <div className="app"><OnboardingPage onDone={reloadSettings} /></div>
      </FeedbackProvider>
    )
  }

  const atual = stack.at(-1)
  const Page = PAGES[atual.page]
  const naRaiz = RAIZES.includes(atual.page)

  return (
    <FeedbackProvider>
      <div className="app">
        <Page key={atual.key} nav={nav} params={atual.params}
          settings={settings} reloadSettings={reloadSettings} />

        {naRaiz && (
          <nav className="tabbar">
            {TABS.map(t =>
              t.id === '_fab' ? (
                <button key="fab" className="fab" aria-label="Nova visita"
                  onClick={() => nav.push('visit-form')}>
                  <Plus size={27} strokeWidth={2.6} />
                </button>
              ) : (
                <button key={t.id} className={`tab${atual.page === t.id ? ' on' : ''}`}
                  onClick={() => nav.goTab(t.id)}>
                  <t.Icon size={21} strokeWidth={atual.page === t.id ? 2.4 : 2} />
                  {t.label}
                </button>
              )
            )}
          </nav>
        )}
      </div>
    </FeedbackProvider>
  )
}
