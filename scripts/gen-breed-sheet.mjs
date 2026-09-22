// usage: node --env-file=.env scripts/gen-breed-sheet.mjs <sheet-name> "<Breed 1>" ... "<Breed 6>"
// ONE paid call (about 6 to 8 cents, medium quality, 1536x1024): six breed heads in a 3 by 2 grid, in the style of the
// app's puppy head, which is sent as the reference. The sheet is then cut into six heads framed like the original
// (768 square, transparent, same margins) so they drop into the app wherever puppy-head.png is used.
// Never loops: one sheet per run, and it refuses to overwrite a sheet that already exists, so money is never spent twice.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('../site/node_modules/sharp')

const [name, ...breeds] = process.argv.slice(2)
if (!name || breeds.length !== 6) throw new Error('usage: gen-breed-sheet.mjs <sheet-name> and exactly six breeds')
// Sheets named icons-* are objects (bowls, cups, cans) for the feeding and fit cards, drawn in the same clay style.
const icons = name.startsWith('icons')
const dir = icons ? 'assets/icons' : 'assets/mascots/breeds'
mkdirSync(`${dir}/sheets`, { recursive: true })
const sheet = `${dir}/sheets/${name}.png`
// "Husky (gray mask, blue eyes)" names the file husky-head.png: the part in brackets is only a drawing hint.
const slug = (s) => s.replace(/\(.*\)/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Sheets named cat-* are kittens, drawn from the kitten head; everything else is puppies from the puppy head.
const cat = name.startsWith('cat')
const [animal, face, ref] = cat
  ? ['kitten', 'the same big round glossy dark eyes with white highlights, the same small pink nose and the same gentle closed mouth smile, no tongue', 'app/assets/mascots/kitten-head.png']
  : ['puppy', 'the same big round glossy brown eyes with white highlights, the same happy open mouth smile with the pink tongue hanging out', 'app/assets/mascots/puppy-head.png']

if (!existsSync(sheet)) {
  const prompt = icons ? `A sprite sheet of SIX separate objects arranged in a clean grid of 3 columns and 2 rows, evenly spaced, each object centered in its own cell with clear empty space around it, nothing overlapping or touching, no text, no numbers, no labels, no borders, no shadows on the ground, fully transparent background.
Every object is drawn in EXACTLY the rendering style of the reference image: the same soft 3D clay like cartoon look, the same warm saturated colors, the same soft lighting and gentle highlights, simple rounded shapes, three quarter front view. Friendly and simple, readable at a small size.
Top row, left to right: ${breeds.slice(0, 3).join(', ')}.
Bottom row, left to right: ${breeds.slice(3).join(', ')}.` : `A sprite sheet of SIX ${animal} heads arranged in a clean grid of 3 columns and 2 rows, evenly spaced, each head centered in its own cell with clear empty space around it, nothing overlapping or touching, no text, no labels, no borders, fully transparent background.
Every head is drawn in EXACTLY the style of the reference image: the same soft 3D clay like cartoon rendering, the same front facing angle, ${face}, the same head size, proportions and fluffy neck fur at the bottom. Only the breed changes: coat colors, markings, ear shape and fur length must clearly read as that breed as a ${animal}.
Top row, left to right: ${breeds.slice(0, 3).join(', ')}.
Bottom row, left to right: ${breeds.slice(3).join(', ')}.`
  const form = new FormData()
  for (const [k, v] of Object.entries({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'medium', background: 'transparent', n: '1' })) form.append(k, v)
  form.append('image', new Blob([readFileSync(ref)], { type: 'image/png' }), 'reference.png')
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json.error ?? json))
  writeFileSync(sheet, Buffer.from(json.data[0].b64_json, 'base64'))
  // gpt-image-1: text in $5, image in $10, image out $40 per million tokens.
  const u = json.usage ?? {}
  const d = u.input_tokens_details ?? {}
  const cost = ((d.text_tokens ?? 0) * 5 + (d.image_tokens ?? 0) * 10 + (u.output_tokens ?? 0) * 40) / 1e6
  console.log('usage', JSON.stringify(u), `cost about $${cost.toFixed(3)}`)
} else console.log('sheet already exists, slicing only (no charge)')

