// Gera assets/icon-*.png e assets/splash*.png a partir de SVG (usa sharp, dep. do @capacitor/assets)
import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('assets', { recursive: true })
mkdirSync('public', { recursive: true })

// símbolo: prato + garfo/faca + coração
const simbolo = (cx, cy, s) => `
  <g transform="translate(${cx} ${cy}) scale(${s})">
    <circle r="300" fill="#ffffff"/>
    <circle r="300" fill="none" stroke="#00000012" stroke-width="8"/>
    <circle r="232" fill="none" stroke="#cfdff2" stroke-width="10"/>
    <!-- garfo -->
    <g stroke="#16324f" stroke-width="17" stroke-linecap="round">
      <line x1="-118" y1="-140" x2="-118" y2="-52"/>
      <line x1="-88"  y1="-140" x2="-88"  y2="-52"/>
      <line x1="-58"  y1="-140" x2="-58"  y2="-52"/>
    </g>
    <path d="M-118 -56 Q-118 -30 -100 -22 L-100 138 Q-100 156 -88 156 Q-76 156 -76 138 L-76 -22 Q-58 -30 -58 -56 Z" fill="#16324f"/>
    <!-- faca -->
    <path d="M62 -148 Q104 -70 96 -16 Q92 6 76 10 L76 -148 Z" fill="#16324f"/>
    <rect x="64" y="-10" width="24" height="164" rx="12" fill="#16324f"/>
    <!-- coração -->
    <path d="M0 96 C-14 66 -62 44 -62 6 C-62 -22 -38 -34 -18 -26 C-8 -22 -4 -16 0 -8 C4 -16 8 -22 18 -26 C38 -34 62 -22 62 6 C62 44 14 66 0 96 Z"
      fill="#2a78d6" transform="translate(-1 -30) scale(0.92)"/>
  </g>`

const iconFull = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a90e2"/>
      <stop offset="100%" stop-color="#16467f"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${simbolo(512, 512, 1.05)}
</svg>`

const iconBg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a90e2"/>
      <stop offset="100%" stop-color="#16467f"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`

// foreground do adaptive icon: zona segura = 66% central
const iconFg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  ${simbolo(512, 512, 0.92)}
</svg>`

const splash = dark => `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <rect width="2732" height="2732" fill="${dark ? '#101722' : '#f4f7fb'}"/>
  ${simbolo(1366, 1366, 1.1)}
</svg>`

const jobs = [
  ['assets/icon-only.png', iconFull],
  ['assets/icon-background.png', iconBg],
  ['assets/icon-foreground.png', iconFg],
  ['assets/splash.png', splash(false)],
  ['assets/splash-dark.png', splash(true)],
  // PWA (iPhone/web)
  ['public/icon-192.png', iconFull, 192],
  ['public/icon-512.png', iconFull, 512],
  ['public/apple-touch-icon.png', iconFull, 180],
]

for (const [out, svg, size] of jobs) {
  let img = sharp(Buffer.from(svg))
  if (size) img = img.resize(size, size)
  await img.png().toFile(out)
  console.log('ok', out)
}
