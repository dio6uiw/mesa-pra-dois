import { useState } from 'react'
import { SETTINGS_DEFAULT, saveSettings } from '../db'

export function OnboardingPage({ onDone }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  async function comecar() {
    await saveSettings({ ...SETTINGS_DEFAULT, nomes: { p1: p1.trim(), p2: p2.trim() } })
    onDone()
  }

  return (
    <div className="page no-tabbar" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div style={{ fontSize: 62 }}>🍽️</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 10 }}>Mesa pra Dois</div>
        <div className="muted mt8" style={{ fontSize: 14.5, lineHeight: 1.5 }}>
          O diário gastronômico do casal.<br />Avaliem juntos cada restaurante que visitarem.
        </div>
      </div>

      <div className="card">
        <div className="card-label">Quem senta à mesa?</div>
        <div className="field">
          <label>Seu nome</label>
          <input className="input" placeholder="Ex.: Diogo" value={p1} onChange={e => setP1(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>O nome do seu amor</label>
          <input className="input" placeholder="Ex.: Maria" value={p2} onChange={e => setP2(e.target.value)} />
        </div>
      </div>

      <button className="btn primary mt16" disabled={!p1.trim() || !p2.trim()} onClick={comecar}>
        Começar 🥂
      </button>
    </div>
  )
}
