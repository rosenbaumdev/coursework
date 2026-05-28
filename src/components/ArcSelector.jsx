const ARCS = [
  { name: 'Sports Betting AI', hint: 'Edge-finder for game lines and player props' },
  { name: 'AI Trading Assistant', hint: 'Signals + screeners for stocks and crypto' },
  { name: 'Faceless Content Machine', hint: 'Automated short-form video at scale' },
  { name: 'Fantasy Sports AI', hint: 'Lineup optimizer + waiver-wire intelligence' },
  { name: 'AI Lead Gen Tool', hint: 'Find + qualify B2B leads on autopilot' },
  { name: 'AI Research Assistant', hint: 'Deep-dive synthesizer for any topic' },
  { name: 'Affiliate Automation', hint: 'Product hunt + content + tracking pipeline' },
  { name: 'AI Creator Dashboard', hint: 'Cross-platform analytics + post planner' },
  { name: 'AI Social Clip Generator', hint: 'Long video in, viral clips out' },
]

export default function ArcSelector({ onSelect, compact = false }) {
  return (
    <div className={compact ? '' : 'max-w-3xl mx-auto px-6 py-12'}>
      {!compact && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
            Day 0 / Pick your arc
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink mb-2">
            What are you building toward?
          </h2>
          <p className="text-muted mb-8 leading-relaxed">
            Every day of the coursework bends around this choice. Pick the one that makes
            you most curious — you can change it later, but not without paying for it in
            momentum.
          </p>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ARCS.map((arc) => (
          <button
            key={arc.name}
            type="button"
            onClick={() => onSelect(arc.name)}
            className="group text-left bg-white border border-rule rounded-lg p-4 shadow-card hover:shadow-card-hover hover:border-accent transition-all"
          >
            <div className="font-medium text-ink group-hover:text-accent transition-colors">
              {arc.name}
            </div>
            <div className="text-sm text-muted mt-1">{arc.hint}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
