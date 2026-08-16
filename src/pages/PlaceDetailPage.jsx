import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import { aggPlace, fmtData, fmtMoeda, fmtNota, mediaAvaliador, notaVisita, PILARES } from '../logic'
import { ScoreBadge, TierBadge, TipoBadge } from '../components/Badges'
import { Stars } from '../components/StarInput'
import { useFeedback } from '../components/Feedback'

export function PlaceDetailPage({ nav, params, settings }) {
  const { showToast, ask } = useFeedback()
  const place = useLiveQuery(() => db.places.get(params.placeId), [params.placeId])
  const visits = useLiveQuery(
    () => db.visits.where('placeId').equals(params.placeId).toArray(),
    [params.placeId]
  ) || []

  if (!place) return <div className="page no-tabbar" />
  const agg = aggPlace(place, visits)
  const ordenadas = [...visits].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  const nomes = settings.nomes

  async function excluirLugar() {
    const ok = await ask({
      titulo: `Excluir ${place.nome}?`,
      texto: `Isso apaga o lugar e ${visits.length ? `as ${visits.length} visitas registradas` : 'seu histórico'}. Não dá pra desfazer.`,
      okLabel: 'Excluir', danger: true,
    })
    if (!ok) return
    await db.transaction('rw', db.places, db.visits, async () => {
      await db.visits.where('placeId').equals(place.id).delete()
      await db.places.delete(place.id)
    })
    showToast('Lugar excluído')
    nav.pop()
  }

  return (
    <div className="page no-tabbar">
      <div className="stack-header">
        <button className="icon-btn" onClick={nav.pop}><ArrowLeft size={20} /></button>
        <div className="title">{place.nome}</div>
        <button className="icon-btn" onClick={() => nav.push('place-form', { placeId: place.id })}><Pencil size={17} /></button>
        <button className="icon-btn danger" onClick={excluirLugar}><Trash2 size={17} /></button>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <ScoreBadge nota={agg.nota} size={64} />
          <div style={{ flex: 1 }}>
            <div className="chip-row" style={{ gap: 6 }}>
              <TipoBadge tipoId={place.tipo} tipos={settings.tipos} />
              <TierBadge precoMedio={agg.precoMedio} tiersCfg={settings.tiers} />
            </div>
            <div className="muted mt8" style={{ fontSize: 12.5 }}>
              {agg.qtdVisitas} {agg.qtdVisitas === 1 ? 'visita' : 'visitas'}
              {agg.precoMedio != null && <> · {fmtMoeda(agg.precoMedio)}/pessoa</>}
            </div>
          </div>
        </div>

        {agg.nota != null && (
          <div className="mt12">
            {PILARES.map(p => (
              <div key={p.id} className="pilar-bar">
                <div className="nome">{p.label}</div>
                <div className="track"><div className="fill" style={{ width: `${(agg.pilares[p.id] || 0) / 5 * 100}%` }} /></div>
                <div className="num">{fmtNota(agg.pilares[p.id])}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn primary mt12" onClick={() => nav.push('visit-form', { placeId: place.id })}>
        <Plus size={19} /> Nova visita aqui
      </button>

      <div className="card-label mt16" style={{ margin: '18px 2px 10px' }}>Histórico de visitas</div>
      {ordenadas.map(v => {
        const n1 = mediaAvaliador(v.notas?.p1)
        const n2 = mediaAvaliador(v.notas?.p2)
        return (
          <button key={v.id} className="visit-item" style={{ width: '100%', textAlign: 'left' }}
            onClick={() => nav.push('visit-form', { visitId: v.id })}>
            <div className="topo">
              <span className="data">{fmtData(v.data)}</span>
              <Stars value={notaVisita(v)} size={13} />
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--star-ink)' }}>{fmtNota(notaVisita(v))}</span>
              <span style={{ flex: 1 }} />
              {v.precoPessoa != null && <span className="badge">{fmtMoeda(v.precoPessoa)}/pessoa</span>}
            </div>
            {(n1 != null || n2 != null) && (
              <div className="pessoas">
                {n1 != null && <span className="pessoa">{nomes.p1}: <b style={{ color: 'var(--text-2)' }}>{fmtNota(n1)}</b></span>}
                {n2 != null && <span className="pessoa">{nomes.p2}: <b style={{ color: 'var(--text-2)' }}>{fmtNota(n2)}</b></span>}
              </div>
            )}
            {v.obs && <div className="obs">“{v.obs}”</div>}
          </button>
        )
      })}
    </div>
  )
}
