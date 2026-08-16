import { useRef, useState } from 'react'

function Star({ fill, size, pop }) {
  // fill: 0, 0.5 ou 1
  const id = useRef(`sg${Math.random().toString(36).slice(2, 8)}`).current
  return (
    <svg className={`star${pop ? ' pop' : ''}`} width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id={id}>
          <stop offset="50%" stopColor="var(--star)" />
          <stop offset="50%" stopColor="var(--star-off)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6l2.86 5.8 6.4.93-4.63 4.51 1.1 6.37L12 17.2l-5.72 3.01 1.09-6.37L2.74 9.33l6.4-.93L12 2.6z"
        fill={fill === 1 ? 'var(--star)' : fill === 0.5 ? `url(#${id})` : 'var(--star-off)'}
      />
    </svg>
  )
}

// Input 0–5 com meio ponto: tap na metade esquerda/direita e arraste contínuo.
export function StarInput({ value = 0, onChange, size = 38 }) {
  const ref = useRef(null)
  const [popIdx, setPopIdx] = useState(-1)

  function valueFromX(clientX) {
    const rect = ref.current.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.max(0.5, Math.ceil(frac * 10) / 2)
  }

  function apply(clientX) {
    const v = valueFromX(clientX)
    if (v !== value) {
      onChange(v)
      setPopIdx(Math.ceil(v) - 1)
      if (navigator.vibrate) navigator.vibrate(8)
    }
  }

  return (
    <div
      ref={ref}
      className="star-input"
      onPointerDown={e => { try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} apply(e.clientX) }}
      onPointerMove={e => { if (e.buttons > 0) apply(e.clientX) }}
      onAnimationEnd={() => setPopIdx(-1)}
    >
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={size} pop={i === popIdx}
          fill={value >= i + 1 ? 1 : value >= i + 0.5 ? 0.5 : 0} />
      ))}
    </div>
  )
}

// Display readonly compacto.
export function Stars({ value, size = 14 }) {
  const v = Math.round((value || 0) * 2) / 2
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={size} fill={v >= i + 1 ? 1 : v >= i + 0.5 ? 0.5 : 0} />
      ))}
    </span>
  )
}
