// Session header: a small mono eyebrow label + the course title, plus an
// objective progress bar (ticked / totalRequired + current focus). Shared by the
// interview view (label "Onboarding Interview") and the coached session
// (label "Coached Session").
export default function ProgressHeader({
  courseTitle,
  ticked,
  totalRequired,
  focus,
  label = 'Onboarding Interview',
}) {
  const pct = totalRequired ? (ticked / totalRequired) * 100 : 0
  return (
    <header className="border-b border-rule bg-white shrink-0">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-1">
          {label}
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{courseTitle}</h1>
        {totalRequired ? (
          <div className="mt-4">
            <div className="mb-2">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-accent break-words">
                {ticked} / {totalRequired} captured
                {focus ? ` — ${focus}` : ''}
              </span>
            </div>
            <div className="h-[3px] w-full bg-rule rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
