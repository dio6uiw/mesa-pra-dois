import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
import { contarVisitas, db, excluirLugar } from '../db'
import { TIERS } from '../logic'
import { useFeedback } from '../components/Feedback'

// Criar/editar lugar (usado principalmente pela wishlist).
export function PlaceFormPage({ nav, params, settings }) {
  const { showToast, ask } = useFeedback()
  const editando = params.placeId != null
  const place = useLiveQuery(
    () => (editando ? db.places.get(params.placeId) : Promise.resolve(null)),
    [params.placeId]
  )

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState(null)
  const [tierPrevisto, setTierPrevisto] = useState(null)
  const [carregou, setCarregou] = useState(!editando)

  useEffect(() => {
    if (editando && place && !carregou) {
      setNome(place.nome)
      setTipo(place.tipo)
      setTierPrevisto(place.tierPrevisto || null)
      setCarregou(true)
    }
  }, [editando, place, carregou])

  async function salvar() {
    if (editando) {
      await db.places.update(params.placeId, { nome: nome.trim(), tipo, tierPrevisto })
      showToast('Lugar atualizado!')
    } else {
      await db.places.add({
        nome: nome.trim(), tipo, tierPrevisto, wishlist: params.wishlist ? 1 : 0,
        criadoEm: new Date().toISOString(),
      })
      showToast(params.wishlist ? 'Adicionado à lista de desejos!' : 'Lugar criado!')
    }
    nav.pop()
  }

  async function excluir() {
    const visitas = await contarVisitas(params.placeId)
    const ok = await ask({
      titulo: `Excluir ${place?.nome || 'este lugar'}?`,
      texto: visitas > 0
        ? `Isso apaga o lugar e as ${visitas} ${visitas === 1 ? 'visita registrada' : 'visitas registradas'}, com fotos e notas. Não dá pra desfazer.`
        : 'O lugar será removido. Não dá pra desfazer.',
      okLabel: 'Excluir', danger: true,
    })
    if (!ok) return
    await excluirLugar(params.placeId)
    showToast('Lugar excluído')
    nav.pop()
  }

  return (
    <div className="page no-tabbar">
      <div className="stack-header">
        <button className="icon-btn" aria-label="Voltar" onClick={nav.pop}><ArrowLeft size={20} /></button>
        <div className="title">
          {editando ? 'Editar lugar' : params.wishlist ? 'Queremos ir em…' : 'Novo lugar'}
        </div>
        {editando && (
          <button className="icon-btn danger" aria-label="Excluir lugar" onClick={excluir}>
            <Trash2 size={17} />
          </button>
        )}
      </div>

      <div className="field">
        <label>Nome do lugar</label>
        <input className="input" placeholder="Ex.: Cantina da Nonna" value={nome}
          onChange={e => setNome(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label>Tipo de comida</label>
        <div className="chip-row">
          {settings.tipos.map(t => (
            <button key={t.id} className={`chip${tipo === t.id ? ' on' : ''}`} onClick={() => setTipo(t.id)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Faixa de preço estimada (opcional — usada no sorteio)</label>
        <div className="chip-row">
          {TIERS.map(t => (
            <button key={t.id} className={`chip${tierPrevisto === t.id ? ' on' : ''}`}
              onClick={() => setTierPrevisto(tierPrevisto === t.id ? null : t.id)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <button className="btn primary mt16" disabled={!nome.trim() || !tipo} onClick={salvar}>
        <Check size={19} /> Salvar
      </button>
    </div>
  )
}
