import { useRef, useState } from 'react'
import EmptyCanvas from './canvas/EmptyCanvas.jsx'
import ReadingCanvas from './canvas/ReadingCanvas.jsx'
import DeckCanvas from './canvas/DeckCanvas.jsx'
import VideoCanvas from './canvas/VideoCanvas.jsx'
import ImageCanvas from './canvas/ImageCanvas.jsx'
import BrowserCanvas from './canvas/BrowserCanvas.jsx'
import TerminalCanvas from './canvas/TerminalCanvas.jsx'
import ArtifactCanvas from './canvas/ArtifactCanvas.jsx'

const RENDERERS = {
  reading: ReadingCanvas,
  deck: DeckCanvas,
  video: VideoCanvas,
  image: ImageCanvas,
  browser: BrowserCanvas,
  terminal: TerminalCanvas,
  artifact: ArtifactCanvas,
}

function caretRange(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y)
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y)
    if (p) {
      const r = document.createRange()
      r.setStart(p.offsetNode, p.offset)
      return r
    }
  }
  return null
}
// Best-effort text under the marquee (works for text panes: reading, artifact,
// terminal). Returns '' for image/video/iframe regions.
function extractText(x1, y1, x2, y2) {
  try {
    const a = caretRange(x1, y1)
    const b = caretRange(x2, y2)
    if (!a || !b) return ''
    const r = document.createRange()
    try {
      r.setStart(a.startContainer, a.startOffset)
      r.setEnd(b.startContainer, b.startOffset)
    } catch {
      r.setStart(b.startContainer, b.startOffset)
      r.setEnd(a.startContainer, a.startOffset)
    }
    return r.toString().replace(/\s+/g, ' ').trim().slice(0, 600)
  } catch {
    return ''
  }
}

// The drag-to-select overlay. Hides its own hit-testing at release so caret probing
// reads the content underneath.
function Marquee({ onDone }) {
  const ref = useRef(null)
  const startRef = useRef(null)
  const [box, setBox] = useState(null)

  function down(e) {
    const r = ref.current.getBoundingClientRect()
    startRef.current = { ox: e.clientX - r.left, oy: e.clientY - r.top, cx: e.clientX, cy: e.clientY }
    setBox({ x: e.clientX - r.left, y: e.clientY - r.top, w: 0, h: 0 })
    ref.current.setPointerCapture(e.pointerId)
  }
  function move(e) {
    if (!startRef.current) return
    const r = ref.current.getBoundingClientRect()
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top
    const s = startRef.current
    setBox({ x: Math.min(s.ox, cx), y: Math.min(s.oy, cy), w: Math.abs(cx - s.ox), h: Math.abs(cy - s.oy) })
  }
  function up(e) {
    if (!startRef.current) return
    const r = ref.current.getBoundingClientRect()
    const s = startRef.current
    const rectPct = {
      left: (Math.min(s.ox, e.clientX - r.left) / r.width) * 100,
      top: (Math.min(s.oy, e.clientY - r.top) / r.height) * 100,
      width: (Math.abs(e.clientX - r.left - s.ox) / r.width) * 100,
      height: (Math.abs(e.clientY - r.top - s.oy) / r.height) * 100,
    }
    ref.current.style.pointerEvents = 'none' // let caret probing hit content beneath
    const text = extractText(s.cx, s.cy, e.clientX, e.clientY)
    startRef.current = null
    setBox(null)
    onDone({ rectPct, text })
  }

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      className="absolute inset-0 z-20 cursor-crosshair bg-accent/5 touch-none select-none"
    >
      {box && (
        <div
          className="absolute border-2 border-accent bg-accent/10 pointer-events-none"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
      )}
    </div>
  )
}

// Routes a CanvasDirective to its renderer inside a header strip + a fade-in wrapper
// keyed on directive.id. Header carries a "Point" toggle for the marquee tool;
// renderers report live state via onLiveState; a pinned selection is highlighted.
export default function ContentCanvas({
  directive,
  selecting,
  onToggleSelect,
  onSelect,
  onLiveState,
  pinnedRect,
}) {
  if (!directive) {
    return (
      <div className="h-full bg-paper">
        <EmptyCanvas />
      </div>
    )
  }

  const Renderer = RENDERERS[directive.type]

  return (
    <div className="h-full flex flex-col bg-paper">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-rule bg-white">
        <span className="text-sm font-semibold text-ink truncate">{directive.title || ''}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleSelect}
            title="Marquee-select a region to point the chat at it"
            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
              selecting
                ? 'border-accent bg-accent text-white'
                : 'border-rule text-muted hover:text-ink'
            }`}
          >
            ◲ Point
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {directive.type}
          </span>
        </div>
      </div>

      <div key={directive.id} className="session-fade relative flex-1 min-h-0">
        {Renderer ? (
          <Renderer payload={directive.payload || {}} onLiveState={onLiveState} />
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <p className="font-mono text-[12px] text-muted">Unknown canvas type: {directive.type}</p>
          </div>
        )}

        {pinnedRect && (
          <div
            className="absolute z-10 border-2 border-accent bg-accent/10 pointer-events-none rounded-sm"
            style={{
              left: `${pinnedRect.left}%`,
              top: `${pinnedRect.top}%`,
              width: `${pinnedRect.width}%`,
              height: `${pinnedRect.height}%`,
            }}
          />
        )}

        {selecting && <Marquee onDone={onSelect} />}
      </div>
    </div>
  )
}
