// Segmented control for the split orientation (wide viewports only).
const OPTIONS = [
  { value: 'lr', label: 'Side by side', glyph: '◧' },
  { value: 'tb', label: 'Stacked', glyph: '⬓' },
]

export default function OrientationToggle({ orientation, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-rule bg-white p-0.5">
      {OPTIONS.map((o) => {
        const active = orientation === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
              active ? 'bg-accent text-white' : 'text-muted hover:text-ink'
            }`}
          >
            <span aria-hidden>{o.glyph}</span>
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
