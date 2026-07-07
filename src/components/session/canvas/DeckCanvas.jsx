import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_COMPONENTS } from '../../markdown/readingMarkdown.jsx'
import { FIGURE_KIND_RENDERERS, Glyph } from './FigureCanvas.jsx'

// Paged slide deck. Frame kinds (see the Deck Author contract in
// functions/_sessionPacks.js): markdown, image, statement, stat, split,
// columns, figure.
// Chat carries the prose; each slide carries one idea. Page resets on directive
// change because ContentCanvas remounts this on key={directive.id}.

// One big-type idea: kicker (mono, accent) / display text / muted sub.
function StatementFrame({ frame }) {
  return (
    <div className="text-center px-2">
      {frame.kicker && (
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-accent mb-5">{frame.kicker}</p>
      )}
      <p className="font-semibold text-ink leading-[1.15] tracking-tight" style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}>
        {frame.text}
      </p>
      {frame.sub && <p className="mt-5 text-[15px] leading-relaxed text-muted max-w-md mx-auto">{frame.sub}</p>}
    </div>
  )
}

// One number worth staring at: huge mono value / label / muted note.
function StatFrame({ frame }) {
  return (
    <div className="text-center px-2">
      <p className="font-mono font-bold text-accent leading-none" style={{ fontSize: 'clamp(56px, 10vw, 72px)' }}>
        {frame.value}
      </p>
      <p className="mt-5 text-[17px] font-semibold text-ink">{frame.label}</p>
      {frame.note && <p className="mt-2 text-[13.5px] text-muted max-w-md mx-auto">{frame.note}</p>}
    </div>
  )
}

