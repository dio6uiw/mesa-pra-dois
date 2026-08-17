import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Geolocation } from '@capacitor/geolocation'
import { ArrowLeft, Check, Compass, ExternalLink, LoaderCircle, MapPin, Plus, Search, Star, X } from 'lucide-react'
import { db, saveSettings } from '../db'
import { buscarPorCidade, buscarPorRaio, chaveEfetiva } from '../places'
import { tierPorId } from '../logic'
import { FotoThumb, TierTag } from '../components/Badges'
import { EmptyState } from '../components/EmptyState'
import { useFeedback } from '../components/Feedback'

const RAIOS = [1, 3, 5, 10, 20]

function SetupChave({ settings, reloadSettings, showToast }) {
  const [chave, setChave] = useState('')
  return (
    <div className="card">
      <div className="card-label">🔑 Falta só a chave do Google</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
        A busca usa a <b>Google Places API</b> (dados do Google Maps: notas, preço, aberto agora).
        Criar a chave leva uns 5 minutos e o uso do casal fica na cota gratuita:
        <ol style={{ margin: '10px 0 10px 18px', display: 'grid', gap: 6 }}>
          <li>Acesse <b>console.cloud.google.com</b> e crie um projeto</li>
          <li>Ative a <b>Places API (New)</b> e o faturamento (pede cartão, mas o uso pessoal não chega perto da cota paga)</li>
          <li>Em <b>APIs e serviços → Credenciais</b>, crie uma <b>chave de API</b> e restrinja à Places API (New)</li>
          <li>Cole a chave aqui embaixo</li>
        </ol>
        A chave fica salva <b>só neste aparelho</b> e nunca vai para o site público. Ela vai junto no
        arquivo de backup (prático para levar ao celular do par) — só evitem mandar o backup para outras pessoas.
      </div>
      <div className="row mt12" style={{ gap: 8 }}>
        <input className="input" placeholder="Cole a chave (AIza…)" value={chave}
          onChange={e => setChave(e.target.value)} style={{ flex: 1 }} />
        <button className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
          onClick={async () => {
            if (!chave.trim().startsWith('AIza')) { showToast('Isso não parece uma chave do Google'); return }
            await saveSettings({ ...settings, placesKey: chave.trim() })
            await reloadSettings()
            showToast('Chave salva neste aparelho!')
          }}>
          <Check size={19} />
        </button>
      </div>
    </div>
  )
}

