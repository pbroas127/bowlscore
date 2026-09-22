// GET /api/recalls?brands=Purina%20ONE,Blue%20Buffalo. Pet food recalls from the last 24 months for those brands.
// Without brands it returns every animal and veterinary recall in the window. See src/lib/recalls.ts for the source.
import { FDA_RECALLS_URL, pickRecalls, type FdaRow } from '@/lib/recalls'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}
const SIX_HOURS = 21_600

export const OPTIONS = () => new Response(null, { status: 204, headers: HEADERS })

export async function GET(req: Request) {
  const brands = (new URL(req.url).searchParams.get('brands') ?? '').split(',').map((b) => b.trim().slice(0, 60)).filter(Boolean).slice(0, 40)
  try {
    // The feed is about 1 MB, under the 2 MB data cache limit, so every brand query shares one upstream fetch per six hours.
    const res = await fetch(FDA_RECALLS_URL, { headers: { 'User-Agent': 'BowlScore/1.0 (support@bowlscore.app)', Accept: 'application/json' }, next: { revalidate: SIX_HOURS }, signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`fda ${res.status}`)
    const rows = (await res.json()) as FdaRow[]
    return Response.json({ recalls: pickRecalls(rows, brands) }, { headers: { ...HEADERS, 'Cache-Control': `public, max-age=600, s-maxage=${SIX_HOURS}, stale-while-revalidate=86400` } })
  } catch (err) {
    console.error('recalls: fda feed failed', err)
    return Response.json({ error: 'source_unavailable', recalls: [] }, { status: 502, headers: { ...HEADERS, 'Cache-Control': 'no-store' } })
  }
}
