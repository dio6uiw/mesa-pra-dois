import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { db } from '../db'
import { TipoBadge } from '../components/Badges'
import { EmptyState } from '../components/EmptyState'

export function WishlistPage({ nav, settings }) {
  const places = useLiveQuery(() => db.places.where('wishlist').equals(1).toArray(), []) || []

  return (
    <div className="page">
      <div className="page-title">Queremos ir 💫</div>
      <div className="page-sub">A lista de desejos do casal — ouviu falar bem? Anota aqui.</div>

      <button className="btn ghost" style={{ marginBottom: 14 }} onClick={() => nav.push('place-form', { wishlist: true })}>
        <Plus size={18} /> Adicionar à lista
      </button>

      {places.length === 0 && (
        <EmptyState emoji="🗺️" titulo="Lista vazia"
          texto="Adicionem os lugares que querem conhecer. Quando forem, é só tocar em “Fomos!” e avaliar." />
      )}

      {places.map(place => (
        <div key={place.id} className="place-card">
          <button style={{ flex: 1, textAlign: 'left', minWidth: 0 }}
            onClick={() => nav.push('place-form', { placeId: place.id })}>
            <div className="nome">{place.nome}</div>
            <div className="meta"><TipoBadge tipoId={place.tipo} tipos={settings.tipos} /></div>
          </button>
          <button className="btn primary sm" onClick={() => nav.push('visit-form', { placeId: place.id })}>
            <UtensilsCrossed size={15} /> Fomos!
          </button>
        </div>
      ))}
    </div>
  )
}
