import fs from 'node:fs'
import path from 'node:path'
import Image from 'next/image'

export type MascotName =
  | 'pair-happy' | 'puppy-happy' | 'kitten-happy' | 'puppy-worried' | 'kitten-worried' | 'puppy-sniffing'
  | 'kitten-peeking' | 'pair-celebrating' | 'pair-sleeping' | 'puppy-head' | 'kitten-head' | 'sample-bag'

// Server only. The PNGs are generated outside this repo folder, so a missing file renders nothing
// instead of breaking the build. All mascots are square; sample-bag is 2 by 3.
export function Mascot({ name, size, alt = '', className, priority }: { name: MascotName; size: number; alt?: string; className?: string; priority?: boolean }) {
  if (!fs.existsSync(path.join(process.cwd(), 'public/mascots', `${name}.png`))) return null
  return (
    <Image
      src={`/mascots/${name}.png`}
      alt={alt}
      width={size}
      height={name === 'sample-bag' ? size * 1.5 : size}
      sizes={`${size}px`}
      className={className}
      priority={priority}
      draggable={false}
    />
  )
}
