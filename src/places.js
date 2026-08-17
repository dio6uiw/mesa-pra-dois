// Cliente da Google Places API (New) — busca de restaurantes reais.
// Chave: settings.placesKey (por aparelho) sobrescreve a padrão do build (.env.local).
export const PLACES_KEY_PADRAO = import.meta.env.VITE_PLACES_KEY || ''

export function chaveEfetiva(settings) {
  return settings?.placesKey?.trim() || PLACES_KEY_PADRAO
}

const FIELDS = [
  'places.id', 'places.displayName', 'places.rating', 'places.userRatingCount',
  'places.priceLevel', 'places.currentOpeningHours.openNow', 'places.primaryType',
  'places.primaryTypeDisplayName', 'places.location', 'places.shortFormattedAddress',
  'places.photos',
].join(',')

// meu tipo → tipos do Google (p/ filtro); o primeiro é o principal
export const TIPO_PARA_GOOGLE = {
  pizza: ['pizza_restaurant'],
  hamburguer: ['hamburger_restaurant', 'fast_food_restaurant'],
  japones: ['japanese_restaurant', 'sushi_restaurant'],
  massas: ['italian_restaurant'],
  carnes: ['steak_house', 'barbecue_restaurant'],
  brasileiro: ['brazilian_restaurant'],
  mexicano: ['mexican_restaurant'],
  arabe: ['middle_eastern_restaurant', 'lebanese_restaurant'],
  asiatico: ['asian_restaurant', 'chinese_restaurant', 'ramen_restaurant', 'thai_restaurant', 'korean_restaurant'],
  frutosdomar: ['seafood_restaurant'],
  bar: ['bar', 'pub', 'bar_and_grill'],
  cafe: ['cafe', 'coffee_shop', 'dessert_shop', 'ice_cream_shop'],
  padaria: ['bakery', 'breakfast_restaurant', 'brunch_restaurant'],
  saudavel: ['vegetarian_restaurant', 'vegan_restaurant'],
}

export function googleTypeParaTipo(primaryType) {
  for (const [tipo, gtypes] of Object.entries(TIPO_PARA_GOOGLE)) {
    if (gtypes.includes(primaryType)) return tipo
  }
  return 'outro'
}

// PRICE_LEVEL_* → tier do app e cifrões
export function priceLevelInfo(priceLevel) {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE': return { tier: 'pedir', cifra: '$' }
    case 'PRICE_LEVEL_MODERATE': return { tier: 'legal', cifra: '$$' }
    case 'PRICE_LEVEL_EXPENSIVE': return { tier: 'chique', cifra: '$$$' }
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return { tier: 'chique', cifra: '$$$$' }
    default: return { tier: null, cifra: null }
  }
}

export function distanciaKm(a, b) {
  const R = 6371
  const dLat = (b.latitude - a.latitude) * Math.PI / 180
  const dLon = (b.longitude - a.longitude) * Math.PI / 180
  const la1 = a.latitude * Math.PI / 180
  const la2 = b.latitude * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

async function chamar(key, endpoint, body) {
  let res
  try {
    res = await fetch(`https://places.googleapis.com/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Sem conexão com a internet')
  }
  if (!res.ok) {
    const erro = await res.json().catch(() => null)
    const msg = erro?.error?.message || `HTTP ${res.status}`
    if (res.status === 403 || res.status === 401 || /api key not valid/i.test(msg)) {
      throw new Error('Chave recusada pelo Google — confira se ela está certa, se a Places API (New) está ativada e o faturamento habilitado no projeto. Detalhe: ' + msg)
    }
    if (res.status === 429) throw new Error('Muitas buscas em sequência — espera um minuto e tenta de novo')
    throw new Error(msg)
  }
  const data = await res.json()
  return data.places || []
}

function fotoUrl(photo, key) {
  if (!photo?.name) return null
  return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=400&key=${key}`
}

function normaliza(places, centro, key) {
  return places
    .filter(p => p.displayName?.text)
    .map(p => {
      const preco = priceLevelInfo(p.priceLevel)
      return {
        googleId: p.id,
        nome: p.displayName.text,
        nota: p.rating ?? null,
        avaliacoes: p.userRatingCount ?? 0,
        abertoAgora: p.currentOpeningHours?.openNow ?? null,
        tipo: googleTypeParaTipo(p.primaryType),
        tipoGoogle: p.primaryTypeDisplayName?.text || null,
        tierPrevisto: preco.tier,
        cifra: preco.cifra,
        endereco: p.shortFormattedAddress || null,
        distanciaKm: centro && p.location ? distanciaKm(centro, p.location) : null,
        fotoUrl: fotoUrl(p.photos?.[0], key),
      }
    })
    .sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || b.avaliacoes - a.avaliacoes)
}

// Busca por raio a partir de uma coordenada (GPS)
export async function buscarPorRaio(key, { latitude, longitude }, raioMetros, tipoId) {
  const includedTypes = tipoId ? TIPO_PARA_GOOGLE[tipoId] || ['restaurant'] : ['restaurant']
  const places = await chamar(key, 'places:searchNearby', {
    includedTypes,
    maxResultCount: 20,
    rankPreference: 'POPULARITY',
    languageCode: 'pt-BR',
    regionCode: 'BR',
    locationRestriction: { circle: { center: { latitude, longitude }, radius: raioMetros } },
  })
  return normaliza(places, { latitude, longitude }, key)
}

// Busca por texto ("pizzarias em Mococa")
export async function buscarPorCidade(key, cidade, tipoLabel) {
  const places = await chamar(key, 'places:searchText', {
    textQuery: `${tipoLabel || 'restaurantes'} em ${cidade}`,
    pageSize: 20,
    languageCode: 'pt-BR',
    regionCode: 'BR',
  })
  return normaliza(places, null, key)
}
