import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_COMPONENTS } from '../../markdown/readingMarkdown.jsx'

// Paged slide deck. Frames are markdown and/or images. Page resets on directive
// change because ContentCanvas remounts this on key={directive.id}.
export default function DeckCanvas({ payload }) {
  const frames = payload.frames || []
  const [page, setPage] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const total = frames.length
  const cur = frames[Math.min(page, total - 1)] || {}

  const go = (d) =>
    setPage((p) => {
      const n = Math.max(0, Math.min(total - 1, p + d))
      setMaxVisited((m) => Math.max(m, n))
      return n
    })
  // Pulse the Next cue only at the frontier — pages ahead the learner hasn't
  // seen yet (#5). Once the deck's been walked, it goes quiet.
  const pulseNext = page === maxVisited && page < total - 1

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-6">
          {cur.kind === 'image' ? (
            <img src={cur.src} alt={cur.caption || ''} className="max-w-full rounded-md border border-rule" />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
              {cur.markdown || ''}
            </ReactMarkdown>
          )}
          {cur.caption && cur.kind === 'image' && (
            <p className="mt-3 text-[13px] text-muted">{cur.caption}</p>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="shrink-0 border-t border-rule bg-white flex items-center justify-between px-4 py-2.5">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={page === 0}
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent disabled:opacity-30"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1.5">
            {frames.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPage(i)
                  setMaxVisited((m) => Math.max(m, i))
                }}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  i === page ? 'bg-accent' : 'bg-rule hover:bg-accent/40'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={page >= total - 1}
            className={`font-mono text-[12px] uppercase tracking-[0.14em] disabled:opacity-30 rounded-md px-2.5 py-1 transition ${
              pulseNext ? 'text-white bg-accent animate-pulse' : 'text-accent'
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
