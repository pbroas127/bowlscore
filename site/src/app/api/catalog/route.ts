// GET /api/catalog. The scored product catalog. Built once at build time (the catalog and the rubric are both
// code, so a deploy is the only thing that can change the answer), open CORS like /api/scan, no auth.
import { CATALOG_VERSION, PRODUCTS } from '@/lib/catalog'

export const dynamic = 'force-static'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
}

export const GET = () => Response.json({ version: CATALOG_VERSION, products: PRODUCTS }, { headers: HEADERS })
export const OPTIONS = () => new Response(null, { status: 204, headers: HEADERS })