// Cut: each cell, trim to the artwork, then place it on a 768 square the way the original head sits (about 90 percent wide).
// Heads do not sit neatly inside a 3 by 2 grid (big ears cross the lines), so find each head by its own outline:
// label the opaque blobs on a coarse 4 px grid, keep the six biggest, and copy only that blob's pixels.
const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const B = 4
const [gw, gh] = [Math.ceil(info.width / B), Math.ceil(info.height / B)]
function segment(minAlpha, reach) {
  const solid = new Uint8Array(gw * gh)
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > minAlpha) solid[Math.floor(y / B) * gw + Math.floor(x / B)] = 1
  const label = new Int32Array(gw * gh).fill(-1)
  const blobs = []
  for (let start = 0; start < solid.length; start++) {
    if (!solid[start] || label[start] >= 0) continue
    const blob = { id: blobs.length, size: 0, x0: gw, y0: gh, x1: 0, y1: 0 }
    const stack = [start]
    label[start] = blob.id
    while (stack.length) {
      const c = stack.pop()
      const [x, y] = [c % gw, Math.floor(c / gw)]
      blob.size++
      blob.x0 = Math.min(blob.x0, x); blob.x1 = Math.max(blob.x1, x); blob.y0 = Math.min(blob.y0, y); blob.y1 = Math.max(blob.y1, y)
      for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) { // a small reach joins loose fur wisps to their head
        const [nx, ny] = [x + dx, y + dy]
        const n = ny * gw + nx
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && solid[n] && label[n] < 0) { label[n] = blob.id; stack.push(n) }
      }
    }
    blobs.push(blob)
  }
  // A real head is at least a quarter of an even share of the sheet; anything smaller is a stray wisp.
  const big = blobs.filter((b) => b.size > (gw * gh) / 6 / 4).sort((a, b) => b.size - a.size)
  return { label, heads: big.length === 6 ? big : null }
}
// Heads that almost touch merge into one blob, so tighten step by step: less reach, then only solid pixels.
let label, heads
for (const [minAlpha, reach] of [[24, 2], [24, 1], [96, 1], [160, 0], [220, 0]]) {
  ;({ label, heads } = segment(minAlpha, reach))
  if (heads) break
}
if (!heads) {
  // Ears that really overlap cannot be told apart by transparency. Cut the sheet along its emptiest lines instead:
  // the row nearest the middle, then in each half the columns nearest a third and two thirds with the least paint.
  const opaque = (x, y) => data[(y * info.width + x) * 4 + 3] > 24
  const valley = (from, to, count) => { let best = from, low = Infinity; for (let v = from; v <= to; v++) { const n = count(v); if (n < low) { low = n; best = v } } return best }
  const band = (a, b) => Math.round(a + (b - a) * 0.15)
  const midRow = valley(band(info.height * 0.5, 0), band(info.height * 0.5, info.height), (y) => { let n = 0; for (let x = 0; x < info.width; x++) n += opaque(x, y); return n })
  label = new Int32Array(gw * gh).fill(-1)
  heads = []
  for (const [top, bottom] of [[0, midRow], [midRow, info.height]]) {
    const cols = (y0, y1) => (x) => { let n = 0; for (let y = y0; y < y1; y++) n += opaque(x, y); return n }
    const c1 = valley(Math.round(info.width * 0.25), Math.round(info.width * 0.42), cols(top, bottom))
    const c2 = valley(Math.round(info.width * 0.58), Math.round(info.width * 0.75), cols(top, bottom))
    for (const [left, right] of [[0, c1], [c1, c2], [c2, info.width]]) {
      const h = { id: 1000 + heads.length, x0: gw, y0: gh, x1: 0, y1: 0 }
      for (let cy = Math.ceil(top / B); cy < Math.floor(bottom / B); cy++) for (let cx = Math.ceil(left / B); cx < Math.floor(right / B); cx++) {
        let any = false
        for (let y = cy * B; y < Math.min(info.height, cy * B + B) && !any; y++) for (let x = cx * B; x < Math.min(info.width, cx * B + B); x++) if (data[(y * info.width + x) * 4 + 3] > 8) { any = true; break }
        if (any) label[cy * gw + cx] = h.id
      }
      heads.push(h)
    }
  }
  console.log('heads touch, cut along the emptiest lines instead')
}
// Give each head back its soft fur edge, which a tight cut leaves out: grow labels into faint neighbouring cells.
const soft = new Uint8Array(gw * gh)
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) soft[Math.floor(y / B) * gw + Math.floor(x / B)] = 1
const keep = new Set(heads.map((h) => h.id))
for (let pass = 0; pass < 4; pass++) {
  const next = label.slice()
  for (let c = 0; c < label.length; c++) {
    if (!soft[c] || keep.has(label[c])) continue
    const [x, y] = [c % gw, Math.floor(c / gw)]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (y + dy) * gw + x + dx
      if (x + dx >= 0 && x + dx < gw && y + dy >= 0 && y + dy < gh && keep.has(label[n])) { next[c] = label[n]; break }
    }
  }
  label.set(next)
}
for (const h of heads) for (let c = 0; c < label.length; c++) if (label[c] === h.id) { // bounding box after growing
  const [x, y] = [c % gw, Math.floor(c / gw)]
  h.x0 = Math.min(h.x0, x); h.x1 = Math.max(h.x1, x); h.y0 = Math.min(h.y0, y); h.y1 = Math.max(h.y1, y)
}
// Reading order: top row then bottom row, left to right.
const midY = (h) => (h.y0 + h.y1) / 2
const rowSplit = (Math.min(...heads.map(midY)) + Math.max(...heads.map(midY))) / 2
heads.sort((a, b) => (midY(a) > rowSplit) - (midY(b) > rowSplit) || a.x0 - b.x0)

for (const [i, h] of heads.entries()) {
  const [left, top] = [h.x0 * B, h.y0 * B]
  const [w, hh] = [Math.min(info.width, (h.x1 + 1) * B) - left, Math.min(info.height, (h.y1 + 1) * B) - top]
  const px = Buffer.alloc(w * hh * 4)
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const [sx, sy] = [left + x, top + y]
    if (label[Math.floor(sy / B) * gw + Math.floor(sx / B)] !== h.id) continue // another head's pixels stay transparent
    data.copy(px, (y * w + x) * 4, (sy * info.width + sx) * 4, (sy * info.width + sx) * 4 + 4)
    if (px[(y * w + x) * 4 + 3] < 12) px[(y * w + x) * 4 + 3] = 0 // faint haze from the painted backdrop, invisible but it would grey the edge
  }
  // Framed like puppy-head.png: the artwork fills about 90 percent of a 768 square, centered.
  const head = await sharp(px, { raw: { width: w, height: hh, channels: 4 } }).trim({ threshold: 1 }).resize(690, 690, { fit: 'inside' }).png().toBuffer()
  const out = `${dir}/${slug(breeds[i])}${icons ? '' : '-head'}.png`
  await sharp({ create: { width: 768, height: 768, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: head, gravity: 'center' }]).png().toFile(out)
  console.log('wrote', out)
}
