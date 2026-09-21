// Runs before every build. Copies mascots that are not in public/ yet (scripts/clean-alpha.cjs in the
// repo root writes cleaned versions there first, those win) and renders the icons from the logo.
// A missing source file is never an error: <Mascot> skips images that do not exist.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const assets = path.resolve(import.meta.dirname, '../../assets')
const out = path.resolve(import.meta.dirname, '../public/mascots')
fs.mkdirSync(out, { recursive: true })

const mascots = path.join(assets, 'mascots')
for (const f of fs.existsSync(mascots) ? fs.readdirSync(mascots).filter((f) => f.endsWith('.png')) : []) {
  if (!fs.existsSync(path.join(out, f))) await sharp(path.join(mascots, f)).trim().resize(768, 768, { fit: 'contain', background: '#0000' }).png().toFile(path.join(out, f))
}

const logo = path.join(assets, 'logo/option7-style2-dog-cat.png')
if (fs.existsSync(logo)) {
  await sharp(logo).resize(256, 256).png().toFile(path.resolve(import.meta.dirname, '../src/app/icon.png'))
  await sharp(logo).resize(180, 180).flatten({ background: '#FFF8EC' }).png().toFile(path.resolve(import.meta.dirname, '../src/app/apple-icon.png'))
  await sharp(logo).resize(512, 512).png().toFile(path.resolve(import.meta.dirname, '../public/logo.png'))
}
