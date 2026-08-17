import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Dices } from 'lucide-react'
import { db } from '../db'
import { tierDoLugar, TIERS } from '../logic'
import { TierTag, TipoBadge } from '../components/Badges'
import { EmptyState } from '../components/EmptyState'

const CONFETE_CORES = ['#2a78d6', '#eb6834', '#f2a90d', '#2a9257', '#8a63d2']

function Confete() {
  const pecas = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.35,
    dur: 1.6 + Math.random() * 1.2,
    cor: CONFETE_CORES[i % CONFETE_CORES.length],
    rot: Math.random() * 360,
  })), [])
  return (
    <div className="confete">
      {pecas.map((p, i) => (
        <span key={i} style={{
          left: `${p.left}%`, background: p.cor,
          animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
          transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  )
}

export function SortearPage({ nav, settings }) {
  const places = useLiveQuery(() => db.places.toArray(), []) || []
  const visits = useLiveQuery(() => db.visits.toArray(), []) || []

  const [tiposSel, setTiposSel] = useState([])
  const [tiersSel, setTiersSel] = useState([])
  const [incluirVisitados, setIncluirVisitados] = useState(false)
  const [girando, setGirando] = useState(false)
  const [display, setDisplay] = useState(null)
  const [resultado, setResultado] = useState(null)
  const timer = useRef(null)
  const ultimoId = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const base = useMemo(() => {
    const visitadosIds = new Set(visits.map(v => v.placeId))
    return places.filter(p => p.wishlist === 1 || (incluirVisitados && visitadosIds.has(p.id)))
  }, [places, visits, incluirVisitados])

  const tiposNoPote = useMemo(
    () => settings.tipos.filter(t => base.some(p => p.tipo === t.id)),
    [settings.tipos, base]
  )

  const pote = useMemo(() => base.filter(p => {
    if (tiposSel.length && !tiposSel.includes(p.tipo)) return false
    if (tiersSel.length) {
      const tier = tierDoLugar(p, visits, settings.tiers)
      if (!tier || !tiersSel.includes(tier.id)) return false
    }
    return true
  }), [base, tiposSel, tiersSel, visits, settings.tiers])

  function alterna(lista, setLista, id) {
    setLista(lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id])
  }

  function girar() {
    if (!pote.length || girando) return
    setResultado(null)
    setGirando(true)
    const candidatos = pote.length > 1 ? pote.filter(p => p.id !== ultimoId.current) : pote
    const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)]
    ultimoId.current = escolhido.id
    const totalTicks = 16 + Math.floor(Math.random() * 6)
    let i = 0
    const tick = () => {
      i++
      if (i >= totalTicks) {
        setDisplay(escolhido)
        setGirando(false)
        setResultado(escolhido)
        if (navigator.vibrate) navigator.vibrate([40, 60, 90])
        return
      }
      setDisplay(pote[Math.floor(Math.random() * pote.length)])
      if (navigator.vibrate) navigator.vibrate(6)
      timer.current = setTimeout(tick, 55 + Math.pow(i / totalTicks, 2.4) * 300)
    }
    tick()
  }

  const mostrado = resultado || display
  const emojiDe = p => settings.tipos.find(t => t.id === p?.tipo)?.emoji || '🍽️'

  return (
    <div className="page no-tabbar">
      <div className="stack-header">
        <button className="icon-btn" onClick={nav.pop}><ArrowLeft size={20} /></button>
        <div className="title">Deixa a sorte escolher 🎲</div>
      </div>

      {base.length === 0 ? (
        <EmptyState emoji="🫙" titulo="O pote está vazio"
          texto="Adicionem lugares na lista Queremos ir (ou incluam os já visitados) para sortear." />
      ) : (
        <>
          <div className="card">
            <div className="card-label">O que vocês topam hoje?</div>
            <div className="chip-row">
              {tiposNoPote.map(t => (
                <button key={t.id} className={`chip${tiposSel.includes(t.id) ? ' on' : ''}`}
                  onClick={() => alterna(tiposSel, setTiposSel, t.id)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            <div className="card-label" style={{ marginTop: 14 }}>Faixa de preço</div>
            <div className="chip-row">
              {TIERS.map(t => (
                <button key={t.id} className={`chip${tiersSel.includes(t.id) ? ' on' : ''}`}
                  onClick={() => alterna(tiersSel, setTiersSel, t.id)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            <div className="spread" style={{ marginTop: 14 }}>
              <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-2)' }}>
                Incluir lugares que já fomos
              </span>
              <button className={`toggle${incluirVisitados ? ' on' : ''}`}
                onClick={() => setIncluirVisitados(!incluirVisitados)} />
            </div>
          </div>

          <div className={`roleta${girando ? ' girando' : ''}${resultado ? ' escolhido' : ''}`}>
            {resultado && <Confete />}
            {mostrado ? (
              <>
                <div className="roleta-emoji">{emojiDe(mostrado)}</div>
                <div className="roleta-nome">{mostrado.nome}</div>
                <div className="chip-row" style={{ justifyContent: 'center', marginTop: 8 }}>
                  <TipoBadge tipoId={mostrado.tipo} tipos={settings.tipos} />
                  <TierTag tier={tierDoLugar(mostrado, visits, settings.tiers)} />
                </div>
                {resultado && <div className="roleta-veredito">É esse! Boa mesa, vocês dois 🥂</div>}
              </>
            ) : (
              <>
                <div className="roleta-emoji">🎰</div>
                <div className="roleta-nome" style={{ color: 'var(--muted)' }}>
                  {pote.length} {pote.length === 1 ? 'lugar no pote' : 'lugares no pote'}
                </div>
              </>
            )}
          </div>

          <button className="btn primary mt12" disabled={!pote.length || girando} onClick={girar}>
            <Dices size={19} /> {girando ? 'Girando…' : resultado ? 'Sortear de novo' : `Girar (${pote.length})`}
          </button>
          {!pote.length && (
            <div className="muted mt8" style={{ textAlign: 'center', fontSize: 12.5 }}>
              Nenhum lugar passa nesses filtros — afrouxa aí 😄
            </div>
          )}
        </>
      )}
    </div>
  )
}
