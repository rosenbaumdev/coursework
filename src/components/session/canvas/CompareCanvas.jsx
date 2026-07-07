import ReadingCanvas from './ReadingCanvas.jsx'
import DeckCanvas from './DeckCanvas.jsx'
import VideoCanvas from './VideoCanvas.jsx'
import ImageCanvas from './ImageCanvas.jsx'
import BrowserCanvas from './BrowserCanvas.jsx'
import TerminalCanvas from './TerminalCanvas.jsx'
import ArtifactCanvas from './ArtifactCanvas.jsx'
import FigureCanvas from './FigureCanvas.jsx'

// Phase T.4f Tier 2 — [SHOW: compare(a, b)] renders two resolved targets side
// by side (stacked on narrow panes). Each side is a full CanvasDirective —
// reuse the SAME renderer map ContentCanvas uses, just without its outer
// header/marquee chrome (a compare pane is two mini-panes, not one pointable
// surface). No onLiveState passthrough here (see describeCanvas.js) — each
// side already carries its own server-resolved state.
const RENDERERS = {
  reading: ReadingCanvas,
  deck: DeckCanvas,
  video: VideoCanvas,
  image: ImageCanvas,
  browser: BrowserCanvas,
  terminal: TerminalCanvas,
  artifact: ArtifactCanvas,
  figure: FigureCanvas,
}

function Side({ directive }) {
  const Renderer = directive && RENDERERS[directive.type]
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col border border-rule rounded-lg overflow-hidden bg-white">
      <div className="shrink-0 px-3 py-1.5 border-b border-rule bg-paper">
        <span className="text-[12px] font-semibold text-ink truncate block">{directive?.title || ''}</span>
      </div>
      <div className="flex-1 min-h-0">
        {Renderer ? (
          <Renderer payload={directive.payload || {}} />
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <p className="font-mono text-[11px] text-muted">Unknown type: {directive?.type}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CompareCanvas({ payload }) {
  const { a, b } = payload || {}
  return (
    <div className="h-full min-h-0 p-3 flex flex-col md:flex-row gap-3">
      <Side directive={a} />
      <Side directive={b} />
    </div>
  )
}
