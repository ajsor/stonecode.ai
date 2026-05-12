// One-shot OG image generator. Run with `node scripts/generate-og-image.mjs`.
// Produces public/og-image.png (1200x630) and public/og-image.svg (source).
// Re-run whenever the brand or tagline changes.

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glowTL" cx="0" cy="0" r="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ea580c" stop-opacity="0.55"/>
      <stop offset="0.35" stop-color="#fb923c" stop-opacity="0.18"/>
      <stop offset="0.7" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBR" cx="1200" cy="630" r="800" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f59e0b" stop-opacity="0.30"/>
      <stop offset="0.6" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fb923c"/>
      <stop offset="1" stop-color="#ea580c"/>
    </linearGradient>
    <linearGradient id="logoShine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#020617"/>
  <rect width="1200" height="630" fill="url(#glowTL)"/>
  <rect width="1200" height="630" fill="url(#glowBR)"/>

  <!-- Subtle grid texture -->
  <g opacity="0.06" stroke="#fb923c" stroke-width="1">
    <line x1="0" y1="157" x2="1200" y2="157"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="472" x2="1200" y2="472"/>
    <line x1="300" y1="0" x2="300" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="900" y1="0" x2="900" y2="630"/>
  </g>

  <!-- Logo -->
  <g transform="translate(540, 130)">
    <rect width="120" height="120" rx="26" fill="url(#logoGrad)"/>
    <rect width="120" height="120" rx="26" fill="url(#logoShine)"/>
    <g transform="translate(60, 60)" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <polyline points="-12,-22 -36,0 -12,22"/>
      <polyline points="12,-22 36,0 12,22"/>
    </g>
  </g>

  <!-- Wordmark -->
  <text x="600" y="380" text-anchor="middle"
        font-family="'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif"
        font-size="106" font-weight="700" letter-spacing="-4" fill="#f8fafc">
    stonecode<tspan fill="#fb923c" font-weight="300">.ai</tspan>
  </text>

  <!-- Tagline -->
  <text x="600" y="450" text-anchor="middle"
        font-family="'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif"
        font-size="34" font-weight="400" letter-spacing="-0.5" fill="#cbd5e1">
    Where ambition meets precision.
  </text>

  <!-- Subtitle -->
  <text x="600" y="510" text-anchor="middle"
        font-family="'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif"
        font-size="22" font-weight="400" fill="#64748b">
    AI-augmented software development by Andrew Stone
  </text>

  <!-- Footer URL -->
  <text x="600" y="582" text-anchor="middle"
        font-family="'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif"
        font-size="18" font-weight="500" letter-spacing="2" fill="#475569">
    STONECODE.AI
  </text>
</svg>`

writeFileSync(resolve(publicDir, 'og-image.svg'), svg)

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(resolve(publicDir, 'og-image.png'))

console.log('Wrote public/og-image.png + public/og-image.svg')
