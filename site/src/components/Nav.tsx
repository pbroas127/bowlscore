import Image from 'next/image'
import Link from 'next/link'

export function Nav() {
  return (
    <header className="nav fixed inset-x-0 top-0 z-40">
      <div className="wrap flex h-[68px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="BowlScore home">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-[10px]" />
          <span className="font-display text-[22px] font-extrabold tracking-tight">BowlScore</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 text-[16px] font-medium md:flex">
          <Link href="/#how" className="link link-draw">How it works</Link>
          <Link href="/methodology" className="link link-draw">Methodology</Link>
          <Link href="/#pricing" className="link link-draw">Pricing</Link>
        </nav>
        <a href="/get?ct=nav" className="btn text-[15px]">
          <span>Get the app</span>
        </a>
      </div>
    </header>
  )
}