function DetalheSheet({ r, tipos, jaExiste, onAdd, onClose }) {
  const [idx, setIdx] = useState(0)
  const emoji = tipos.find(t => t.id === r.tipo)?.emoji

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet sheet-detalhe" onClick={e => e.stopPropagation()}>
        <div className="spread" style={{ marginBottom: 10 }}>
          <div className="t" style={{ margin: 0 }}>{r.nome}</div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {r.fotos.length > 0 ? (
          <>
            <div className="galeria"
              onScroll={e => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              {r.fotos.map((f, i) => (
                <img key={i} src={f.url} alt="" loading="lazy"
                  onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
              ))}
            </div>
            {r.fotos.length > 1 && (
              <div className="galeria-dots">
                {r.fotos.map((_, i) => <span key={i} className={i === idx ? 'on' : ''} />)}
              </div>
            )}
            {r.fotos[idx]?.autor && <div className="galeria-autor">📷 {r.fotos[idx].autor}</div>}
          </>
        ) : (
          <div className="thumb" style={{ width: '100%', height: 140, fontSize: 52, marginBottom: 10 }}>
            <span>{emoji || '🍽️'}</span>
          </div>
        )}

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {r.nota != null && (
            <span className="row" style={{ gap: 4, fontSize: 15, fontWeight: 800, color: 'var(--star-ink)' }}>
              <Star size={15} fill="var(--star)" stroke="var(--star)" />
              {r.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              <span className="muted" style={{ fontWeight: 600, fontSize: 12.5 }}>
                ({r.avaliacoes.toLocaleString('pt-BR')} avaliações)
              </span>
            </span>
          )}
          {r.abertoAgora != null && (
            <span className="badge" style={r.abertoAgora
              ? { color: 'var(--good)', borderColor: 'var(--good)' } : { color: 'var(--muted)' }}>
              {r.abertoAgora ? '● Aberto agora' : '○ Fechado agora'}
            </span>
          )}
        </div>
        <div className="chip-row" style={{ marginTop: 8 }}>
          {r.tipoGoogle && <span className="badge">{emoji} {r.tipoGoogle}</span>}
          {r.cifra && <span className="badge">{r.cifra}</span>}
          <TierTag tier={tierPorId(r.tierPrevisto)} />
          {r.distanciaKm != null && (
            <span className="badge">
              {r.distanciaKm < 1 ? `${Math.round(r.distanciaKm * 1000)} m` : `${r.distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`} daqui
            </span>
          )}
        </div>
        {r.endereco && <div className="muted mt8" style={{ fontSize: 13 }}>{r.endereco}</div>}

        <div className="row mt16" style={{ gap: 8 }}>
          {jaExiste ? (
            <div className="btn ghost" style={{ flex: 1, color: 'var(--good)' }}>
              <Check size={17} /> Já está na lista
            </div>
          ) : (
            <button className="btn primary" style={{ flex: 1 }} onClick={() => onAdd(r)}>
              <Plus size={18} /> Quero ir
            </button>
          )}
          {r.mapsUrl && (
            <a className="btn ghost" style={{ flex: 1, textDecoration: 'none' }}
              href={r.mapsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export function DescobrirPage({ nav, settings, reloadSettings }) {
  const { showToast } = useFeedback()
  const places = useLiveQuery(() => db.places.toArray(), []) || []

  const [modo, setModo] = useState('gps') // gps | cidade
  const [cidade, setCidade] = useState('')
  const [raio, setRaio] = useState(5)
  const [tipoSel, setTipoSel] = useState(null)
  const [soAbertos, setSoAbertos] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState(null)
  const [resultados, setResultados] = useState(null)
  const [detalhe, setDetalhe] = useState(null)

  const jaTenho = useMemo(
    () => new Set(places.map(p => p.nome.trim().toLowerCase())),
    [places]
  )

  const chave = chaveEfetiva(settings)
  const temChave = !!chave

  async function buscar() {
    setErro(null)
    setBuscando(true)
    setResultados(null)
    try {
      let rows
      if (modo === 'gps') {
        let pos
        try {
          pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 12000 })
        } catch {
          throw new Error('Não consegui pegar a localização — confere a permissão de localização do app')
        }
        rows = await buscarPorRaio(chave, pos.coords, raio * 1000, tipoSel)
      } else {
        if (!cidade.trim()) throw new Error('Digite a cidade')
        const tipoLabel = tipoSel ? settings.tipos.find(t => t.id === tipoSel)?.label : null
        rows = await buscarPorCidade(chave, cidade.trim(), tipoLabel)
      }
      setResultados(rows)
    } catch (e) {
      setErro(e.message)
    } finally {
      setBuscando(false)
    }
  }

  async function adicionar(r) {
    await db.places.add({
      nome: r.nome, tipo: r.tipo, tierPrevisto: r.tierPrevisto,
      endereco: r.endereco, fotoUrl: r.fotoUrl, wishlist: 1, criadoEm: new Date().toISOString(),
    })
    showToast(`${r.nome} entrou no Queremos ir!`)
  }

  const visiveis = (resultados || []).filter(r => !soAbertos || r.abertoAgora === true)

  return (
    <div className="page no-tabbar">
      <div className="stack-header">
        <button className="icon-btn" onClick={nav.pop}><ArrowLeft size={20} /></button>
        <div className="title">Descobrir por aí 🔎</div>
      </div>

      {!temChave ? (
        <SetupChave settings={settings} reloadSettings={reloadSettings} showToast={showToast} />
      ) : (
        <>
          <div className="card">
            <div className="seg" style={{ marginBottom: 12 }}>
              <button className={modo === 'gps' ? 'on' : ''} onClick={() => setModo('gps')}>
                <MapPin size={13} style={{ verticalAlign: -2 }} /> Perto de mim
              </button>
              <button className={modo === 'cidade' ? 'on' : ''} onClick={() => setModo('cidade')}>
                Por cidade
              </button>
            </div>

            {modo === 'gps' ? (
              <>
                <div className="card-label">Raio da busca</div>
                <div className="chip-row">
                  {RAIOS.map(r => (
                    <button key={r} className={`chip${raio === r ? ' on' : ''}`} onClick={() => setRaio(r)}>
                      {r} km
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="search" style={{ marginBottom: 0 }}>
                <Search size={16} />
                <input placeholder="Ex.: Mococa, SP" value={cidade} onChange={e => setCidade(e.target.value)} />
              </div>
            )}

            <div className="card-label" style={{ marginTop: 14 }}>Tipo (opcional)</div>
            <div className="chip-row scroll">
              {settings.tipos.filter(t => t.id !== 'outro').map(t => (
                <button key={t.id} className={`chip${tipoSel === t.id ? ' on' : ''}`}
                  onClick={() => setTipoSel(tipoSel === t.id ? null : t.id)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            <div className="spread" style={{ marginTop: 14 }}>
              <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-2)' }}>Só abertos agora</span>
              <button className={`toggle${soAbertos ? ' on' : ''}`} onClick={() => setSoAbertos(!soAbertos)} />
            </div>
          </div>

          <button className="btn primary mt12" disabled={buscando} onClick={buscar}>
            {buscando ? <LoaderCircle size={19} className="gira" /> : <Compass size={19} />}
            {buscando ? 'Procurando…' : 'Buscar restaurantes'}
          </button>

          {erro && (
            <div className="card mt12" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 13.5 }}>
              {erro}
            </div>
          )}

          {resultados && !visiveis.length && !erro && (
            <EmptyState emoji="🌵" titulo="Nada encontrado"
              texto={soAbertos ? 'Nenhum aberto agora com esses filtros — tenta desligar o "só abertos".' : 'Tenta aumentar o raio ou tirar o filtro de tipo.'} />
          )}

          {visiveis.map(r => {
            const existe = jaTenho.has(r.nome.trim().toLowerCase())
            return (
              <div key={r.googleId} className="place-card">
                <button className="row" style={{ flex: 1, minWidth: 0, textAlign: 'left', gap: 12 }}
                  onClick={() => setDetalhe(r)}>
                <FotoThumb src={r.fotoUrl} emoji={settings.tipos.find(t => t.id === r.tipo)?.emoji} size={72} />
                <div className="info" style={{ flex: 1 }}>
                  <div className="nome">{r.nome}</div>
                  <div className="row" style={{ gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                    {r.nota != null && (
                      <span className="row" style={{ gap: 4, fontSize: 13.5, fontWeight: 800, color: 'var(--star-ink)' }}>
                        <Star size={13} fill="var(--star)" stroke="var(--star)" />
                        {r.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                        <span className="muted" style={{ fontWeight: 600 }}>({r.avaliacoes.toLocaleString('pt-BR')})</span>
                      </span>
                    )}
                    {r.abertoAgora != null && (
                      <span className="badge" style={r.abertoAgora
                        ? { color: 'var(--good)', borderColor: 'var(--good)' }
                        : { color: 'var(--muted)' }}>
                        {r.abertoAgora ? '● Aberto' : '○ Fechado'}
                      </span>
                    )}
                    {r.distanciaKm != null && (
                      <span className="badge">{r.distanciaKm < 1 ? `${Math.round(r.distanciaKm * 1000)} m` : `${r.distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`}</span>
                    )}
                  </div>
                  <div className="meta">
                    {r.tipoGoogle && <span className="badge">{r.tipoGoogle}</span>}
                    {r.cifra && <span className="badge">{r.cifra}</span>}
                    <TierTag tier={tierPorId(r.tierPrevisto)} />
                  </div>
                  {r.endereco && <div className="sub">{r.endereco}</div>}
                </div>
                </button>
                {existe ? (
                  <span className="badge" style={{ color: 'var(--good)', borderColor: 'var(--good)' }}>✓ na lista</span>
                ) : (
                  <button className="icon-btn" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                    onClick={() => adicionar(r)}>
                    <Plus size={19} />
                  </button>
                )}
              </div>
            )
          })}

          {resultados && (
            <div className="muted mt12" style={{ textAlign: 'center', fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <ExternalLink size={11} /> Dados do Google Maps · ordenados por nota
            </div>
          )}

          {detalhe && (
            <DetalheSheet r={detalhe} tipos={settings.tipos}
              jaExiste={jaTenho.has(detalhe.nome.trim().toLowerCase())}
              onAdd={async r => { await adicionar(r); setDetalhe(null) }}
              onClose={() => setDetalhe(null)} />
          )}
        </>
      )}
    </div>
  )
}
