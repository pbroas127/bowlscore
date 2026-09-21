// The three app screens shown inside the CSS phone. Real HTML and SVG fed by real rubric output,
// styled with the same tokens as the app, so they stay crisp at any size.
import type { ScoreResult } from '@/lib/rubric'
import { GRADE_COLOR, SEVERITY_COLOR } from '@/lib/site'
import { Mascot } from './Mascot'
import { ScoreRing } from './ScoreRing'

export function ResultScreen({ name, kind, result, live = true }: { name: string; kind: string; result: ScoreResult; live?: boolean }) {
  const bad = result.flags.filter((f) => f.severity !== 'good' && f.severity !== 'info').slice(0, 3)
  const good = result.flags.filter((f) => f.severity === 'good').slice(0, bad.length ? 1 : 3)
  return (
    <div className="flex h-full flex-col px-4 pt-14 pb-4">
      <div className="flex items-center gap-2.5">
        <div className="grid size-10 place-items-center overflow-hidden rounded-chip bg-surface ring-1 ring-hairline">
          <Mascot name="sample-bag" size={30} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] leading-tight font-bold">{name}</p>
          <p className="text-ink2">{kind}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center">
        <ScoreRing score={result.score} grade={result.grade} size={132} live={live} />
        <p className="mt-2 font-display text-[17px] font-bold" style={{ color: GRADE_COLOR[result.grade] }}>
          {result.grade}
        </p>
      </div>

      {bad.length > 0 && <FlagGroup title="Watch outs" flags={bad} />}
      {good.length > 0 && <FlagGroup title="The good stuff" flags={good} />}

      <div className="btn btn-yellow mt-auto text-center text-[14px]" aria-hidden="true">
        <span>Set as Biscuit&apos;s food</span>
      </div>
    </div>
  )
}

function FlagGroup({ title, flags }: { title: string; flags: ScoreResult['flags'] }) {
  return (
    <div className="mt-3.5">
      <p className="font-display text-[14px] font-bold">{title}</p>
      <ul className="mt-1.5 overflow-hidden rounded-card bg-surface ring-1 ring-hairline">
        {flags.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 border-hairline px-3 py-2 not-last:border-b">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[f.severity] }} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{f.title}</span>
              {f.ingredient && <span className="block truncate text-[12px] text-ink2">{f.ingredient}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The only dark screen in the app: the camera, in Label mode.
export function ScanScreen() {
  return (
    <div className="flex h-full flex-col items-center bg-ink px-4 pt-14 pb-5 text-cream">
      <p className="rounded-full bg-cream/15 px-3 py-1 text-[12px] font-medium">For Biscuit</p>
      <div className="relative mt-4 grid w-full flex-1 place-items-center rounded-hero border-2 border-cream/70">
        <Mascot name="sample-bag" size={150} alt="A generic bag of dog food in the camera frame" />
      </div>
      <p className="mt-3 text-center text-[13px] text-cream/80">Fit the ingredients list in the frame</p>
      <div className="mt-3 flex rounded-full bg-cream/15 p-1 text-[12px] font-semibold">
        <span className="px-3.5 py-1 text-cream/70">Barcode</span>
        <span className="rounded-full bg-cream px-3.5 py-1 text-ink">Label</span>
      </div>
      <div className="mt-3 size-14 rounded-full border-4 border-cream/40 bg-cream" />
    </div>
  )
}

export function PicksScreen({ picks }: { picks: { name: string; why: string; result: ScoreResult }[] }) {
  return (
    <div className="flex h-full flex-col px-4 pt-14 pb-4">
      <p className="font-display text-[19px] leading-tight font-bold">Better picks for Biscuit</p>
      <p className="mt-1 text-ink2">Same kind of food, scored the same way.</p>
      <ul className="mt-4 space-y-2.5">
        {picks.map((p) => (
          <li key={p.name} className="flex items-center gap-3 rounded-card bg-surface p-3 ring-1 ring-hairline">
            <ScoreRing score={p.result.score} grade={p.result.grade} size={52} live={false} />
            <span className="min-w-0">
              <span className="block font-display text-[15px] leading-tight font-bold">{p.name}</span>
              <span className="mt-0.5 block text-[12px] text-ink2">{p.why}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-auto text-center text-[11px] text-ink2">How we score. BowlScore is not veterinary advice.</p>
    </div>
  )
}
