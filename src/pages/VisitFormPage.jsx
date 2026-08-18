import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Camera, Check, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import { db, excluirVisita, fotosDaVisita, salvarFotos } from '../db'
import { hojeISO, parseDecimal, PILARES } from '../logic'
import { comprimirImagem } from '../img'
import { StarInput } from '../components/StarInput'
import { useFeedback } from '../components/Feedback'

const MAX_FOTOS = 8

const NOTAS_VAZIAS = { comida: 0, atendimento: 0, ambiente: 0 }

function CardAvaliador({ nome, notas, setNotas, foi, setFoi }) {
  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: foi ? 6 : 0 }}>
        <div className="card-label" style={{ margin: 0 }}>Notas de {nome}</div>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 650 }}>{foi ? 'foi' : 'não foi'}</span>
          <button className={`toggle${foi ? ' on' : ''}`} onClick={() => setFoi(!foi)} />
        </div>
      </div>
      {foi && PILARES.map(p => (
        <div key={p.id} className="star-row">
          <div className="pilar-label">{p.label}</div>
          <StarInput value={notas[p.id]} onChange={v => setNotas({ ...notas, [p.id]: v })} size={36} />
          <div className="valor">{notas[p.id] ? notas[p.id].toLocaleString('pt-BR') : '–'}</div>
        </div>
      ))}
    </div>
  )
}

