// Copy rule: no hyphens, en dashes or em dashes in anything a visitor can read.
// Scans the built HTML (run after `npm run build`). Checks text nodes, alt, title, aria-label and
// placeholder attributes, title and description style meta tags, and the sentences inside JSON LD.
// Ignores URLs, email addresses, class names, scripts, styles and other code.
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(import.meta.dirname, '../.next/server/app')
if (!fs.existsSync(dir)) {
  console.error('No build output found. Run `npm run build` first.')
  process.exit(1)
}

const DASH = /[-‐-―−]/
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const stripUrls = (s) => s.replace(/https?:\/\/\S+/g, '').replace(/\S+@\S+\.\S+/g, '')

const problems = []
const check = (file, where, raw) => {
  const text = stripUrls(decode(raw))
  if (DASH.test(text)) problems.push(`${file} [${where}] ${text.trim().slice(0, 140)}`)
}

const walkJson = (file, v, key = '') => {
  if (typeof v === 'string') return key.startsWith('@') || check(file, `json ld ${key}`, v)
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkJson(file, x, Array.isArray(v) ? key : k)
}

const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.html'))
for (const file of files) {
  let html = fs.readFileSync(path.join(dir, file), 'utf8')

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) walkJson(file, JSON.parse(m[1]))
  for (const m of html.matchAll(/<meta\s+(?:name|property)="([^"]*(?:title|description|site_name|alt)[^"]*)"\s+content="([^"]*)"/g)) check(file, `meta ${m[1]}`, m[2])
  for (const m of html.matchAll(/\s(alt|title|aria-label|placeholder)="([^"]*)"/g)) check(file, m[1], m[2])

  html = html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/g, ' ')
  for (const m of html.matchAll(/>([^<]+)</g)) check(file, 'text', m[1])
}

// The demo scores its other samples in the browser, so that copy never reaches the built HTML. Check it here.
const { SAMPLES } = await import('../src/lib/samples.ts')
const { scoreFood } = await import('../src/lib/rubric.ts')
for (const s of SAMPLES) {
  check('samples.ts', s.id, [s.name, s.kind, ...s.label.ingredients].join(' | '))
  for (const species of ['dog', 'cat']) for (const f of scoreFood(s.label, species).flags) check('rubric.ts', s.id, f.title + ' | ' + f.detail)
}

if (problems.length) {
  console.error(`Dash check failed, ${problems.length} problem(s):\n` + problems.join('\n'))
  process.exit(1)
}
console.log(`Dash check passed: ${files.length} HTML files, no hyphens or dashes in visible copy.`)
