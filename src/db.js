import Dexie from 'dexie'

export const db = new Dexie('mesa-pra-dois')

db.version(1).stores({
  places: '++id, nome, tipo, wishlist',
  visits: '++id, placeId, data',
  kv: 'key',
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
  if (!row) return null
  return { ...SETTINGS_DEFAULT, ...row.value, tiers: { ...SETTINGS_DEFAULT.tiers, ...row.value.tiers } }
}

export async function saveSettings(value) {
  await db.kv.put({ key: 'settings', value })
}