export function VisitFormPage({ nav, params, settings }) {
  const { showToast, ask } = useFeedback()
  const editando = params.visitId != null
  const visita = useLiveQuery(
    async () => (editando ? (await db.visits.get(params.visitId)) ?? null : null),
    [params.visitId]
  )
  const fotosDb = useLiveQuery(
    () => (editando ? fotosDaVisita(params.visitId) : Promise.resolve([])),
    [params.visitId]
  )
  const places = useLiveQuery(() => db.places.toArray(), []) || []

  const [placeId, setPlaceId] = useState(params.placeId ?? null)
  const [buscaLugar, setBuscaLugar] = useState('')
  const [novoTipo, setNovoTipo] = useState(null)
  const [criandoNovo, setCriandoNovo] = useState(false)

  const [data, setData] = useState(hojeISO())
  const [preco, setPreco] = useState('')
  const [obs, setObs] = useState('')
  const [fotos, setFotos] = useState([])
  const [n1, setN1] = useState({ ...NOTAS_VAZIAS })
  const [n2, setN2] = useState({ ...NOTAS_VAZIAS })
  const [foi1, setFoi1] = useState(true)
  const [foi2, setFoi2] = useState(true)
  const [carregou, setCarregou] = useState(!editando)
  const [salvando, setSalvando] = useState(false)
  const fotoRef = useRef(null)

  useEffect(() => {
    if (editando && visita && fotosDb && !carregou) {
      setPlaceId(visita.placeId)
      setData(visita.data || hojeISO())
      setPreco(visita.precoPessoa != null ? String(visita.precoPessoa).replace('.', ',') : '')
      setObs(visita.obs || '')
      setFotos(fotosDb.map(f => f.dataUrl))
      setN1(visita.notas?.p1 ? { ...NOTAS_VAZIAS, ...visita.notas.p1 } : { ...NOTAS_VAZIAS })
      setN2(visita.notas?.p2 ? { ...NOTAS_VAZIAS, ...visita.notas.p2 } : { ...NOTAS_VAZIAS })
      setFoi1(!!visita.notas?.p1)
      setFoi2(!!visita.notas?.p2)
      setCarregou(true)
    }
  }, [editando, visita, fotosDb, carregou])

  // Visita apagada em outra tela: nao deixa o usuario preso numa tela vazia
  useEffect(() => {
    if (editando && visita === null) nav.pop()
  }, [editando, visita, nav])

  const lugarFixo = params.placeId != null || editando
  const lugarSel = places.find(p => p.id === placeId)

  const sugestoes = useMemo(() => {
    const q = buscaLugar.trim().toLowerCase()
    const rows = q ? places.filter(p => p.nome.toLowerCase().includes(q)) : places
    return rows.slice(0, 5)
  }, [places, buscaLugar])

  const nomeNovo = buscaLugar.trim()
  const nomeJaExiste = places.some(p => p.nome.trim().toLowerCase() === nomeNovo.toLowerCase())

  const temNota = (foi1 && Object.values(n1).some(v => v > 0)) || (foi2 && Object.values(n2).some(v => v > 0))
  const temLugar = placeId != null || (criandoNovo && nomeNovo && novoTipo)
  const podeSalvar = temLugar && temNota && (foi1 || foi2)

  // Compara o formulário com o estado logo após carregar: só avisa se houve mudança real.
  const snapshot = JSON.stringify({ placeId, data, preco: preco.trim(), obs: obs.trim(), fotos, n1, n2, foi1, foi2 })
  const inicial = useRef(null)
  if (inicial.current === null && carregou) inicial.current = snapshot
  const sujo = inicial.current !== null && snapshot !== inicial.current

  const confirmarDescarte = useCallback(() => ask({
    titulo: 'Descartar esta avaliação?',
    texto: 'Vocês preencheram dados que ainda não foram salvos.',
    okLabel: 'Descartar', danger: true,
  }), [ask])

  // Registra o aviso também para o botão voltar do Android
  useEffect(() => {
    nav.setGuard(sujo ? confirmarDescarte : null)
    return () => nav.setGuard(null)
  }, [sujo, nav, confirmarDescarte])

  async function voltar() {
    if (sujo && !(await confirmarDescarte())) return
    nav.setGuard(null)
    nav.pop()
  }

  async function salvar() {
    if (salvando) return
    setSalvando(true)
    let pid = placeId
    if (pid == null && criandoNovo) {
      pid = await db.places.add({
        nome: nomeNovo, tipo: novoTipo, wishlist: 0, criadoEm: new Date().toISOString(),
      })
    }
    const limpa = n => Object.fromEntries(Object.entries(n).filter(([, v]) => v > 0))
    const registro = {
      placeId: pid,
      data,
      precoPessoa: parseDecimal(preco),
      obs: obs.trim(),
      notas: {
        p1: foi1 && Object.values(n1).some(v => v > 0) ? limpa(n1) : null,
        p2: foi2 && Object.values(n2).some(v => v > 0) ? limpa(n2) : null,
      },
    }
    try {
      if (editando) {
        await db.visits.update(params.visitId, registro)
        await salvarFotos(params.visitId, fotos)
        showToast('Visita atualizada!')
      } else {
        const vid = await db.visits.add({ ...registro, criadoEm: new Date().toISOString() })
        await salvarFotos(vid, fotos)
        const lugar = await db.places.get(pid)
        if (lugar?.wishlist) await db.places.update(pid, { wishlist: 0 })
        const total = await db.visits.count()
        if ([10, 25, 50, 100].includes(total)) {
          showToast(`🎉 ${total}ª visita registrada — que jornada!`)
        } else {
          showToast('Visita salva!')
        }
      }
    } catch (e) {
      // Memória do aparelho cheia: o texto do erro varia entre navegadores.
      const cheio = /quota|storage|full/i.test(e?.name + ' ' + e?.message)
      showToast(cheio
        ? 'Sem espaço no aparelho — tire algumas fotos desta visita e salve de novo'
        : 'Não deu para salvar agora. Tente outra vez.')
      setSalvando(false)
      return
    }
    nav.setGuard(null)
    nav.pop()
  }

  async function excluir() {
    const ok = await ask({
      titulo: 'Excluir esta visita?', texto: 'A avaliação será apagada. Não dá pra desfazer.',
      okLabel: 'Excluir', danger: true,
    })
    if (!ok) return
    const pid = visita?.placeId
    await excluirVisita(params.visitId)
    // Sem nenhuma visita o lugar nao apareceria em lista alguma: volta para "Queremos ir"
    if (pid != null && (await db.visits.where('placeId').equals(pid).count()) === 0) {
      await db.places.update(pid, { wishlist: 1 })
    }
    showToast('Visita excluída')
    nav.setGuard(null)
    nav.pop()
  }

  if (editando && !carregou) {
    return (
      <div className="page no-tabbar">
        <div className="stack-header">
          <button className="icon-btn" aria-label="Voltar" onClick={() => nav.pop()}><ArrowLeft size={20} /></button>
          <div className="title">Editar visita</div>
        </div>
        <div className="card esqueleto" style={{ height: 96 }} />
        <div className="card esqueleto mt12" style={{ height: 210 }} />
        <div className="card esqueleto mt12" style={{ height: 210 }} />
      </div>
    )
  }

  return (
    <div className="page no-tabbar">
      <div className="stack-header">
        <button className="icon-btn" aria-label="Voltar" onClick={voltar}><ArrowLeft size={20} /></button>
        <div className="title">{editando ? 'Editar visita' : 'Nova visita'}</div>
        {editando && <button className="icon-btn danger" aria-label="Excluir visita" onClick={excluir}><Trash2 size={17} /></button>}
      </div>

      {/* ── lugar ── */}
      <div className="card">
        <div className="card-label">Onde vocês foram?</div>
        {lugarFixo || placeId != null ? (
          <div className="spread">
            <div className="row" style={{ gap: 8 }}>
              <MapPin size={17} style={{ color: 'var(--accent)' }} />
              <b style={{ fontSize: 16 }}>{lugarSel?.nome || '…'}</b>
            </div>
            {!lugarFixo && (
              <button className="btn ghost sm" onClick={() => { setPlaceId(null); setBuscaLugar('') }}>trocar</button>
            )}
          </div>
        ) : (
          <>
            <div className="search" style={{ marginBottom: 8 }}>
              <Search size={16} />
              <input
                placeholder={places.length ? 'Nome do restaurante…' : 'Digite o nome para criar o primeiro lugar…'}
                value={buscaLugar}
                onChange={e => { setBuscaLugar(e.target.value); setCriandoNovo(false) }} autoFocus />
            </div>
            {!criandoNovo && sugestoes.map(p => (
              <button key={p.id} className="chip" style={{ margin: '0 6px 6px 0' }}
                onClick={() => setPlaceId(p.id)}>
                {settings.tipos.find(t => t.id === p.tipo)?.emoji} {p.nome}
              </button>
            ))}
            {nomeNovo && !nomeJaExiste && !criandoNovo && (
              <button className="chip on" style={{ display: 'flex', marginTop: 2 }} onClick={() => setCriandoNovo(true)}>
                <Plus size={14} /> Criar “{nomeNovo}”
              </button>
            )}
            {criandoNovo && (
              <div className="mt8">
                <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                  Que tipo de comida é “{nomeNovo}”?
                </div>
                <div className="chip-row">
                  {settings.tipos.map(t => (
                    <button key={t.id} className={`chip${novoTipo === t.id ? ' on' : ''}`} onClick={() => setNovoTipo(t.id)}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── notas (obrigatório) ── */}
      <div className="mt12" />
      <CardAvaliador nome={settings.nomes.p1} notas={n1} setNotas={setN1} foi={foi1} setFoi={setFoi1} />
      <div className="mt8" />
      <CardAvaliador nome={settings.nomes.p2} notas={n2} setNotas={setN2} foi={foi2} setFoi={setFoi2} />

      {/* ── opcionais ── */}
      <div className="card mt12">
        <div className="card-label">Detalhes (opcional)</div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Data da visita</label>
            <input type="date" className="input" value={data} max={hojeISO()} onChange={e => setData(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Preço por pessoa</label>
            <div className="input-prefix">
              <span className="prefix">R$</span>
              <input className="input" inputMode="decimal" placeholder="0,00"
                value={preco} onChange={e => setPreco(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="field mt12" style={{ marginBottom: 0 }}>
          <label>Observações</label>
          <textarea className="input" placeholder="O que marcou essa visita? Prato favorito, momento, veredito…"
            value={obs} onChange={e => setObs(e.target.value)} />
        </div>
      </div>

      {/* ── álbum do momento ── */}
      <div className="card mt12">
        <div className="card-label">📸 Álbum do momento {fotos.length > 0 && `· ${fotos.length}/${MAX_FOTOS}`}</div>
        <div className="foto-strip">
          {fotos.map((f, i) => (
            <div key={i} className="foto-mini">
              <img src={f} alt="" />
              <button className="rm" onClick={() => setFotos(fotos.filter((_, j) => j !== i))}>
                <X size={13} />
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <button className="foto-add" onClick={() => fotoRef.current?.click()}>
              <Camera size={22} />
            </button>
          )}
        </div>
        {fotos.length === 0 && (
          <div className="muted mt8" style={{ fontSize: 12.5 }}>
            Registrem o momento: vocês, o lugar, a mesa, o brinde 🥂
          </div>
        )}
        <input ref={fotoRef} type="file" accept="image/*" multiple hidden
          onChange={async e => {
            const arquivos = [...(e.target.files || [])]
            e.target.value = ''
            const novas = []
            for (const f of arquivos) {
              try { novas.push(await comprimirImagem(f)) }
              catch { showToast('Uma das imagens não pôde ser lida') }
            }
            if (novas.length) setFotos(prev => [...prev, ...novas].slice(0, MAX_FOTOS))
          }} />
      </div>

      <button className="btn primary mt16" disabled={!podeSalvar || salvando} onClick={salvar}>
        <Check size={19} /> {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar visita'}
      </button>
      {!podeSalvar && (
        <div className="muted mt8" style={{ textAlign: 'center', fontSize: 12.5 }}>
          {!temLugar ? 'Escolha ou crie o lugar' : 'Dê pelo menos uma nota'}
        </div>
      )}
    </div>
  )
}
