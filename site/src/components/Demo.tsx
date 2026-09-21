'use client'
import { useState } from 'react'
import * as m from 'motion/react-m'
import { scoreFood } from '@/lib/rubric'
import { SAMPLES } from '@/lib/samples'
import { GRADE_COLOR, SEVERITY_COLOR } from '@/lib/site'
import { ScoreRing } from './ScoreRing'

// The real rubric.ts runs here in the browser. Nothing on this card is hard coded.
export function Demo({ happy, worried }: { happy: React.ReactNode; worried: React.ReactNode }) {
  const [id, setId] = useState(SAMPLES[0].id)
  const sample = SAMPLES.find((s) => s.id === id)!
  const result = scoreFood(sample.label, sample.species)
  const a = sample.label.analysis!
  const dm = result.dryMatter
  const pleased = result.score >= 50

  return (
    <div className="grid gap-x-6 gap-y-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div role="radiogroup" aria-label="Sample food" className="flex flex-col gap-2.5">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={s.id === id}
              onClick={() => setId(s.id)}
              className={`flex min-h-16 items-center justify-between rounded-card border-2 px-5 text-left transition-transform duration-150 active:scale-[0.98] ${s.id === id ? 'border-ink bg-surface' : 'border-hairline bg-transparent hover:border-ink2'}`}
            >
              <span>
                <span className="block font-display text-[19px] leading-tight font-bold">{s.name}</span>
                <span className="text-[15px] text-ink2">{s.kind}</span>
              </span>
              <span className={`grid size-6 place-items-center rounded-full border-2 ${s.id === id ? 'border-ink bg-ink' : 'border-ink2'}`}>{s.id === id && <span className="size-2 rounded-full bg-cream" />}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 text-[15px] leading-relaxed">
          <p className="font-semibold">What the label says</p>
          <p className="mt-1 text-ink2">{sample.label.ingredients.join(', ')}.</p>
          <p className="mt-2 text-ink2">
            Crude protein {a.proteinMin}% min, crude fat {a.fatMin}% min, crude fiber {a.fiberMax}% max, moisture {a.moistureMax}% max.
          </p>
        </div>

        <div className="relative mt-6 hidden size-40 lg:block" aria-hidden="true">
          <m.div className="absolute inset-0" initial={false} animate={{ opacity: pleased ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.9 }}>
            {happy}
          </m.div>
          <m.div className="absolute inset-0" initial={false} animate={{ opacity: pleased ? 0 : 1 }} transition={{ duration: 0.3, delay: 0.9 }}>
            {worried}
          </m.div>
        </div>
      </div>

      <div className="rounded-hero bg-surface p-6 shadow-warm ring-1 ring-hairline sm:p-8 lg:col-span-7" aria-live="polite">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing key={id} score={result.score} grade={result.grade} size={168} />
          <div>
            <p className="font-display text-[32px] leading-none font-bold" style={{ color: GRADE_COLOR[result.grade] }}>
              {result.grade}
            </p>
            <p className="mt-2 font-semibold">{sample.name}</p>
            <p className="text-[15px] text-ink2">Scored for an adult dog</p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-hairline pt-6">
          {(
            [
              ['Ingredients', result.components.ingredients, 50],
              ['Nutrition', result.components.nutrition, 30],
              ['Additives', result.components.additives, 20],
            ] as const
          ).map(([label, pts, max]) => (
            <div key={label}>
              <dt className="text-[14px] text-ink2">{label}</dt>
              <dd className="num text-[28px] leading-tight">
                {pts ?? 'n/a'}
                <span className="font-sans text-[14px] font-medium tracking-normal text-ink2"> of {max}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-card bg-cream p-5">
          <p className="text-[14px] font-semibold">On a dry matter basis, with {dm.moistureUsed}% moisture removed</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {(
              [
                ['Protein', dm.protein],
                ['Fat', dm.fat],
                ['Fiber', dm.fiber],
                ['Carbs, estimated', dm.carbs],
              ] as const
            ).map(([label, v]) => (
              <div key={label}>
                <dt className="text-[13px] text-ink2">{label}</dt>
                <dd className="num text-[22px]">{v}%</dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="mt-6">
          {result.flags.map((f, i) => (
            <li key={`${id}${i}`} className="border-t border-hairline">
              <details>
                <summary className="flex items-center gap-3 py-3.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[f.severity] }} />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{f.title}</span>
                    {f.ingredient && <span className="text-ink2"> · {f.ingredient}</span>}
                  </span>
                  <span className="chev text-[22px] leading-none text-ink2" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pb-4 pl-[22px] text-[16px] text-ink2">{f.detail}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
