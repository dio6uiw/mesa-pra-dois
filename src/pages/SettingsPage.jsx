import { useRef, useState } from 'react'
import { Download, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { db, saveSettings } from '../db'
import { parseDecimal } from '../logic'
import { apagarTudo, carregarExemplo, exportarBackup, importarBackup } from '../backup'
import { useFeedback } from '../components/Feedback'

export function SettingsPage({ settings, reloadSettings }) {
  const { showToast, ask } = useFeedback()
  const fileRef = useRef(null)
  const [nomes, setNomes] = useState(settings.nomes)
  const [pedirMax, setPedirMax] = useState(String(settings.tiers.pedirMax))
  const [legalMax, setLegalMax] = useState(String(settings.tiers.legalMax))
  const [novoTipo, setNovoTipo] = useState('')
  const [placesKey, setPlacesKey] = useState(settings.placesKey || '')

  async function salvarPerfil() {
    const t1 = parseDecimal(pedirMax) ?? 50
    const t2 = parseDecimal(legalMax) ?? 130
    await saveSettings({
      ...settings,
      nomes: { p1: nomes.p1.trim() || 'Eu', p2: nomes.p2.trim() || 'Par' },
      tiers: { pedirMax: t1, legalMax: Math.max(t2, t1 + 1) },
      placesKey: placesKey.trim(),
    })
    await reloadSettings()
    showToast('Ajustes salvos!')
  }

  async function addTipo() {
    const label = novoTipo.trim()
    if (!label) return
    const id = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '-')
    if (settings.tipos.some(t => t.id === id)) { showToast('Esse tipo já existe'); return }
    await saveSettings({ ...settings, tipos: [...settings.tipos, { id, emoji: '🍴', label }] })
    await reloadSettings()
    setNovoTipo('')
  }

  async function removeTipo(id) {
    const emUso = await db.places.where('tipo').equals(id).count()
    if (emUso) { showToast(`Tem ${emUso} ${emUso === 1 ? 'lugar usando' : 'lugares usando'} esse tipo`); return }
    await saveSettings({ ...settings, tipos: settings.tipos.filter(t => t.id !== id) })
    await reloadSettings()
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = await file.text()
      const substituir = await ask({
        titulo: 'Como importar?',
        texto: 'Confirmar SUBSTITUI tudo pelo backup. Cancelar e escolher de novo se quiser mesclar (a opção aparece em seguida).',
        okLabel: 'Substituir tudo', danger: true,
      })
      if (substituir) {
        const r = await importarBackup(json, 'substituir')
        showToast(`Importado: ${r.lugares} lugares, ${r.visitas} visitas`)
      } else {
        const mesclar = await ask({
          titulo: 'Mesclar com os dados atuais?',
          texto: 'Lugares e visitas novos do backup entram; nada do que já existe é apagado.',
          okLabel: 'Mesclar',
        })
        if (!mesclar) return
        const r = await importarBackup(json, 'mesclar')
        showToast(`Mesclado: +${r.lugares} lugares, +${r.visitas} visitas`)
      }
      await reloadSettings()
    } catch (err) {
      showToast('Não deu: ' + err.message, <X size={18} color="var(--danger)" />)
    }
  }

  return (
    <div className="page">
      <div className="page-title">Ajustes ⚙️</div>
      <div className="page-sub">O app do jeitinho de vocês</div>

      <div className="card">
        <div className="card-label">O casal</div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Pessoa 1</label>
            <input className="input" value={nomes.p1} onChange={e => setNomes({ ...nomes, p1: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Pessoa 2</label>
            <input className="input" value={nomes.p2} onChange={e => setNomes({ ...nomes, p2: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card mt12">
        <div className="card-label">Faixas de preço (R$ por pessoa)</div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>🛵 Só pra pedir: até</label>
            <input className="input" inputMode="decimal" value={pedirMax} onChange={e => setPedirMax(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>😎 Lugar legal: até</label>
            <input className="input" inputMode="decimal" value={legalMax} onChange={e => setLegalMax(e.target.value)} />
          </div>
        </div>
        <div className="muted mt8" style={{ fontSize: 12.5 }}>Acima disso, ✨ lugar chique. O tier de cada lugar sai da média de preço das visitas.</div>
      </div>

      <div className="card mt12">
        <div className="card-label">Aparência</div>
        <div className="seg" style={{ marginBottom: 0 }}>
          {[['claro', '☀️ Claro'], ['escuro', '🌙 Escuro'], ['auto', 'Automático']].map(([id, label]) => (
            <button key={id} className={(settings.tema || 'claro') === id ? 'on' : ''}
              onClick={async () => {
                await saveSettings({ ...settings, tema: id })
                await reloadSettings()
              }}>
              {label}
            </button>
          ))}
        </div>
        <div className="muted mt8" style={{ fontSize: 12.5 }}>
          No automático, o app segue o tema do celular — escuro à noite, claro de dia.
        </div>
      </div>

      <div className="card mt12">
        <div className="card-label">Descobrir · chave Google Places</div>
        <input className="input" placeholder="Usando a chave padrão do app" value={placesKey}
          onChange={e => setPlacesKey(e.target.value)} />
        <div className="muted mt8" style={{ fontSize: 12.5 }}>
          O app já vem com uma chave padrão — preencha só se quiser usar outra neste aparelho.
        </div>
      </div>

      <button className="btn primary mt12" onClick={salvarPerfil}>Salvar ajustes</button>

      <div className="card mt16">
        <div className="card-label">Tipos de comida</div>
        <div className="chip-row">
          {settings.tipos.map(t => (
            <span key={t.id} className="chip">
              {t.emoji} {t.label}
              <button onClick={() => removeTipo(t.id)} style={{ display: 'grid' }}><X size={13} /></button>
            </span>
          ))}
        </div>
        <div className="row mt12" style={{ gap: 8 }}>
          <input className="input" placeholder="Novo tipo…" value={novoTipo}
            onChange={e => setNovoTipo(e.target.value)} style={{ flex: 1 }} />
          <button className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
            onClick={addTipo}><Plus size={19} /></button>
        </div>
      </div>

      <div className="card mt16">
        <div className="card-label">Backup</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Exporta um arquivo com tudo — manda no WhatsApp pra guardar ou pra importar no outro celular.
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => exportarBackup().catch(() => {})}>
            <Upload size={17} /> Exportar
          </button>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
            <Download size={17} /> Importar
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
        </div>
      </div>

      <div className="card mt12">
        <div className="card-label">Dados</div>
        <button className="btn ghost" onClick={async () => {
          await carregarExemplo()
          showToast('Dados de exemplo carregados!', <Sparkles size={18} color="var(--star)" />)
        }}>
          <Sparkles size={17} /> Carregar dados de exemplo
        </button>
        <button className="btn danger mt8" onClick={async () => {
          const ok = await ask({
            titulo: 'Apagar tudo?', texto: 'Todos os lugares e visitas serão apagados. Exporte um backup antes, se quiser.',
            okLabel: 'Apagar tudo', danger: true,
          })
          if (ok) { await apagarTudo(); showToast('Dados apagados') }
        }}>
          <Trash2 size={17} /> Apagar todos os dados
        </button>
      </div>

      <div className="muted mt16" style={{ textAlign: 'center', fontSize: 12 }}>
        Mesa pra Dois v1.0 · feito com ❤️ e 🍝
      </div>
    </div>
  )
}
