import Link from 'next/link'
import { Mascot } from '@/components/Mascot'

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[80dvh] flex-col items-center justify-center pt-24 text-center">
      <Mascot name="kitten-peeking" size={220} alt="The BowlScore kitten peeking over a ledge" />
      <h1 className="mt-6 text-[clamp(2.25rem,5vw,3.5rem)]">Nothing in this bowl.</h1>
      <p className="lede mt-4">The page you were looking for is not here.</p>
      <Link href="/" className="btn mt-8">
        <span>Back to the home page</span>
      </Link>
    </div>
  )
}
