// usage: node --env-file=.env scripts/gen-mascots.mjs [name ...]
// Generates transparent mascot poses in the style of the chosen logo (option 7). Skips files that already exist,
// so rerunning never spends money twice. Medium quality is about 4 cents each.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const REF = 'assets/logo/option7-style2-dog-cat.png'
const OUT = 'assets/mascots'
const STYLE =
  'Match the reference image exactly: same golden retriever puppy and same orange tabby kitten characters, same soft shaded modern vector illustration style, same warm golden and orange colors, same big glossy dark eyes with white highlights, soft fur tufts, no black outlines. Transparent background, no ring, no circle, no ground shadow, no text. The character is fully inside the frame with generous padding.'

const POSES = {
  'pair-happy': ['high', 'The puppy and the kitten together, cheek to cheek, heads and upper chests only, both smiling at the viewer, puppy with pink tongue out.'],
  'puppy-happy': ['medium', 'Only the puppy, full body, sitting upright facing the viewer, happy open mouth with pink tongue, tail wagging.'],
  'kitten-happy': ['medium', 'Only the kitten, full body, sitting upright facing the viewer, gentle smile, tail curled around its paws.'],
  'puppy-worried': ['medium', 'Only the puppy, head and chest, shocked worried expression, wide eyes, ears drooping back, small open mouth.'],
  'kitten-worried': ['medium', 'Only the kitten, head and chest, shocked worried expression, wide eyes, ears flattened sideways, tiny open mouth.'],
  'puppy-sniffing': ['medium', 'Only the puppy, full body side view, nose down to the ground sniffing curiously, tail up.'],
  'kitten-peeking': ['medium', 'Only the kitten, peeking up over a straight horizontal edge at the bottom of the image, two front paws resting on the edge, only the top half of the face and paws visible, curious eyes.'],
  'pair-celebrating': ['medium', 'The puppy and the kitten together, full bodies, jumping with joy, front paws up, huge smiles, eyes squeezed happy.'],
  'pair-sleeping': ['medium', 'The puppy and the kitten curled up asleep together, eyes closed, peaceful smiles, the kitten resting on the puppy.'],
  'puppy-head': ['medium', 'Only the puppy head, centered, facing the viewer, happy with pink tongue out, head slightly tilted.'],
  'kitten-head': ['medium', 'Only the kitten head, centered, facing the viewer, gentle smile.'],
}

mkdirSync(OUT, { recursive: true })
const wanted = process.argv.slice(2)
for (const [name, [quality, pose]] of Object.entries(POSES)) {
  if (wanted.length && !wanted.includes(name)) continue
  const out = `${OUT}/${name}.png`
  if (existsSync(out)) continue
  const form = new FormData()
  for (const [k, v] of Object.entries({ model: 'gpt-image-1', prompt: `${pose} ${STYLE}`, size: '1024x1024', quality, background: 'transparent', n: '1' })) form.append(k, v)
  form.append('image', new Blob([readFileSync(REF)], { type: 'image/png' }), 'reference.png')
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form })
  const json = await res.json()
  if (!res.ok) { console.error(name, JSON.stringify(json.error ?? json)); continue }
  writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'))
  console.log('saved', out)
}
