import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { db, getSettings, saveSettings } from './db'

export async function exportarBackup() {
  const [settings, places, visits] = await Promise.all([
    getSettings(), db.places.toArray(), db.visits.toArray(),
  ])
  const payload = { app: 'mesa-pra-dois', versao: 1, exportadoEm: new Date().toISOString(), settings, places, visits }
  const json = JSON.stringify(payload, null, 2)
  const nome = `mesa-pra-dois-${payload.exportadoEm.slice(0, 10)}.json`

  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: nome, data: json, directory: Directory.Cache, encoding: Encoding.UTF8,
    })
    await Share.share({ title: 'Backup Mesa pra Dois', files: [res.uri] })
  } else {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = nome
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

// modo: 'substituir' | 'mesclar'
export async function importarBackup(json, modo) {
  const data = JSON.parse(json)
  if (data.app !== 'mesa-pra-dois' || !Array.isArray(data.places) || !Array.isArray(data.visits)) {
    throw new Error('Arquivo não é um backup válido do Mesa pra Dois')
  }

  if (modo === 'substituir') {
    await db.transaction('rw', db.places, db.visits, db.kv, async () => {
      await db.places.clear()
      await db.visits.clear()
      const mapa = new Map()
      for (const p of data.places) {
        const { id, ...resto } = p
        mapa.set(id, await db.places.add(resto))
      }
      for (const v of data.visits) {
        const { id, placeId, ...resto } = v
        if (mapa.has(placeId)) await db.visits.add({ ...resto, placeId: mapa.get(placeId) })
      }
      if (data.settings) await saveSettings(data.settings)
    })
    return { lugares: data.places.length, visitas: data.visits.length }
  }

  // mesclar: lugares casam por nome normalizado; visitas por assinatura exata
  const norm = s => (s || '').trim().toLowerCase()
  let novosLugares = 0, novasVisitas = 0
  await db.transaction('rw', db.places, db.visits, async () => {
    const atuais = await db.places.toArray()
    const porNome = new Map(atuais.map(p => [norm(p.nome), p.id]))
    const mapa = new Map()
    for (const p of data.places) {
      const { id, ...resto } = p
      const k = norm(p.nome)
      if (porNome.has(k)) { mapa.set(id, porNome.get(k)) }
      else {
        const novoId = await db.places.add(resto)
        porNome.set(k, novoId)
        mapa.set(id, novoId)
        novosLugares++
      }
    }
    const visitasAtuais = await db.visits.toArray()
    const assinatura = v => `${v.placeId}|${v.data}|${JSON.stringify(v.notas)}`
    const existentes = new Set(visitasAtuais.map(assinatura))
    for (const v of data.visits) {
      const { id, placeId, ...resto } = v
      if (!mapa.has(placeId)) continue
      const nova = { ...resto, placeId: mapa.get(placeId) }
      if (!existentes.has(assinatura(nova))) {
        await db.visits.add(nova)
        existentes.add(assinatura(nova))
        novasVisitas++
      }
    }
  })
  return { lugares: novosLugares, visitas: novasVisitas }
}

export async function apagarTudo() {
  await db.transaction('rw', db.places, db.visits, async () => {
    await db.places.clear()
    await db.visits.clear()
  })
}

// ---- dados de exemplo -------------------------------------------------------

const N = (c, a, b) => ({ comida: c, atendimento: a, ambiente: b })

export async function carregarExemplo() {
  const ano = new Date().getFullYear()
  const lugares = [
    { nome: 'Cantina da Nonna', tipo: 'massas', wishlist: 0 },
    { nome: 'Sushi Kōya', tipo: 'japones', wishlist: 0 },
    { nome: 'Burguer do Zé', tipo: 'hamburguer', wishlist: 0 },
    { nome: 'Parrilla del Sur', tipo: 'carnes', wishlist: 0 },
    { nome: 'Taco Loco', tipo: 'mexicano', wishlist: 0 },
    { nome: 'Bistrô Aurora', tipo: 'outro', wishlist: 0 },
    { nome: 'Café Alecrim', tipo: 'cafe', wishlist: 0 },
    { nome: 'Boteco 71', tipo: 'bar', wishlist: 0 },
    { nome: 'Osteria Felice', tipo: 'massas', wishlist: 1 },
    { nome: 'Kampai Omakase', tipo: 'japones', wishlist: 1 },
  ]
  const visitas = [
    ['Cantina da Nonna', `${ano}-01-17`, 62, N(4.5, 4, 4), N(5, 4.5, 4), 'A carbonara é imbatível. Voltar sempre!'],
    ['Cantina da Nonna', `${ano}-04-12`, 68, N(4.5, 3.5, 4), N(4.5, 4, 4.5), 'Aniversário de namoro 🥂'],
    ['Cantina da Nonna', `${ano}-07-08`, 65, N(5, 4.5, 4), N(4.5, 4.5, 4), ''],
    ['Sushi Kōya', `${ano}-02-02`, 145, N(5, 4.5, 4.5), N(4.5, 4, 5), 'Omakase surpreendente, vale cada centavo'],
    ['Sushi Kōya', `${ano}-06-20`, 158, N(4.5, 4, 4.5), N(4, 4, 4.5), 'Um pouco cheio demais no sábado'],
    ['Burguer do Zé', `${ano}-01-30`, 38, N(4, 3, 2.5), N(4.5, 3.5, 3), 'Melhor custo-benefício da cidade'],
    ['Burguer do Zé', `${ano}-03-15`, 42, N(4, 3.5, 2.5), N(4, 3, 3), 'Bom demais, mas barulhento — melhor pedir em casa'],
    ['Burguer do Zé', `${ano}-05-28`, 40, N(4.5, 3, 3), N(4, 3.5, 3), ''],
    ['Parrilla del Sur', `${ano}-03-08`, 170, N(5, 4.5, 5), N(4.5, 5, 5), 'Jantar dos sonhos ✨ O bife ancho...'],
    ['Taco Loco', `${ano}-04-25`, 55, N(3.5, 4, 3.5), N(3, 3.5, 4), 'Divertido! Margarita boa, tacos ok'],
    ['Bistrô Aurora', `${ano}-05-10`, 120, N(3, 2.5, 4.5), N(2.5, 2, 4.5), 'Lindo, mas o atendimento deixou muito a desejar'],
    ['Café Alecrim', `${ano}-06-01`, 32, N(4, 4.5, 4.5), N(4.5, 5, 4.5), 'Brunch de domingo perfeito ☕'],
    ['Café Alecrim', `${ano}-07-27`, 35, N(4, 4.5, 4), N(4.5, 4.5, 4.5), ''],
    ['Boteco 71', `${ano}-07-18`, 48, N(3.5, 4, 3), N(3.5, 3.5, 3.5), 'Petiscos honestos, chope gelado'],
    ['Sushi Kōya', `${ano}-08-09`, 150, N(5, 5, 4.5), N(5, 4.5, 5), 'A melhor noite do ano até agora 🍣'],
  ]

  await db.transaction('rw', db.places, db.visits, async () => {
    const ids = new Map()
    for (const l of lugares) {
      const id = await db.places.add({ ...l, criadoEm: new Date().toISOString() })
      ids.set(l.nome, id)
    }
    for (const [nome, data, preco, p1, p2, obs] of visitas) {
      await db.visits.add({
        placeId: ids.get(nome), data, precoPessoa: preco,
        notas: { p1, p2 }, obs, criadoEm: new Date().toISOString(),
      })
    }
  })
}
