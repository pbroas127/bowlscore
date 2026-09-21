import qrcode from 'qrcode-generator'
import { SITE_URL } from '@/lib/site'

// Rendered on the server, so the QR ships as static SVG and no QR library reaches the browser.
// Desktop with a mouse only: on a phone the badge is the faster path.
export function QrCard({ placement }: { placement: string }) {
  const qr = qrcode(0, 'M')
  qr.addData(`${SITE_URL}/get?ct=qr_${placement}`)
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`
  return (
    <div className="hidden items-center gap-3 rounded-card bg-surface p-3 pr-5 shadow-warm [@media(min-width:1024px)_and_(pointer:fine)]:flex">
      <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="size-24" shapeRendering="crispEdges" role="img" aria-label="QR code that opens BowlScore on the App Store">
        <path d={d} fill="#231F1A" />
      </svg>
      <p className="max-w-[9ch] text-[15px] leading-tight font-medium">Scan with your iPhone camera</p>
    </div>
  )
}
