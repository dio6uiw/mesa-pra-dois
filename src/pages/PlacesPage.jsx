import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search } from 'lucide-react'
import { db } from '../db'
import { aggPlace, fmtData } from '../logic'
import { ScoreBadge, TierBadge, TipoBadge } from '../components/Badges'
import { EmptyState } from '../components/EmptyState'

export function PlacesPage({ nav, settings }) {
  const [busca, setBusca] = useState('')
  const [tipoSel, setTipoSel] = useState(null)
  const places = useLiveQuery(() => db.places.toArray(), []) || []
  const visits = useLiveQuery(() => db.visits.toArray(), []) || []

  const visitados = useMemo(() => {
    const rows = places
      .map(p => ({ place: p, agg: aggPlace(p, visits) }))
      .filter(r => r.agg.qtdVisitas > 0)
    const q = busca.trim().toLowerCase()
    return rows
      .filter(r => !q || r.place.nome.toLowerCase().includes(q))
      .filter(r => !tipoSel || r.place.tipo === tipoSel)
      .sort((a, b) => (b.agg.nota ?? -1) - (a.agg.nota ?? -1))
  }, [places, visits, busca, tipoSel])

  const tiposUsados = useMemo(() => {
    const usados = new Set(places.filter(p => visits.some(v => v.placeId === p.id)).map(p => p.tipo))
    return settings.tipos.filter(t => usados.has(t.id))
  }, [places, visits, settings.tipos])

  const temDados = visits.length > 0

  return (
    <div className="page">
      <div className="page-title">Nossos lugares 🍽️</div>
      <div className="page-sub">
        {temDados
          ? `${visitados.length} ${visitados.length === 1 ? 'lugar avaliado' : 'lugares avaliados'}, do melhor pro pior`
          : 'O diário gastronômico do casal'}
      </div>

      {temDados && (
        <>
          <div className="search">
            <Search size={17} />
            <input placeholder="Buscar lugar…" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {tiposUsados.length > 1 && (
            <div className="chip-row scroll" style={{ marginBottom: 14 }}>
              <button className={`chip${!tipoSel ? ' on' : ''}`} onClick={() => setTipoSel(null)}>Todos</button>
              {tiposUsados.map(t => (
                <button key={t.id} className={`chip${tipoSel === t.id ? ' on' : ''}`}
                  onClick={() => setTipoSel(tipoSel === t.id ? null : t.id)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {!temDados && (
        <EmptyState emoji="🕯️" titulo="Tudo pronto para a primeira avaliação"
          texto="Registrem o próximo jantar: toquem no botão + e avaliem comida, atendimento e ambiente.">
          <button className="btn primary" style={{ width: 'auto', padding: '12px 22px', margin: '18px auto 0' }}
            onClick={() => nav.push('visit-form')}>
            Registrar primeira visita
          </button>
        </EmptyState>
      )}

      {temDados && visitados.length === 0 && (
        <EmptyState emoji="🔍" titulo="Nada por aqui" texto="Nenhum lugar bate com essa busca ou filtro." />
      )}

      {visitados.map(({ place, agg }) => (
        <button key={place.id} className="place-card" style={{ width: '100%', textAlign: 'left' }}
          onClick={() => nav.push('place-detail', { placeId: place.id })}>
          <ScoreBadge nota={agg.nota} size={48} />
          <div className="info">
            <div className="nome">{place.nome}</div>
            <div className="meta">
              <TipoBadge tipoId={place.tipo} tipos={settings.tipos} />
              <TierBadge precoMedio={agg.precoMedio} tiersCfg={settings.tiers} />
            </div>
            <div className="sub">
              {agg.qtdVisitas} {agg.qtdVisitas === 1 ? 'visita' : 'visitas'} · última em {fmtData(agg.ultimaVisita)}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
