import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { scoreFood } from '@/lib/rubric'
import { SAMPLES } from '@/lib/samples'

export const alt = 'BowlScore: know what is really in the bowl'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Bricolage Grotesque 800 as a TTF (Google serves TTF to clients that do not announce woff2 support).
// If the fetch fails at build time the image still renders with the default font.
async function displayFont() {
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800')).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function Image() {
  const best = SAMPLES[SAMPLES.length - 1]
  const { score } = scoreFood(best.label, best.species)
  const mascots = await readFile(path.join(process.cwd(), 'public/mascots/pair-happy.png')).then((b) => `data:image/png;base64,${b.toString('base64')}`, () => null)
  const font = await displayFont()
  const r = 118
  const c = 2 * Math.PI * r

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF8EC', padding: '64px 72px', color: '#231F1A', fontFamily: 'Bricolage' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 640 }}>
          <div style={{ fontSize: 40, letterSpacing: -1 }}>BowlScore</div>
          <div style={{ fontSize: 84, lineHeight: 0.98, letterSpacing: -3, marginTop: 28 }}>Know what is really in the bowl.</div>
          <div style={{ fontSize: 30, marginTop: 32, color: '#6B6358' }}>The pet food scanner for dogs and cats</div>
        </div>
        <div style={{ display: 'flex', position: 'relative', width: 400, height: 500, alignItems: 'flex-start', justifyContent: 'center' }}>
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="140" cy="140" r={r} fill="none" stroke="#EFE6D6" strokeWidth="24" />
            <circle cx="140" cy="140" r={r} fill="none" stroke="#22B866" strokeWidth="24" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 60, width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 112, letterSpacing: -4 }}>{score}</div>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img tags */}
          {mascots && <img src={mascots} width={300} height={300} alt="" style={{ position: 'absolute', bottom: -20, left: 50 }} />}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: 'Bricolage', data: font, weight: 800, style: 'normal' }] : undefined },
  )
}
