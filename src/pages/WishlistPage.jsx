import { useLiveQuery } from 'dexie-react-hooks'
import { Compass, Dices, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { contarVisitas, db, excluirLugar } from '../db'
import { tierPorId } from '../logic'
import { FotoThumb, TierTag, TipoBadge } from '../components/Badges'
import { EmptyState } from '../components/EmptyState'
import { useFeedback } from '../components/Feedback'

export function WishlistPage({ nav, settings }) {
  const { showUndo } = useFeedback()
  const places = useLiveQuery(() => db.places.where('wishlist').equals(1).toArray(), []) || []

  // Remoção reversível (sem modal): lugar sem visita sai do banco, com visitas apenas
  // deixa a lista. Nos dois casos o toast oferece "Desfazer".
  async function remover(place) {
    const visitas = await contarVisitas(place.id)
    if (visitas > 0) {
      await db.places.update(place.id, { wishlist: 0 })
      showUndo(`${place.nome} saiu da lista`, () => db.places.update(place.id, { wishlist: 1 }))
      return
    }
    await excluirLugar(place.id)
    showUndo(`${place.nome} foi removido`, () => db.places.put(place)) // restaura com o mesmo id
  }

  return (
    <div className="page">
      <div className="page-title">Queremos ir 💫</div>
      <div className="page-sub">A lista de desejos do casal — ouviu falar bem? Anota aqui.</div>

      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <button className="btn primary" style={{ flex: 1 }} onClick={() => nav.push('sortear')}>
          <Dices size={18} /> Sortear
        </button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={() => nav.push('descobrir')}>
          <Compass size={18} /> Descobrir
        </button>
      </div>
      <button className="btn ghost" style={{ marginBottom: 14 }} onClick={() => nav.push('place-form', { wishlist: true })}>
        <Plus size={18} /> Adicionar à lista
      </button>

      {places.length === 0 && (
        <EmptyState emoji="🗺️" titulo="Lista vazia"
          texto="Adicionem os lugares que querem conhecer — ou toquem em Descobrir para achar restaurantes bem avaliados por perto." />
      )}

      {places.map(place => (
        <div key={place.id} className="place-card">
          {place.fotoUrl && (
            <FotoThumb src={place.fotoUrl}
              emoji={settings.tipos.find(t => t.id === place.tipo)?.emoji} size={56} />
          )}
          <button style={{ flex: 1, textAlign: 'left', minWidth: 0 }}
            onClick={() => nav.push('place-form', { placeId: place.id })}>
            <div className="nome">{place.nome}</div>
            <div className="meta">
              <TipoBadge tipoId={place.tipo} tipos={settings.tipos} />
              <TierTag tier={tierPorId(place.tierPrevisto)} />
            </div>
            {place.endereco && <div className="sub">{place.endereco}</div>}
          </button>
          <button className="btn primary sm" onClick={() => nav.push('visit-form', { placeId: place.id })}>
            <UtensilsCrossed size={15} /> Fomos!
          </button>
          <button className="icon-btn sm" aria-label={`Remover ${place.nome} da lista`}
            onClick={() => remover(place)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
