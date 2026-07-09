import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import LiveTerminal from './LiveTerminal.jsx'

// The workshop: a live droplet terminal + a live app viewer, stacked inside the canvas
// pane. The outer chat|canvas split (SessionView/SplitPane) is untouched — this composite
// IS the "IDE". Internal divider is resizable with the platform's mechanic; a swap button
// flips which pane is on top. Terminal output flows up via onLiveState so the Director
// observes it. Swap uses CSS `order` (not DOM reorder) so the terminal never remounts.
// payload: { mode:'live', wsUrl, token, viewerUrl?, label? }
const RATIO_KEY = 'workshop:ratio'
const SWAP_KEY = 'workshop:swapped'
const readNum = (k, d) => { const v = parseFloat(localStorage.getItem(k)); return Number.isFinite(v) ? v : d }

export default function WorkshopCanvas({ payload, onLiveState, onEvent }) {
  const { studentSlug } = useParams()
  const [status, setStatus] = useState('connecting')
  const [reloadKey, setReloadKey] = useState(0)
  const [ratio, setRatio] = useState(() => readNum(RATIO_KEY, 0.58)) // TOP pane fraction
  const [swapped, setSwapped] = useState(() => localStorage.getItem(SWAP_KEY) === '1')
  // The viewer does NOT auto-show its URL — it stays on the "watching…" placeholder
  // until the readiness probe (or a manual nav) confirms the app is actually serving,
  // then loads it itself. That's the whole point: no "hit reload and hope it's there".
  const [viewerSrc, setViewerSrc] = useState('')
  const [addr, setAddr] = useState(payload.viewerUrl || '')
  const [viewerReady, setViewerReady] = useState(false) // probe says the app is reachable
  const [loaded, setLoaded] = useState(false) // the iframe is showing real app content
  const [guide, setGuide] = useState(false) // v1 guide overlay: labeled outlines on each pane
  const [openTip, setOpenTip] = useState(null)

  // Fresh signed workshop token per (re)connect (Phase I). Handed to LiveTerminal, which
  // calls it right before each socket open; falls back to payload.token if unavailable.
  const getWorkshopToken = useCallback(async () => {
    if (!studentSlug) return ''
    try {
      const r = await fetch(`/${studentSlug}/api/session/workshop-token`)
      if (!r.ok) return ''
      const d = await r.json().catch(() => ({}))
      return d.token || ''
    } catch {
      return ''
    }
  }, [studentSlug])

  // A new injected app URL (tunnel rotated, or first workshop show) resets the viewer to
  // "watching" so the probe re-loads it when the NEW origin is live. Guarded on the URL
  // value, so a re-emit of the SAME url never blanks an app the learner is playing.
  useEffect(() => {
    setAddr(payload.viewerUrl || '')
    setViewerSrc('')
    setViewerReady(false)
    setLoaded(false)
  }, [payload.viewerUrl])

  // Auto-load when ready. The browser can't tell a live app from a 404/tunnel-error
  // across origins, so the CF edge probes it for us. Poll every 4s until reachable,
  // then load the iframe once and stop (never auto-reload a running app — the learner
  // may be mid-game; rebuilds use the manual ↻). Only runs for a real live tunnel.
  useEffect(() => {
    if (!payload.viewerUrl || !studentSlug || loaded) return
    let cancelled = false
    let timer
    async function probe() {
      try {
        const res = await fetch(`/${studentSlug}/api/session/viewer-status`)
        const data = await res.json()
        if (cancelled) return
        if (data?.ready) {
          setViewerReady(true)
          setViewerSrc(payload.viewerUrl)
          setAddr(payload.viewerUrl)
          setLoaded(true)
          return
        }
      } catch {
        /* keep polling — transient */
      }
      if (!cancelled) timer = setTimeout(probe, 4000)
    }
    probe()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [payload.viewerUrl, studentSlug, loaded])

  // Tell the Director the TRUTH about the viewer, merged with the terminal output on the
  // one liveState channel. Without this the Director asserts "your game is in the viewer"
  // whenever a URL is merely configured — even when nothing is serving. Refs keep the
  // callback we hand LiveTerminal stable (it's a WS-effect dep; a fresh fn would reconnect).
  const onLiveStateRef = useRef(onLiveState)
  onLiveStateRef.current = onLiveState
  const termTextRef = useRef('')
  const viewerLineRef = useRef('')
  const pushLive = useRef(() => {
    const fn = onLiveStateRef.current
    if (typeof fn !== 'function') return
    fn([termTextRef.current, viewerLineRef.current].filter(Boolean).join('\n\n'))
  }).current
  const handleTermLive = useRef((s) => { termTextRef.current = s; pushLive() }).current

  useEffect(() => {
    viewerLineRef.current = !payload.viewerUrl
      ? 'VIEWER: no app URL is configured, so nothing can appear yet.'
      : loaded
        ? `VIEWER: the app IS loaded and live at ${payload.viewerUrl} — the learner can see and interact with it right now.`
        : viewerReady
          ? 'VIEWER: the app just became reachable; the viewer is loading it now.'
          : "VIEWER: nothing is serving yet — the app is NOT on screen. The viewer will load it AUTOMATICALLY the instant it's reachable, so do NOT claim the game is visible and do NOT tell the learner to hit reload to make it appear; just confirm from the terminal that the build is progressing."
    pushLive()
  }, [loaded, viewerReady, payload.viewerUrl, pushLive])

  // Real browsing: a full URL loads as-is; a bare path (/admin) resolves against the
  // app's origin. Empty → no-op.
  function navigate(value) {
    const v = (value ?? addr).trim()
    if (!v) return
    let next
    try { next = /^https?:\/\//i.test(v) ? v : new URL(v, payload.viewerUrl || undefined).href } catch { next = v }
    setViewerSrc(next); setAddr(next); setLoaded(true); setReloadKey((k) => k + 1)
  }

  const containerRef = useRef(null)
  const draggingRef = useRef(false)
  const liveRatioRef = useRef(ratio)
  liveRatioRef.current = ratio

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    document.body.classList.add('select-none')
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const r = Math.max(0.2, Math.min(0.8, (e.clientY - rect.top) / rect.height))
    liveRatioRef.current = r
    setRatio(r)
  }
  function onPointerUp(e) {
    if (!draggingRef.current) return
    draggingRef.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    document.body.classList.remove('select-none')
    localStorage.setItem(RATIO_KEY, String(liveRatioRef.current))
  }
  function swap() {
    setSwapped((s) => { localStorage.setItem(SWAP_KEY, s ? '0' : '1'); return !s })
  }

  const dot = status === 'connected' ? 'bg-[#28c840]' : status === 'error' || status === 'closed' ? 'bg-[#ff5f57]' : 'bg-[#febc2e]'

  // Both panes always in fixed JSX order; CSS `order` places them. The TOP pane (order
  // 1) gets the fixed ratio; the BOTTOM pane (order 3) flex-grows to fill the rest — so
  // the 6px divider never causes overflow, whichever way they're swapped.
  const topStyle = (order) => ({ order, flexGrow: 0, flexShrink: 0, flexBasis: `${ratio * 100}%` })
  const bottomStyle = (order) => ({ order, flexGrow: 1, flexShrink: 1, flexBasis: 0 })
  const terminalPane = (
    <div
      key="terminal"
      style={swapped ? bottomStyle(3) : topStyle(1)}
      className="relative min-h-0 flex flex-col rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#111] shadow-card"
    >
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-[#2a2a2a]">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[11px] text-[#9ca3af]">{payload.label || 'coursework-vm — your machine'}</span>
        <span className={`ml-auto h-2 w-2 rounded-full ${dot}`} title={status} />
      </div>
      <div className="flex-1 min-h-0 p-2">
        <LiveTerminal url={payload.wsUrl} token={payload.token} getToken={getWorkshopToken} onStatus={setStatus} onLiveState={handleTermLive} onEvent={onEvent} />
      </div>
      {guide && (
        <GuideTip
          n="1"
          title="Your terminal"
          dark
          open={openTip === 'terminal'}
          onToggle={() => setOpenTip((t) => (t === 'terminal' ? null : 'terminal'))}
          body="A live command line on your own real, always-on computer. You type commands here — like `claude` to start your build partner. Whatever it writes lands in real files in this folder."
        />
      )}
    </div>
  )

  const viewerPane = (
    <div
      key="viewer"
      style={swapped ? topStyle(1) : bottomStyle(3)}
      className="relative min-h-0 flex flex-col rounded-lg overflow-hidden border border-rule bg-white shadow-card"
    >
      <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 border-b border-rule bg-[#f8fafc]">
        <button
          onClick={() => navigate(payload.viewerUrl)}
          disabled={!payload.viewerUrl}
          className="shrink-0 h-6 w-6 grid place-items-center rounded text-muted hover:text-accent disabled:opacity-40"
          title="Home (app root)"
        >⌂</button>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={!viewerSrc}
          className="shrink-0 h-6 w-6 grid place-items-center rounded text-muted hover:text-accent disabled:opacity-40"
          title="Reload"
        >↻</button>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate() }}
          placeholder={payload.viewerUrl ? 'type a path (/admin) or URL, then Enter' : 'not running yet'}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="flex-1 min-w-0 h-6 rounded-full border border-rule bg-white px-3 font-mono text-[11px] text-ink placeholder:text-muted/70 focus:outline-none focus:border-accent/60"
        />
      </div>
      <div className="flex-1 min-h-0 bg-white">
        {viewerSrc ? (
          <iframe
            key={reloadKey}
            src={viewerSrc}
            title="app viewer"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-downloads"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-6">
            {payload.viewerUrl && studentSlug ? (
              <>
                <span className="flex items-center gap-2 text-[12px] font-mono text-muted">
                  <span className="h-2 w-2 rounded-full bg-[#febc2e] pulse-cue" />
                  watching for your app…
                </span>
                <p className="text-sm text-muted max-w-xs">The moment your build is running, it appears here on its own — you don’t have to do anything. Keep going in the terminal.</p>
              </>
            ) : (
              <p className="text-sm text-muted max-w-xs">Your creation shows up here the moment it’s running. Build it in the terminal, then start it — and watch it come alive.</p>
            )}
          </div>
        )}
      </div>
      {guide && (
        <GuideTip
          n="2"
          title="Your viewer"
          open={openTip === 'viewer'}
          onToggle={() => setOpenTip((t) => (t === 'viewer' ? null : 'viewer'))}
          body="This shows your app running, live. The moment your build is actually serving, it appears here on its own — you don’t press anything. Later, after you change the game, hit ↻ reload to see the new version. You never type a file path."
        />
      )}
    </div>
  )

  // Divider (order 2): a grabbable 10px bar carrying the resize handle + swap button (⇅).
  const divider = (
    <div
      role="separator"
      aria-orientation="horizontal"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ order: 2 }}
      className="group relative shrink-0 h-4 my-0.5 flex items-center justify-center touch-none cursor-row-resize"
    >
      <div className="h-1.5 w-full rounded-full bg-rule group-hover:bg-accent/40 group-active:bg-accent/60 transition-colors" />
      <button
        onClick={swap}
        onPointerDown={(e) => e.stopPropagation()}
        title="Swap terminal and viewer"
        aria-label="Swap terminal and viewer"
        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-white border border-rule shadow-card text-ink hover:text-accent hover:border-accent/50 transition-colors"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20V6M7 6L3.5 9.5M7 6l3.5 3.5" />
          <path d="M17 4v14M17 18l-3.5-3.5M17 18l3.5 3.5" />
        </svg>
      </button>
    </div>
  )

  return (
    <div ref={containerRef} className="relative h-full p-2 sm:p-3">
      <button
        type="button"
        onClick={() => { setGuide((g) => !g); setOpenTip(null) }}
        title="Show a guided tour of the workshop"
        className={`absolute top-4 right-4 z-40 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-card transition-colors ${
          guide ? 'border-accent bg-accent text-white' : 'border-rule bg-white/95 text-ink hover:text-accent'
        }`}
      >
        {guide ? '✕ Close guide' : '❔ Guide'}
      </button>
      <div className="h-full flex flex-col gap-0">
        {terminalPane}
        {divider}
        {viewerPane}
      </div>
    </div>
  )
}

