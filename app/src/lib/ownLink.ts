// Pure, so links.test.ts runs in plain node. The Associates tag lives here and links.ts uses it.
export const AMAZON_TAG = 'bowlscore-20'

// A reorder link the person pasted. Amazon product and search links get our tag (replacing anyone else's); short
// links (amzn.to, a.co) and other stores open exactly as pasted, since a tag cannot be added to them reliably.
export function ownLink(raw: string): string | undefined {
  const text = raw.trim().match(/https?:\/\/\S+/)?.[0] ?? (/^[\w.-]+\.[a-z]{2,}\//i.test(raw.trim()) ? `https://${raw.trim()}` : undefined)
  if (!text) return undefined
  try {
    const url = new URL(text)
    if (/(^|\.)amazon\.com$/i.test(url.hostname)) url.searchParams.set('tag', AMAZON_TAG)
    return url.toString()
  } catch { return undefined }
}
