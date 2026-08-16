# 🍽️ Mesa pra Dois

Diário gastronômico do casal: registrem cada visita a restaurante com notas de 0 a 5
em **comida, atendimento e ambiente** — cada um dá a sua nota, o app calcula a média
do casal e rankeia os lugares.

## Como funciona

- **Nota da visita** = média dos 3 pilares de cada pessoa → média dos dois.
- **Nota do lugar** = média de todas as visitas (nota absoluta, nunca muda retroativamente).
- **Categoria de preço** sai da média de `preço por pessoa` das visitas:
  - 🛵 **Só pra pedir** (até R$ 50 por padrão)
  - 😎 **Lugar legal** (até R$ 130 por padrão)
  - ✨ **Lugar chique** (acima disso) — faixas configuráveis em Ajustes.
- **Quero ir**: wishlist do casal; ao tocar "Fomos!" o lugar vira avaliação.
- **Números**: KPIs, sintonia do casal (% de concordância), média por pilar
  (ele × ela), visitas por mês, tipos de comida, tiers, top lugares e custo-benefício.
- **Backup**: exporta/importa JSON (Ajustes) — dá pra compartilhar via WhatsApp
  e importar no outro celular (substituir ou mesclar).

Os dados ficam **somente no aparelho** (IndexedDB via Dexie). Sem servidor.

## Stack

React 18 + Vite 6 + Capacitor 8 (Android) · Dexie (IndexedDB) · Recharts · lucide-react

## Desenvolvimento

```bash
npm install
npm run dev          # abre em http://localhost:5199
```

## Gerar o APK

Pré-requisitos: JDK 21 (JAVA_HOME) e Android SDK em C:\Android\sdk (android/local.properties).

```bash
npm run android:debug
```

APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.
Para instalar: mandar o APK pro celular (WhatsApp/Drive/cabo) e abrir —
precisa permitir "instalar apps de fontes desconhecidas".

Ícones/splash: editar `scripts/gen-assets.mjs` e rodar
`node scripts/gen-assets.mjs && npx capacitor-assets generate --android`.

## iPhone (PWA)

O build (`npm run build`) já sai como PWA instalável (manifest + service worker
offline + ícones iOS). Basta hospedar a pasta `dist/` em qualquer URL HTTPS
estática; no iPhone: abrir no Safari → Compartilhar → **Adicionar à Tela de Início**.
Vira app com ícone, tela cheia e funciona offline; os dados ficam no aparelho
(IndexedDB) e sincronizam entre celulares pelo backup JSON de Ajustes.

App iOS nativo: exige Mac com Xcode — `npx cap add ios` no Mac e o mesmo código compila.

## Estrutura

```
src/
  db.js            # Dexie: places, visits, kv(settings) + tipos default
  logic.js         # médias, tiers, formatação pt-BR, indicadores do dashboard
  backup.js        # export/import JSON (Share nativo), dados de exemplo
  theme.css        # design system (tema claro, branco + azul #2a78d6)
  components/      # StarInput (0–5 c/ meia estrela + arraste), badges, toast/confirm
  pages/           # Lugares, Quero ir, Nova visita, Detalhe, Números, Ajustes, Onboarding
  App.jsx          # navegação por pilha + tab bar + botão voltar Android
```
