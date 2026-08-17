import { fmtNota, scoreColor, tierDe } from '../logic'

export function ScoreBadge({ nota, size = 44 }) {
  const cor = scoreColor(nota)
  return (
    <div
      className="score-badge"
      style={{
        width: size, height: size, fontSize: size * 0.34,
        color: cor, borderColor: cor,
        background: nota == null ? 'transparent' : `color-mix(in srgb, ${cor} 14%, transparent)`,
      }}
    >
      {fmtNota(nota)}
    </div>
  )
}

export function TierBadge({ precoMedio, tiersCfg, comValor = false }) {
  const tier = tierDe(precoMedio, tiersCfg)
  if (!tier) return null
  return (
    <span className="badge">
      {tier.emoji} {tier.label}
      {comValor && precoMedio != null && (
        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
          · ~{Math.round(precoMedio)}/pessoa
        </span>
      )}
    </span>
  )
}

export function TipoBadge({ tipoId, tipos }) {
  const t = tipos?.find(t => t.id === tipoId)
  if (!t) return null
  return <span className="badge">{t.emoji} {t.label}</span>
}

export function TierTag({ tier }) {
  if (!tier) return null
  return <span className="badge">{tier.emoji} {tier.label}</span>
}

// Foto do estabelecimento com fallback para o emoji do tipo.
export function FotoThumb({ src, emoji, size = 64 }) {
  return (
    <div className="thumb" style={{ width: size, height: size, fontSize: size * 0.44 }}>
      <span>{emoji || '🍽️'}</span>
      {src && (
        <img src={src} alt="" loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none' }} />
      )}
    </div>
  )
}
