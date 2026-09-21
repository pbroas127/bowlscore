import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  // Every badge and QR code points at /get so the App Store link lives in one place.
  // Query strings pass through, so /get?ct=qr_hero arrives at Apple as a campaign token.
  redirects: async () => [{ source: '/get', destination: 'https://apps.apple.com/app/id6814359922', permanent: false }],
}

export default nextConfig
