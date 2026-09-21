// usage: node scripts/make-icon.mjs
// Final app icon: the high quality mascot pair inside a ring drawn in code, so the circle is mathematically perfect
// and nothing clips it (image models cannot draw a clean ring). Writes assets/logo/icon-final.png (1024, no alpha).
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('../site/node_modules/sharp')

const S = 1024, C = S / 2
const R = 408, STROKE = 66            // ring radius and thickness
const INNER = R - STROKE / 2 - 6      // pets are clipped to just inside the ring
const circumference = 2 * Math.PI * R
const filled = 0.75                   // three quarters, like the chosen logo

const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF9E6"/><stop offset="1" stop-color="#FFE38F"/></linearGradient></defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <circle cx="${C}" cy="${C}" r="${INNER}" fill="#FFF6D8"/>
</svg>`)

const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#F1E6C8" stroke-width="${STROKE}"/>
  <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#25B85F" stroke-width="${STROKE}" stroke-linecap="round"
    stroke-dasharray="${circumference * filled} ${circumference}" transform="rotate(-90 ${C} ${C})"/>
</svg>`)

// Pets: trim to their artwork, scale up so the chests run past the bottom of the circle, then clip to the circle.
const PET_W = 800
const pets = await sharp('assets/mascots/pair-happy.png').trim().resize({ width: PET_W }).toBuffer({ resolveWithObject: true })
const left = Math.round(C - PET_W / 2), top = Math.round(C - pets.info.height * 0.44)
const petsLayer = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: pets.data, left, top }]).png().toBuffer()
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><circle cx="${C}" cy="${C}" r="${INNER}" fill="#fff"/></svg>`)
const clipped = await sharp(petsLayer).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()

await sharp(background).composite([{ input: clipped }, { input: ring }]).flatten({ background: '#FFF9E6' }).removeAlpha().png().toFile('assets/logo/icon-final.png')
console.log('wrote assets/logo/icon-final.png')
