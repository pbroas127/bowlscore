// usage: node --env-file=.env scripts/gen-image.mjs <out.png> <low|medium|high> "<prompt>" [reference.png]
// With a reference image it calls the edits endpoint so the style carries over.
// ponytail: one image per call, no batching. $10 budget: low ~1c, medium ~4c, high ~17c at 1024x1024.
import { readFileSync, writeFileSync } from 'node:fs'

const [out, quality, prompt, ref] = process.argv.slice(2)
if (!out || !quality || !prompt) throw new Error('usage: gen-image.mjs <out.png> <quality> "<prompt>" [reference.png]')

const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
const fields = { model: 'gpt-image-1', prompt, size: '1024x1024', quality, n: '1' }
let res
if (ref) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  form.append('image', new Blob([readFileSync(ref)], { type: 'image/png' }), 'reference.png')
  res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form })
} else {
  res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...fields, n: 1 }),
  })
}
const json = await res.json()
if (!res.ok) throw new Error(JSON.stringify(json.error ?? json))
writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'))
console.log('saved', out, JSON.stringify(json.usage ?? {}))
