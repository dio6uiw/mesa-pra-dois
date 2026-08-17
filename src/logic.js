// Cálculos de notas, tiers e indicadores do dashboard.
export const PILARES = [
  { id: 'comida', label: 'Comida' },
  { id: 'atendimento', label: 'Atendimento' },
  { id: 'ambiente', label: 'Ambiente' },
]

export const TIERS = [
  { id: 'pedir', emoji: '🛵', label: 'Só pra pedir', curto: 'Pedir' },
  { id: 'legal', emoji: '😎', label: 'Lugar legal', curto: 'Legal' },
  { id: 'chique', emoji: '✨', label: 'Lugar chique', curto: 'Chique' },
]

// ---- notas ----------------------------------------------------------------

export function mediaAvaliador(notas) {
  if (!notas) return null
  const vals = PILARES.map(p => notas[p.id]).filter(v => v != null && v > 0)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function notaVisita(visit) {
  const medias = [mediaAvaliador(visit.notas?.p1), mediaAvaliador(visit.notas?.p2)].filter(v => v != null)
  if (!medias.length) return null
  return medias.reduce((a, b) => a + b, 0) / medias.length
}

export function pilarVisita(visit, pilarId) {
  const vals = ['p1', 'p2']
    .map(p => visit.notas?.[p]?.[pilarId])
    .filter(v => v != null && v > 0)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function media(arr) {
  const vals = arr.filter(v => v != null)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Agregado de um lugar a partir das suas visitas.
export function aggPlace(place, visits) {
  const vs = visits.filter(v => v.placeId === place.id)
  const nota = media(vs.map(notaVisita))
  const precos = vs.map(v => v.precoPessoa).filter(v => v != null && v > 0)
  const precoMedio = precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : null
  const pilares = {}
  for (const p of PILARES) pilares[p.id] = media(vs.map(v => pilarVisita(v, p.id)))
  const ultima = vs.length ? vs.map(v => v.data).sort().at(-1) : null
  return { nota, precoMedio, pilares, qtdVisitas: vs.length, ultimaVisita: ultima }
}

export function tierDe(precoMedio, tiersCfg) {
  if (precoMedio == null) return null
  if (precoMedio <= tiersCfg.pedirMax) return TIERS[0]
  if (precoMedio <= tiersCfg.legalMax) return TIERS[1]
  return TIERS[2]
}

export function tierPorId(id) {
  return TIERS.find(t => t.id === id) || null
}

// Tier efetivo de um lugar: real (média das visitas) ou o previsto no cadastro.
export function tierDoLugar(place, visits, tiersCfg) {
  const agg = aggPlace(place, visits)
  return tierDe(agg.precoMedio, tiersCfg) || tierPorId(place.tierPrevisto)
}

export function scoreColor(nota) {
  if (nota == null) return 'var(--muted)'
  if (nota < 2) return 'var(--score-1)'
  if (nota < 3) return 'var(--score-2)'
  if (nota < 4) return 'var(--score-3)'
  if (nota < 4.5) return 'var(--score-4)'
  return 'var(--score-5)'
}

// ---- formatação (pt-BR) ---------------------------------------------------

export function fmtNota(n) {
  if (n == null) return '–'
  return (Math.round(n * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function fmtMoeda(v) {
  if (v == null) return '–'
  const inteiro = Math.abs(v % 1) < 0.005
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: inteiro ? 0 : 2,
    maximumFractionDigits: inteiro ? 0 : 2,
  })
}

export function fmtData(iso) {
  if (!iso) return '–'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function hojeISO() {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

// Aceita "45,90", "45.90", "R$ 45" → número (ou null).
export function parseDecimal(str) {
  if (str == null || String(str).trim() === '') return null
  const clean = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : null
}

// ---- dashboard ------------------------------------------------------------

export function filtraPeriodo(visits, periodo) {
  if (periodo === 'tudo') return visits
  const hoje = new Date()
  if (periodo === 'ano') {
    const ano = String(hoje.getFullYear())
    return visits.filter(v => v.data?.startsWith(ano))
  }
  if (periodo === '90d') {
    const lim = new Date(hoje.getTime() - 90 * 86400000).toISOString().slice(0, 10)
    return visits.filter(v => v.data >= lim)
  }
  return visits
}

export function kpis(visits, places) {
  const notas = visits.map(notaVisita).filter(v => v != null)
  const precos = visits.map(v => v.precoPessoa).filter(v => v != null && v > 0)
  const lugaresVisitados = new Set(visits.map(v => v.placeId)).size
  return {
    visitas: visits.length,
    lugares: lugaresVisitados,
    notaMedia: media(notas),
    gastoMedio: precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : null,
  }
}

export function visitasPorMes(visits, meses = 12) {
  const out = []
  const base = new Date()
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const rotulo = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    out.push({ chave, rotulo, visitas: visits.filter(v => v.data?.startsWith(chave)).length })
  }
  return out
}

export function visitasPorTipo(visits, places, tipos, max = 6) {
  const byPlace = new Map(places.map(p => [p.id, p]))
  const cont = new Map()
  for (const v of visits) {
    const tipo = byPlace.get(v.placeId)?.tipo || 'outro'
    cont.set(tipo, (cont.get(tipo) || 0) + 1)
  }
  const rows = [...cont.entries()]
    .map(([tipo, qtd]) => {
      const t = tipos.find(t => t.id === tipo)
      return { tipo, label: t ? `${t.emoji} ${t.label}` : tipo, qtd }
    })
    .sort((a, b) => b.qtd - a.qtd)
  if (rows.length <= max) return rows
  const top = rows.slice(0, max - 1)
  const resto = rows.slice(max - 1).reduce((a, r) => a + r.qtd, 0)
  return [...top, { tipo: '_outros', label: 'Outros', qtd: resto }]
}

export function pilaresPorPessoa(visits) {
  return PILARES.map(p => {
    const p1 = media(visits.map(v => v.notas?.p1?.[p.id]).filter(v => v != null && v > 0))
    const p2 = media(visits.map(v => v.notas?.p2?.[p.id]).filter(v => v != null && v > 0))
    return { pilar: p.label, p1, p2 }
  })
}

export function porTier(places, visits, tiersCfg) {
  const cont = { pedir: 0, legal: 0, chique: 0 }
  for (const place of places) {
    const agg = aggPlace(place, visits)
    if (!agg.qtdVisitas) continue
    const t = tierDe(agg.precoMedio, tiersCfg)
    if (t) cont[t.id]++
  }
  return TIERS.map(t => ({ ...t, qtd: cont[t.id] }))
}

export function topLugares(places, visits, n = 5) {
  return places
    .map(p => ({ place: p, agg: aggPlace(p, visits) }))
    .filter(r => r.agg.nota != null)
    .sort((a, b) => b.agg.nota - a.agg.nota)
    .slice(0, n)
}

export function custoBeneficio(places, visits, n = 3) {
  return places
    .map(p => ({ place: p, agg: aggPlace(p, visits) }))
    .filter(r => r.agg.nota != null && r.agg.precoMedio != null && r.agg.precoMedio > 0)
    .map(r => ({ ...r, indice: r.agg.nota / r.agg.precoMedio * 100 }))
    .sort((a, b) => b.indice - a.indice)
    .slice(0, n)
}

// Concordância do casal: 100% quando as notas coincidem, 0% na distância máxima (5).
export function matchCasal(visits) {
  const pares = []
  for (const v of visits) {
    const n1 = mediaAvaliador(v.notas?.p1)
    const n2 = mediaAvaliador(v.notas?.p2)
    if (n1 != null && n2 != null) pares.push({ n1, n2, dif: n1 - n2, visita: v })
  }
  if (!pares.length) return null
  const difMedia = media(pares.map(p => Math.abs(p.dif)))
  const deltaMedio = media(pares.map(p => p.dif)) // >0: p1 dá notas maiores
  const maior = pares.reduce((a, b) => (Math.abs(b.dif) > Math.abs(a.dif) ? b : a))
  return {
    pct: Math.round((1 - difMedia / 5) * 100),
    deltaMedio,
    maiorDiscordancia: Math.abs(maior.dif) >= 0.5 ? maior : null,
    qtdComparaveis: pares.length,
  }
}
