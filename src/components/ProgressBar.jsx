export default function ProgressBar({ completed, total }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Progress
        </span>
        <span className="font-mono text-xs text-ink">
          {completed} / {total} days
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-rule overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
