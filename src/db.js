import Dexie from 'dexie'

export const db = new Dexie('mesa-pra-dois')

db.version(1).stores({
  places: '++id, nome, tipo, wishlist',
  visits: '++id, placeId, data',
  kv: 'key',
})

// v2: as fotos saem de dentro de `visits` para uma tabela própria. Elas são
// dataURLs de centenas de KB e as telas agregadas (Lugares, Números, Sortear)
// leem todas as visitas — carregar os bytes das imagens ali estourava a memória.
db.version(2).stores({
  places: '++id, nome, tipo, wishlist',
  visits: '++id, placeId, data',
  fotos: '++id, visitId',
  kv: 'key',
}).upgrade(async tx => {
  const visitas = await tx.table('visits').toArray()
  for (const v of visitas) {
    if (!v.fotos?.length) continue
    for (const dataUrl of v.fotos) {
      await tx.table('fotos').add({ visitId: v.id, dataUrl })
    }
    delete v.fotos
    await tx.table('visits').put(v)
  }
})

export const TIPOS_DEFAULT = [
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
  { id: 'hamburguer', emoji: '🍔', label: 'Hambúrguer' },
  { id: 'japones', emoji: '🍣', label: 'Japonês' },
  { id: 'massas', emoji: '🍝', label: 'Massas' },
  { id: 'carnes', emoji: '🥩', label: 'Carnes' },
  { id: 'brasileiro', emoji: '🥘', label: 'Brasileiro' },
  { id: 'mexicano', emoji: '🌮', label: 'Mexicano' },
  { id: 'arabe', emoji: '🥙', label: 'Árabe' },
  { id: 'asiatico', emoji: '🍜', label: 'Asiático' },
  { id: 'frutosdomar', emoji: '🦐', label: 'Frutos do mar' },
  { id: 'bar', emoji: '🍻', label: 'Bar / Petiscos' },
  { id: 'cafe', emoji: '☕', label: 'Café / Doceria' },
  { id: 'padaria', emoji: '🥐', label: 'Padaria / Brunch' },
  { id: 'saudavel', emoji: '🥗', label: 'Saudável' },
  { id: 'outro', emoji: '🍽️', label: 'Outro' },
]

export const SETTINGS_DEFAULT = {
  nomes: { p1: '', p2: '' },
  tiers: { pedirMax: 50, legalMax: 130 },
  tipos: TIPOS_DEFAULT,
  placesKey: '',
  tema: 'claro', // claro | escuro | auto
}

export async function getSettings() {
  const row = await db.kv.get('settings')
  if (!row?.value) return null
  return { ...SETTINGS_DEFAULT, ...row.value, tiers: { ...SETTINGS_DEFAULT.tiers, ...row.value.tiers } }
}

export async function saveSettings(value) {
  await db.kv.put({ key: 'settings', value })
}

export function contarVisitas(placeId) {
  return db.visits.where('placeId').equals(placeId).count()
}

// ---- fotos ----------------------------------------------------------------

export function fotosDaVisita(visitId) {
  return db.fotos.where('visitId').equals(visitId).toArray()
}

export function fotosDasVisitas(visitIds) {
  if (!visitIds?.length) return Promise.resolve([])
  return db.fotos.where('visitId').anyOf(visitIds).toArray()
}

// Substitui o álbum da visita pelo conjunto informado.
export async function salvarFotos(visitId, dataUrls) {
  await db.transaction('rw', db.fotos, async () => {
    await db.fotos.where('visitId').equals(visitId).delete()
    if (dataUrls.length) {
      await db.fotos.bulkAdd(dataUrls.map(dataUrl => ({ visitId, dataUrl })))
    }
  })
}

// ---- exclusões (sempre levando as fotos junto) ----------------------------

export async function excluirVisita(visitId) {
  await db.transaction('rw', db.visits, db.fotos, async () => {
    await db.fotos.where('visitId').equals(visitId).delete()
    await db.visits.delete(visitId)
  })
}

export async function excluirLugar(placeId) {
  await db.transaction('rw', db.places, db.visits, db.fotos, async () => {
    const ids = await db.visits.where('placeId').equals(placeId).primaryKeys()
    if (ids.length) await db.fotos.where('visitId').anyOf(ids).delete()
    await db.visits.where('placeId').equals(placeId).delete()
    await db.places.delete(placeId)
  })
}
