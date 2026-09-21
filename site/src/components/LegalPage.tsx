export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="wrap pt-[132px] pb-24">
      <article className="prose">
        <h1>{title}</h1>
        {updated && <p className="!mt-4 text-ink2">Effective {updated}</p>}
        {children}
      </article>
    </div>
  )
}