// Words half + visual half (image or item cards). flex-wrap stacks the halves
// vertically on narrow deck panes without measuring anything.
function SplitFrame({ frame }) {
  const v = frame.visual || {}
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
      <div className="flex-1 min-w-[230px]">
        {frame.heading && <h2 className="text-[22px] font-semibold text-ink leading-snug mb-3">{frame.heading}</h2>}
        {frame.text && <p className="text-[15px] leading-relaxed text-ink/80">{frame.text}</p>}
      </div>
      <div className="flex-1 min-w-[230px]">
        {v.type === 'image' ? (
          <img src={v.src} alt={v.alt || ''} className="max-w-full rounded-md border border-rule" />
        ) : (
          <ul className="space-y-2.5">
            {(v.items || []).map((it, i) => (
              <li key={i} className="flex gap-3 rounded-md border border-rule bg-white px-3.5 py-3">
                {it.glyph ? (
                  <span className="text-accent shrink-0 pt-0.5">
                    <Glyph name={it.glyph} size={20} />
                  </span>
                ) : it.icon ? (
                  <span className="font-mono text-[12px] font-bold text-accent shrink-0 pt-0.5">{it.icon}</span>
                ) : null}
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{it.title}</p>
                  {it.text && <p className="text-[13px] leading-snug text-muted mt-0.5">{it.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Parallel explainer cards compared in the same dimensions (the researched
// "Cremades card row" — see the RESEARCH-FIRST rule in _sessionPacks.js).
// Per-column header tint ramps with the accent, echoing the concentric rings;
// sections are label/text rows; `example` is a mono worked-math line pinned to
// the card's foot. flex-wrap stacks columns on narrow panes (4-up wraps 2×2).
function ColumnsFrame({ frame }) {
  const cols = frame.columns || []
  return (
    <div>
      {frame.heading && (
        <h2 className="text-[20px] font-semibold text-ink leading-snug mb-4 text-center">{frame.heading}</h2>
      )}
      <div className="flex flex-wrap gap-3 items-stretch">
        {cols.map((c, i) => (
          // 4-up wraps 2×2 (the SWOT-grid shape) via flex-basis; 2-3 share one row.
          <div
            key={i}
            className="flex-1 min-w-[200px] rounded-md border border-rule bg-white overflow-hidden flex flex-col"
            style={cols.length === 4 ? { flexBasis: '38%' } : undefined}
          >
            <div
              className="px-3.5 py-2.5 flex items-center gap-2 border-b border-rule"
              style={{ backgroundColor: `rgba(26, 58, 92, ${0.05 + i * 0.06})` }}
            >
              {c.icon && <span className="font-mono text-[13px] font-bold text-accent shrink-0">{c.icon}</span>}
              <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-accent">{c.title}</p>
            </div>
            <div className="px-3.5 py-3 space-y-2.5 flex-1">
              {(c.sections || []).map((s, j) => (
                <div key={j}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{s.label}</p>
                  <p className="text-[13px] leading-snug text-ink mt-0.5">{s.text}</p>
                </div>
              ))}
            </div>
            {c.example && (
              <div className="border-t border-rule bg-accent/[0.04] px-3.5 py-2.5">
                <p className="font-mono text-[12px] leading-snug text-accent">{c.example}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// A FigureCanvas figure frozen at one build state. `step` is a step id or index;
// default = fully built. No enter animation — a slide is static.
function FigureFrame({ frame }) {
  const Kind = FIGURE_KIND_RENDERERS[frame.figureKind]
  if (!Kind) {
    return <p className="font-mono text-[12px] text-muted text-center">Unknown figure kind: {frame.figureKind}</p>
  }
  const spec = frame.spec || {}
  const steps = spec.steps || []
  let idx = Math.max(steps.length - 1, 0)
  if (typeof frame.step === 'number') idx = Math.min(Math.max(frame.step, 0), Math.max(steps.length - 1, 0))
  else if (typeof frame.step === 'string') {
    const i = steps.indexOf(frame.step)
    if (i !== -1) idx = i
  }
  const visible = (el) => (el.step === undefined ? true : steps.indexOf(el.step) <= idx)
  const entering = () => false
  return (
    <div className="w-full" style={{ aspectRatio: '800 / 520' }}>
      <Kind spec={spec} visible={visible} entering={entering} />
    </div>
  )
}

function FrameBody({ frame }) {
  switch (frame.kind) {
    case 'image':
      return (
        <>
          <img src={frame.src} alt={frame.caption || ''} className="max-w-full rounded-md border border-rule" />
          {frame.caption && <p className="mt-3 text-[13px] text-muted">{frame.caption}</p>}
        </>
      )
    case 'statement':
      return <StatementFrame frame={frame} />
    case 'stat':
      return <StatFrame frame={frame} />
    case 'split':
      return <SplitFrame frame={frame} />
    case 'columns':
      return <ColumnsFrame frame={frame} />
    case 'figure':
      return <FigureFrame frame={frame} />
    case 'markdown':
    case undefined: // legacy frames without a kind are markdown
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {frame.markdown || ''}
        </ReactMarkdown>
      )
    default:
      return <p className="font-mono text-[12px] text-muted text-center">Unknown deck frame kind: {frame.kind}</p>
  }
}

// Slide-shaped kinds center vertically in the pane; document kinds (markdown,
// image) read from the top.
const CENTERED_KINDS = new Set(['statement', 'stat', 'figure', 'split', 'columns'])

export default function DeckCanvas({ payload }) {
  const frames = payload.frames || []
  // ?slide=N — deep-link/test hook: open on a given slide (clamped below).
  const initial = (() => {
    const n = parseInt(new URLSearchParams(window.location.search).get('slide') || '', 10)
    return Number.isFinite(n) && n > 0 ? n - 1 : 0
  })()
  const total = frames.length
  const [page, setPage] = useState(Math.min(initial, Math.max(total - 1, 0)))
  const [maxVisited, setMaxVisited] = useState(page)
  const cur = frames[Math.min(page, total - 1)] || {}
  const centered = CENTERED_KINDS.has(cur.kind)
  // Direction of the last page change, for the directional slide-in (advance
  // enters from the right, retreat from the left) — read at render time by the
  // key={page}-wrapped div below, so it only needs to be right AT the moment
  // the page state actually updates.
  const dirRef = useRef('advance')

  const go = (d) =>
    setPage((p) => {
      const n = Math.max(0, Math.min(total - 1, p + d))
      dirRef.current = d > 0 ? 'advance' : 'retreat'
      setMaxVisited((m) => Math.max(m, n))
      return n
    })
  // Pulse the Next cue only at the frontier — pages ahead the learner hasn't
  // seen yet (#5). Once the deck's been walked, it goes quiet.
  const pulseNext = page === maxVisited && page < total - 1

  // Swipe to advance/retreat (touch + pen + mouse-drag): horizontal-dominant
  // moves past 48px flip the slide; vertical moves stay scrolls. A plain object
  // here would be a fresh {} on every re-render (streaming chat deltas re-render
  // this pane constantly) — a ref survives across renders between pointerdown
  // and pointerup so a swipe mid-stream isn't silently dropped.
  const swipeRef = useRef({ x: 0, y: 0, id: null })
  function swipeStart(e) {
    swipeRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  function swipeEnd(e) {
    const s = swipeRef.current
    if (s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
    swipeRef.current = { x: 0, y: 0, id: null }
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={swipeStart}
        onPointerUp={swipeEnd}
      >
        <div
          key={page}
          className={`mx-auto px-5 sm:px-8 py-6 ${
            cur.kind === 'figure' || cur.kind === 'columns' ? 'max-w-3xl' : 'max-w-2xl'
          } ${centered ? 'min-h-full flex flex-col justify-center' : ''} ${
            dirRef.current === 'retreat' ? 'step-enter-retreat' : 'step-enter-advance'
          }`}
        >
          <FrameBody frame={cur} />
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
                  dirRef.current = i > page ? 'advance' : 'retreat'
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
              pulseNext ? 'text-white bg-accent pulse-cue' : 'text-accent'
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
