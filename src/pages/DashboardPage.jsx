import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { db } from '../db'
import {
  custoBeneficio, filtraPeriodo, fmtData, fmtMoeda, fmtNota, kpis, matchCasal,
  pilaresPorPessoa, porTier, topLugares, visitasPorMes, visitasPorTipo,
} from '../logic'
import { ScoreBadge } from '../components/Badges'
import { EmptyState } from '../components/EmptyState'

const SERIE_1 = 'var(--serie-1)'
const SERIE_2 = 'var(--serie-2)'

function TooltipCasal({ active, payload, label, nomes }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tt">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="li">
          <span className="dot" style={{ background: p.fill }} />
          {p.dataKey === 'p1' ? nomes.p1 : nomes.p2}: <b>{fmtNota(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

function TooltipMes({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tt">{label}</div>
      <div className="li">{payload[0].value} {payload[0].value === 1 ? 'visita' : 'visitas'}</div>
    </div>
  )
}

export function DashboardPage({ nav, settings }) {
  const [periodo, setPeriodo] = useState('tudo')
  const places = useLiveQuery(() => db.places.toArray(), []) || []
  const todasVisitas = useLiveQuery(() => db.visits.toArray(), []) || []

  const visits = useMemo(() => filtraPeriodo(todasVisitas, periodo), [todasVisitas, periodo])
  const byPlace = useMemo(() => new Map(places.map(p => [p.id, p])), [places])

  const k = useMemo(() => kpis(visits, places), [visits, places])
  const match = useMemo(() => matchCasal(visits), [visits])
  const pilares = useMemo(() => pilaresPorPessoa(visits), [visits])
  const meses = useMemo(() => visitasPorMes(todasVisitas), [todasVisitas])
  const tipos = useMemo(() => visitasPorTipo(visits, places, settings.tipos), [visits, places, settings.tipos])
  const tiers = useMemo(() => porTier(places, visits, settings.tiers), [places, visits, settings.tiers])
  const top = useMemo(() => topLugares(places, visits), [places, visits])
  const cb = useMemo(() => custoBeneficio(places, visits), [places, visits])

  const nomes = settings.nomes
  const maxTipo = Math.max(1, ...tipos.map(t => t.qtd))

  if (!todasVisitas.length) {
    return (
      <div className="page">
        <div className="page-title">Indicadores 📊</div>
        <EmptyState emoji="📈" titulo="Ainda sem números"
          texto="Depois das primeiras visitas, aqui aparecem as médias, os rankings e o quanto vocês dois concordam." />
      </div>
    )
  }

  const deltaAbs = match ? Math.abs(match.deltaMedio) : 0
  const maisGeneroso = match && deltaAbs >= 0.05 ? (match.deltaMedio > 0 ? nomes.p1 : nomes.p2) : null

  return (
    <div className="page">
      <div className="page-title">Indicadores 📊</div>
      <div className="page-sub">A vida gastronômica de {nomes.p1} & {nomes.p2} em números</div>

      <div className="seg">
        {[['tudo', 'Tudo'], ['ano', 'Este ano'], ['90d', '90 dias']].map(([id, label]) => (
          <button key={id} className={periodo === id ? 'on' : ''} onClick={() => setPeriodo(id)}>{label}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="rotulo">Visitas</div>
          <div className="valor">{k.visitas}</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Lugares</div>
          <div className="valor">{k.lugares}</div>
        </div>
        <div className="kpi">
          <div className="rotulo">Nota média</div>
          <div className="valor" style={{ color: 'var(--star-ink)' }}>{fmtNota(k.notaMedia)} <span style={{ fontSize: 15 }}>★</span></div>
        </div>
        <div className="kpi">
          <div className="rotulo">Gasto médio</div>
          <div className="valor" style={{ fontSize: 22 }}>{fmtMoeda(k.gastoMedio)}</div>
          <div className="extra">por pessoa</div>
        </div>
      </div>

      {/* match do casal */}
      {match && (
        <div className="card mt12" style={{ background: 'linear-gradient(135deg, var(--surface) 0%, var(--card-glow) 100%)' }}>
          <div className="card-label">❤️ Sintonia do casal</div>
          <div className="row" style={{ gap: 14 }}>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent-strong)' }}>
              {match.pct}%
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45 }}>
              é o quanto as notas de vocês concordam
              {maisGeneroso && <> · <b>{maisGeneroso}</b> costuma ser mais generoso(a) nas notas</>}
            </div>
          </div>
          {match.maiorDiscordancia && (
            <div className="muted mt8" style={{ fontSize: 12.5 }}>
              Maior divergência: <b style={{ color: 'var(--text-2)' }}>
                {byPlace.get(match.maiorDiscordancia.visita.placeId)?.nome}
              </b> em {fmtData(match.maiorDiscordancia.visita.data)} — diferença de {fmtNota(Math.abs(match.maiorDiscordancia.dif))}
            </div>
          )}
        </div>
      )}

      {/* pilares por pessoa */}
      <div className="card mt12">
        <div className="card-label">Média por pilar</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={pilares} barGap={3} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="pilar" tickLine={false} axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 650 }} />
            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tickLine={false} axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip content={<TooltipCasal nomes={nomes} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="p1" fill={SERIE_1} radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="p2" fill={SERIE_2} radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
        <div className="legend-row">
          <span className="item"><span className="sw" style={{ background: SERIE_1 }} />{nomes.p1}</span>
          <span className="item"><span className="sw" style={{ background: SERIE_2 }} />{nomes.p2}</span>
        </div>
      </div>

      {/* visitas por mês */}
      <div className="card mt12">
        <div className="card-label">Visitas por mês · últimos 12 meses</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={meses} margin={{ top: 6, right: 4, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} interval={1}
              tick={{ fill: 'var(--muted)', fontSize: 10.5 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip content={<TooltipMes />} cursor={{ stroke: 'var(--border-2)' }} />
            <Area type="monotone" dataKey="visitas" stroke="var(--accent)" strokeWidth={2}
              fill="url(#gradMes)" dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* tipos de comida */}
      <div className="card mt12">
        <div className="card-label">Visitas por tipo de comida</div>
        {tipos.map(t => (
          <div key={t.tipo} className="hbar">
            <div className="rotulo">{t.label}</div>
            <div className="track">
              <div className="fill" style={{ width: `${t.qtd / maxTipo * 100}%`, opacity: t.tipo === '_outros' ? 0.45 : 1 }} />
            </div>
            <div className="num">{t.qtd}</div>
          </div>
        ))}
      </div>

      {/* tiers */}
      <div className="card mt12">
        <div className="card-label">Lugares por categoria de preço</div>
        <div className="row" style={{ gap: 8 }}>
          {tiers.map(t => (
            <div key={t.id} style={{
              flex: 1, textAlign: 'center', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 14, padding: '12px 6px',
            }}>
              <div style={{ fontSize: 22 }}>{t.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, margin: '2px 0' }}>{t.qtd}</div>
              <div className="muted" style={{ fontSize: 10.5, fontWeight: 700 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* top lugares */}
      {top.length > 0 && (
        <div className="card mt12">
          <div className="card-label">🏆 Top lugares</div>
          {top.map(({ place, agg }, i) => (
            <button key={place.id} className="rank-item" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => nav.push('place-detail', { placeId: place.id })}>
              <span className="pos">{i + 1}º</span>
              <span className="nome">{place.nome}</span>
              <span className="extra">{agg.qtdVisitas}×</span>
              <ScoreBadge nota={agg.nota} size={34} />
            </button>
          ))}
        </div>
      )}

      {/* custo-benefício */}
      {cb.length > 0 && (
        <div className="card mt12">
          <div className="card-label">💸 Melhor custo-benefício</div>
          {cb.map(({ place, agg }, i) => (
            <button key={place.id} className="rank-item" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => nav.push('place-detail', { placeId: place.id })}>
              <span className="pos">{i + 1}º</span>
              <span className="nome">{place.nome}</span>
              <span className="extra">{fmtNota(agg.nota)} ★ · {fmtMoeda(agg.precoMedio)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