// v1 guide overlay: a labeled, glowing outline on a fixed workshop pane with a
// click-to-expand caption. Only the chip is interactive; the rest passes clicks
// through so the terminal/viewer stay usable while the guide is on.
function GuideTip({ n, title, body, dark, open, onToggle }) {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div className={`absolute inset-1 rounded-lg ring-2 ${dark ? 'ring-[#28c840]' : 'ring-accent'} shadow-[0_0_22px_rgba(26,58,92,0.4)]`} />
      <div className="absolute top-2 left-2 max-w-[88%] pointer-events-auto">
        <button
          type="button"
          onClick={onToggle}
          // Bright amber + dark border + white outer ring so the chip reads on BOTH the dark
          // terminal and the light viewer, plus a gentle pulse to pull the eye to it.
          className="continue-pulse flex items-center gap-2 rounded-full bg-[#febc2e] px-3 py-1.5 text-[12px] font-bold text-[#111] border-2 border-[#111] ring-2 ring-white/80 shadow-card hover:brightness-105"
        >
          <span className="grid place-items-center h-4 w-4 rounded-full bg-[#111]/15 text-[10px]">{n}</span>
          <span className="truncate">{title}</span>
          <span aria-hidden className="text-[#111]/60">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="mt-1.5 max-w-xs rounded-lg border border-rule bg-white p-3 text-[12px] leading-relaxed text-ink shadow-card">
            {body}
          </div>
        )}
      </div>
    </div>
  )
}
