const CATEGORY_LABELS = {
  podcast: 'Podcast',
  'deck-pdf': 'Slide deck (PDF)',
  'deck-pptx': 'Slide deck (PPTX)',
  'claude-prompt': 'Claude prompt',
  other: 'Other',
}

const DEFAULT_ORDER = ['podcast', 'deck-pdf', 'deck-pptx', 'other']

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ category }) {
  if (category === 'podcast') {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="10" cy="9" r="3.5" />
        <path d="M5 12c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        <path d="M10 12v5M7.5 17h5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 3h6l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M12 3v4h4" />
    </svg>
  )
}

export default function AssetList({ assets, isDAD, onRemove, categories }) {
  if (!assets || Object.keys(assets).length === 0) return null

  const order = categories || DEFAULT_ORDER
  const ordered = order.filter((c) => assets[c]?.length)
  if (ordered.length === 0) return null

  return (
    <div className="border-t border-rule pt-4 pb-1">
      <div className="space-y-4">
        {ordered.map((category) => (
          <div key={category}>
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted mb-1.5">
              {CATEGORY_LABELS[category]}
            </div>
            <ul className="space-y-2">
              {assets[category].map((file) => (
                <li key={file.url} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">
                      <FileIcon category={category} />
                    </span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-ink hover:text-accent underline underline-offset-2 truncate"
                    >
                      {file.name}
                    </a>
                    <span className="font-mono text-[10px] text-muted shrink-0">
                      {formatBytes(file.size)}
                    </span>
                    {isDAD && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete ${file.name}?`)) {
                            onRemove(category, file.name)
                          }
                        }}
                        className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-red-600"
                      >
                        delete
                      </button>
                    )}
                  </div>
                  {category === 'podcast' && (
                    <audio controls preload="none" className="w-full max-w-md h-9">
                      <source src={file.url} />
                    </audio>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
