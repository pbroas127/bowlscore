import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/methodology', '/support', '/privacy', '/terms', '/affiliate-disclosure'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date('2026-09-21'),
    priority: path === '' ? 1 : path === '/methodology' ? 0.8 : 0.4,
  }))
}
