import { useState } from 'react'
import { X } from 'lucide-react'

// Visualizador em tela cheia com swipe entre as fotos (scroll-snap).
export function FotoViewer({ fotos, inicial = 0, onClose }) {
  const [idx, setIdx] = useState(inicial)

  return (
    <div className="foto-viewer" onClick={onClose}>
      <button className="foto-viewer-x" aria-label="Fechar" onClick={onClose}><X size={22} /></button>
      <div className="foto-viewer-trilho" onClick={e => e.stopPropagation()}
        ref={el => { if (el && !el.dataset.pos) { el.dataset.pos = '1'; el.scrollLeft = inicial * el.clientWidth } }}
        onScroll={e => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {fotos.map((f, i) => (
          <div key={i} className="foto-viewer-slide">
            <img src={f} alt="" />
          </div>
        ))}
      </div>
      {fotos.length > 1 && (
        <div className="galeria-dots" style={{ position: 'absolute', bottom: 26, left: 0, right: 0 }}>
          {fotos.map((_, i) => <span key={i} className={i === idx ? 'on' : ''} />)}
        </div>
      )}
    </div>
  )
}
