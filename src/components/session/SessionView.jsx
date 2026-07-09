import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import ProgressHeader from '../chat/ProgressHeader.jsx'
import ChatMessages from '../chat/ChatMessages.jsx'
import ChatInput from '../chat/ChatInput.jsx'
import ContentCanvas from './ContentCanvas.jsx'
import SplitPane from './SplitPane.jsx'
import ShipCard from './ShipCard.jsx'
import { createTerminalSentinel } from '../../session/terminalEvents.js'
import OrientationToggle from './OrientationToggle.jsx'
import { useScriptedSessionDriver, useSSESessionDriver } from '../../session/useSessionDriver.js'
import { SHOWCASE_SESSION } from '../../session/scriptedSession.js'
import { describeCanvas } from '../../session/describeCanvas.js'
import { getStudent } from '../../students.js'

const NARROW_QUERY = '(max-width: 767px)'
const DEFAULT_RATIO = 0.6
// Proactive events exempt from the 25s anti-chatty gap: time-critical prompts/errors and
// the learner's own typed prompt (#4). Only the Observer's "work landed" glance waits.
const GAP_EXEMPT = new Set(['permission-prompt', 'trust-prompt', 'error', 'learner-prompt'])
const LS = {
  orientation: 'session:orientation',
  orientationLocked: 'session:orientationLocked',
  ratio: 'session:ratio',
  ratioLocked: 'session:ratioLocked',
}

// Auto-pick L/R vs T/B from viewport aspect, with content type breaking ties on a
// squarish window (landscape-ish content prefers side-by-side).
function decideOrientation(vw, vh, type) {
  const aspect = vw / vh
  if (aspect >= 1.25) return 'lr'
  if (aspect <= 0.9) return 'tb'
  const wideContent = ['video', 'browser', 'terminal', 'deck']
  return wideContent.includes(type) ? 'lr' : 'tb'
}

export default function SessionView() {
  const { studentSlug } = useParams()
  const _params = new URLSearchParams(useLocation().search)
  const dayId = _params.get('day') || '1'
  // Dev override: let the live-IDE URLs ride in the course URL so the workshop goes
  // live without prod env vars. Accept BOTH the session spelling (termUrl/termToken)
  // AND the /workshop demo spelling (url/token) — they must not diverge. Test affordance.
  const devTerm = {
    url: _params.get('termUrl') || _params.get('url'),
    token: _params.get('termToken') || _params.get('token') || '',
    viewer: _params.get('viewer'),
  }
  const student = getStudent(studentSlug)
  const studentName = student?.name

  const [selecting, setSelecting] = useState(false)
  const [pendingSelection, setPendingSelection] = useState(null)
  // T.4e: browsing an older directive from history (null = viewing current/live).
  const [historyViewId, setHistoryViewId] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Build 1 — Contents Menu: self-navigation to ANY target for the day, not
  // just ones already visited. `browsedDirective` is a fully-resolved
  // CanvasDirective (fetched on demand for an uncached pick, or reused
  // directly for one that's already cached) that overrides the live canvas —
  // same override role historyViewId plays for a HISTORY pick, just sourced
  // from the full catalog instead of only what's been shown so far.
  const [browsedDirective, setBrowsedDirective] = useState(null)
  const [contentsOpen, setContentsOpen] = useState(false)
  const [contentsLoadingKey, setContentsLoadingKey] = useState(null)
  const liveStateRef = useRef(null)
  const syncArtifactRef = useRef(null)
  const seenIdsRef = useRef(new Set()) // directive ids the learner actually had on screen
  const [seenVersion, setSeenVersion] = useState(0) // bump to re-render when seen-set changes
  function markSeen(id) {
    if (!id || seenIdsRef.current.has(id)) return
    seenIdsRef.current.add(id)
    setSeenVersion((v) => v + 1)
  }
  const reportLiveState = useRef((s) => {
    liveStateRef.current = s
    // Live engine: learner edits to an artifact pane sync to the server session
    // (debounced in the driver) so artifact gates track reality.
    const d = canvasRef.current
    if (
      syncArtifactRef.current &&
      d?.type === 'artifact' &&
      typeof d.id === 'string' &&
      d.id.startsWith('artifact:') &&
      typeof s === 'string'
    ) {
      syncArtifactRef.current(d.id.slice('artifact:'.length), s)
    }
  }).current

  // buildContext runs at send-time inside the driver: it snapshots what's on the
  // canvas (+ any marquee selection) for the model, then consumes the selection.
  // It also reports whether the learner has actually SEEN the current directive —
  // on a phone the canvas hides behind a tab, and "he's been shown X" objectives
  // must track reality, not assumption.
  // opts.peek (proactive turns): read the canvas/terminal state WITHOUT consuming the
  // marquee selection — a terminal-triggered turn must not clear what the learner pinned.
  function buildContext(opts = {}) {
    const directive = canvasRef.current
    let canvasContext = describeCanvas(directive, liveStateRef.current)
    if (directive) {
      const seen = seenIdsRef.current.has(directive.id)
      canvasContext = `${seen ? '[VIEWED: the learner has had this on screen]' : '[NOT VIEWED YET: this is on a hidden tab — the learner has NOT had it on screen]'}\n${canvasContext}`
    }
    const selection = pendingSelectionRef.current
      ? { text: pendingSelectionRef.current.text, note: pendingSelectionRef.current.note }
      : null
    if (!opts.peek) setPendingSelection(null)
    return { canvasContext, selection }
  }

  // Driver selection: with a student slug, try the REAL lesson engine (server-
  // authoritative session; Step 4 of the build order). If the student has no
  // session pack (or there's no slug), the scripted showcase takes over.
  const live = useSSESessionDriver({
    studentSlug,
    day: dayId,
    buildContext,
    enabled: Boolean(studentSlug),
  })
  const scriptedEnabled = !studentSlug || live.phase === 'nopack'
  const scripted = useScriptedSessionDriver(SHOWCASE_SESSION, {
    studentSlug,
    buildContext,
    enabled: scriptedEnabled,
  })
  const isLive = Boolean(studentSlug) && live.phase !== 'nopack'
  const { phase, messages, suggestions, canvas, progress, sending, send } = isLive
    ? live
    : scripted
  // T.4e pending-swap + history — live driver only (the scripted showcase's
  // canvas changes are user-chip-triggered, not asynchronous server pushes, so
  // there's nothing to queue-and-confirm).
  const pendingCanvas = isLive ? live.pendingCanvas : null
  const canvasHistory = isLive ? live.history : []
  const acceptPendingCanvas = isLive ? live.acceptPendingCanvas : () => {}
  // Build 1 — Contents Menu: the day's STATIC catalog (titles/types only, from
  // the server) only exists for a live pack — the scripted showcase has no
  // pack to enumerate and no resolve endpoint to browse into.
  const catalog = isLive ? live.catalog : []
  const artifactsById = isLive ? live.artifacts : {}
  // #9 mandatory ship gate (requiresShip days): show the ShipCard overlay when the
  // server says all objectives are done but the game isn't shipped + signed off yet.
  const awaitingShip = isLive ? live.awaitingShip : false
  const markSignedOff = isLive ? live.markSignedOff : () => {}
  const [shipCardOpen, setShipCardOpen] = useState(false)
  // Auto-open the card the moment the gate arrives; if dismissed, the banner re-opens it.
  useEffect(() => { if (awaitingShip) setShipCardOpen(true) }, [awaitingShip])

  // Proactive Director turns (#2/#4/#5): the terminal Sentinel + firing POLICY live here —
  // the only place with the live driver. Detection/dedup is in the Sentinel; this layer
  // adds the throttle and calls the driver. The driver itself guards against racing a
  // learner turn, so this stays lean.
  const sentinelRef = useRef(null)
  if (!sentinelRef.current) sentinelRef.current = createTerminalSentinel()
  const lastProactiveAtRef = useRef(0)
  // Observer glance coordination: one in flight at a time, throttled, and skipped when the
  // terminal tail hasn't changed since the last look (no point re-reading an idle screen).
  const glanceInFlightRef = useRef(false)
  const lastGlanceAtRef = useRef(0)
  const lastGlanceTailRef = useRef('')

  // Fire a proactive Director turn for an event, respecting the global chatty-gap. Most
  // events are gap-EXEMPT because they're either time-critical (a permission/trust prompt
  // must beat the learner's Enter; an error shouldn't wait while he stares at a red wall) or
  // learner-initiated and inherently worth a reply (his OWN typed prompt — #4, the core
  // teachable moment, already rate-limited by the Sentinel's 8s cooldown). Only the
  // Observer's unsolicited "work landed" glance waits out the 25s gap; [PASS] then culls
  // whatever isn't worth words.
  function fireProactive(event) {
    if (!event) return
    const now = Date.now()
    if (!GAP_EXEMPT.has(event.type) && now - lastProactiveAtRef.current < 25000) return
    lastProactiveAtRef.current = now
    live.sendProactive(event)
  }

  // A chunk of work LANDED (LiveTerminal settle). This is the "watch the goings-on" path:
  // hand the terminal to the Observer (Haiku), which keeps the rolling situation fresh AND
  // decides if the moment is worth the Director speaking. Salient → fire a proactive turn
  // with the Observer's one-liner. Throttled + deduped so Haiku isn't called on idle noise.
  async function runObserverGlance(tail) {
    if (glanceInFlightRef.current) return
    const now = Date.now()
    if (now - lastGlanceAtRef.current < 5000) return // floor on Haiku calls; settles are ≥3s apart anyway
    const key = (tail || '').slice(-600)
    if (key === lastGlanceTailRef.current) return // nothing new on screen since last glance
    lastGlanceAtRef.current = now
    lastGlanceTailRef.current = key
    glanceInFlightRef.current = true
    try {
      const res = await fetch(`/${studentSlug}/api/session/glance`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ day: dayId, tail: (tail || '').slice(-4000) }),
      })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (data?.salient) fireProactive({ type: data.kind || 'activity', excerpt: data.oneLine || '' })
    } catch {
      /* fail-open — a missed glance just means no nudge this moment */
    } finally {
      glanceInFlightRef.current = false
    }
  }

  function handleTerminalEvent(signal) {
    if (!isLive || live.phase !== 'active') return
    // Work-landed → the Observer interprets it (activity/error/nothing). Everything else is
    // fast, unambiguous, and latency-sensitive, so the client-side Sentinel handles it
    // directly: permission/trust prompts (must beat Enter) and the learner's own typed
    // prompt (we already have the exact words — no interpretation needed).
    if (signal?.kind === 'settled') { runObserverGlance(signal.text); return }
    const s = sentinelRef.current
    const event =
      signal?.kind === 'output' ? s.onOutput(signal.text)
        : signal?.kind === 'learner-prompt' ? s.onLearnerPrompt(signal.text)
        : null
    fireProactive(event)
  }

  // Refs so buildContext (captured by the driver) reads the latest values.
  const canvasRef = useRef(null)
  const pendingSelectionRef = useRef(null)
  pendingSelectionRef.current = pendingSelection
  syncArtifactRef.current = isLive ? live.syncArtifact : null
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches)
  const [activeTab, setActiveTab] = useState('chat') // narrow only

  const [orientationLocked, setOrientationLocked] = useState(
    () => localStorage.getItem(LS.orientationLocked) === '1',
  )
  const [orientation, setOrientation] = useState(
    () => localStorage.getItem(LS.orientation) || 'lr',
  )
  const [ratioLocked, setRatioLocked] = useState(
    () => localStorage.getItem(LS.ratioLocked) === '1',
  )
  const [ratio, setRatio] = useState(() => {
    const v = parseFloat(localStorage.getItem(LS.ratio))
    return Number.isFinite(v) && v >= 0.2 && v <= 0.8 ? v : DEFAULT_RATIO
  })

  const hasCanvas = !!canvas
  const prevHasCanvasRef = useRef(false)
  const lastDirectiveRef = useRef(null)
  if (canvas) lastDirectiveRef.current = canvas
  const liveDirective = canvas || lastDirectiveRef.current
  // Back-viewing an entry from history overrides what's rendered/described —
  // canvasRef (what buildContext + describeCanvas see) must always match what's
  // ACTUALLY on screen, per the same "seen vs shown" discipline as everything
  // else here.
  const historyEntry = historyViewId ? canvasHistory.find((d) => d.id === historyViewId) || null : null
  // Contents Menu browse takes priority over a history browse (both are local
  // overrides of the live directive; only one is ever set at a time — see
  // openContentsItem/viewHistoryEntry, which each clear the other).
  const shownDirective = browsedDirective || historyEntry || liveDirective
  const browsing = Boolean(historyViewId || browsedDirective)
  canvasRef.current = shownDirective
  const orientationLockedRef = useRef(orientationLocked)
  orientationLockedRef.current = orientationLocked
  const ratioLockedRef = useRef(ratioLocked)
  ratioLockedRef.current = ratioLocked

  useEffect(() => {
    document.title = `${studentName ? studentName + ' — ' : ''}Coached Session`
  }, [studentName])

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY)
    const on = () => setIsNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Slide lifecycle: react to canvas appearing / disappearing.
  useEffect(() => {
    const has = !!canvas
    const was = prevHasCanvasRef.current
    prevHasCanvasRef.current = has
    if (has && !was) {
      // slide-IN: auto-decide layout unless the user has an active override
      if (!orientationLockedRef.current) {
        setOrientation(decideOrientation(window.innerWidth, window.innerHeight, canvas.type))
      }
      if (!ratioLockedRef.current) setRatio(DEFAULT_RATIO)
    } else if (!has && was) {
      // slide-AWAY: reset overrides so the next slide-in re-decides
      setOrientationLocked(false)
      localStorage.removeItem(LS.orientationLocked)
      setRatioLocked(false)
      localStorage.removeItem(LS.ratioLocked)
      setActiveTab('chat')
      setSelecting(false)
      setPendingSelection(null)
    }
  }, [canvas])

  // Reset reported live state + any selection when the shown directive changes
  // (live update OR switching what history entry is being browsed).
  const canvasId = shownDirective?.id
  useEffect(() => {
    liveStateRef.current = null
    setSelecting(false)
    setPendingSelection(null)
  }, [canvasId])

  // A `requested` live frame (server SAY-DO repair) must land in front of the
  // learner: clear any history/contents browse override that would otherwise mask
  // it, and on narrow bring the canvas tab forward. Keyed on the live directive's
  // object identity — a fresh frame each turn — so it fires once per delivery, not
  // on incidental re-renders. (Non-requested frames fall through the guard.)
  useEffect(() => {
    if (!liveDirective?.requested) return
    setHistoryViewId(null)
    setBrowsedDirective(null)
    if (isNarrow) setActiveTab('canvas')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveDirective])

  // Mobile navigation is EXPLICIT, not automatic: we never yank the learner off
  // the chat mid-read. Instead the chat shows a "Continue to <asset>" button when
  // new canvas material is up and unseen; the canvas shows "Back to chat". A
  // directive counts as SEEN when it's actually on screen — wide: whenever the
  // pane is visible; narrow: only while the Canvas tab is active. That seen-state
  // feeds buildContext's VIEWED marker so the instructor never treats hidden
  // material as covered.
  useEffect(() => {
    if (!canvasId || !hasCanvas) return
    if (!isNarrow || activeTab === 'canvas') markSeen(canvasId)
  }, [canvasId, hasCanvas, isNarrow, activeTab])

  const currentSeen = !canvasId || seenIdsRef.current.has(canvasId)
  // eslint-disable-next-line no-unused-expressions
  seenVersion // referenced so the memoized render re-evaluates currentSeen on change
  // Continue appears only once the turn has SETTLED (end of the finished
  // caption) — never mid-stream, never as a persistent bottom bar. Covers BOTH
  // T.4e cases: a frame already displayed but not yet looked at (!currentSeen),
  // and a frame still queued in pendingCanvas (new material waiting to swap
  // in) — either way there's something worth a tap. Suppressed while browsing
  // history (that has its own "Return to current" affordance).
  // Shown under the latest chat response (the trailing slot). Narrow: whenever the
  // chat tab holds unseen/queued material. Wide: whenever a frame is QUEUED
  // (pendingCanvas) — on wide the live canvas is already visible, so "not seen"
  // doesn't apply; only a pending swap warrants a nudge. It pulses to stand apart
  // from the optional-answer chips (a navigation, not a reply). Suppressed while
  // browsing history (that has its own "Return to current" affordance).
  const showContinue =
    !browsing &&
    !sending &&
    ((isNarrow &&
      activeTab === 'chat' &&
      (hasCanvas || Boolean(pendingCanvas)) &&
      (Boolean(pendingCanvas) || !currentSeen)) ||
      (!isNarrow && Boolean(pendingCanvas)))
  const continueTitle = pendingCanvas?.title || shownDirective?.title || 'the canvas'

  // Unified accept: swap in whatever's pending (if anything) and reveal the
  // canvas pane. Used by both the narrow inline chat button and (indirectly,
  // via acceptPendingCanvas alone) the wide overlay pill.
  function continueToCanvas() {
    if (pendingCanvas) acceptPendingCanvas()
    setActiveTab('canvas')
  }
  // The two popovers (History, Contents) are mutually exclusive — opening one
  // closes the other rather than stacking them.
  function toggleHistory() {
    setContentsOpen(false)
    setHistoryOpen((v) => !v)
  }
  function toggleContents() {
    setHistoryOpen(false)
    setContentsOpen((v) => !v)
  }
  function viewHistoryEntry(id) {
    setBrowsedDirective(null)
    setHistoryViewId(id)
    setHistoryOpen(false)
    if (isNarrow) setActiveTab('canvas')
  }
  function returnToCurrent() {
    setHistoryViewId(null)
    setBrowsedDirective(null)
  }

  // Build 1 — Contents Menu: merge the day's static catalog (server, titles/
  // types only) with everything the client has ALREADY resolved — recently-
  // displayed history, the live canvas, and a still-queued pending frame —
  // so runtime-only forms (figure instances, compare() ids, a just-arrived
  // Stagehand build not yet in a refreshed catalog) show up too, deduped by
  // id/key. Recomputed per render — the lists involved are tiny.
  function catalogItems() {
    const map = new Map()
    for (const c of catalog || []) map.set(c.key, { key: c.key, title: c.title, type: c.type })
    for (const d of canvasHistory) if (!map.has(d.id)) map.set(d.id, { key: d.id, title: d.title, type: d.type })
    if (liveDirective && !map.has(liveDirective.id)) {
      map.set(liveDirective.id, { key: liveDirective.id, title: liveDirective.title, type: liveDirective.type })
    }
    if (pendingCanvas && !map.has(pendingCanvas.id)) {
      map.set(pendingCanvas.id, { key: pendingCanvas.id, title: pendingCanvas.title, type: pendingCanvas.type })
    }
    return [...map.values()]
  }

  // Picking a Contents Menu item. Cache-first (never a wasted round trip for
  // something already resolved): the item IS the live target → just snap any
  // browse override back to live; it's already in history or is the queued
  // pending frame → reuse that resolved directive directly; otherwise it's an
  // uncached authored/dynamic target → resolve it read-only via the new
  // /session/canvas endpoint. Either way this is the learner SELF-navigating —
  // never Director intent, never a server-state mutation (canvas.js is a pure
  // read + resolve; see its header comment).
  async function openContentsItem(item) {
    setContentsOpen(false)
    if (isNarrow) setActiveTab('canvas')
    if (liveDirective?.id === item.key) {
      setHistoryViewId(null)
      setBrowsedDirective(null)
      return
    }
    const cached = canvasHistory.find((d) => d.id === item.key)
    if (cached) {
      setBrowsedDirective(null)
      setHistoryViewId(item.key)
      return
    }
    if (pendingCanvas?.id === item.key) {
      setHistoryViewId(null)
      setBrowsedDirective(pendingCanvas)
      return
    }
    if (!isLive) return // scripted showcase has no pack/resolve endpoint
    setHistoryViewId(null)
    setContentsLoadingKey(item.key)
    try {
      const res = await fetch(`/${studentSlug}/api/session/canvas`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ day: dayId, target: item.key }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.directive) setBrowsedDirective(data.directive)
    } catch {
      /* quiet failure — the menu item just doesn't open; nothing to undo */
    } finally {
      setContentsLoadingKey(null)
    }
  }

  function onSelect(sel) {
    const type = canvasRef.current?.type || 'canvas'
    const text = sel.text && sel.text.length ? sel.text : null
    setPendingSelection({
      rectPct: sel.rectPct,
      text,
      note: text ? null : `a region of the ${type}`,
      thumb: sel.thumb || null,
    })
    setSelecting(false)
  }

  function changeOrientation(o) {
    setOrientation(o)
    setOrientationLocked(true)
    localStorage.setItem(LS.orientation, o)
    localStorage.setItem(LS.orientationLocked, '1')
  }
  function commitRatio(r) {
    setRatio(r)
    setRatioLocked(true)
    localStorage.setItem(LS.ratio, String(r))
    localStorage.setItem(LS.ratioLocked, '1')
  }

  function onSend(text) {
    const t = (text || '').trim()
    if (!t) return
    send(t)
  }
  function showCanvasTab() {
    setActiveTab('canvas')
  }
  function restart() {
    if (isLive) {
      live.restart() // server-side reset + fresh opener
      return
    }
    try {
      localStorage.removeItem(`session:state:${studentSlug || 'session'}`)
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  const streamingLastEmpty =
    sending && messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  // shownDirective (declared above, alongside canvasRef) already retains the
  // last live directive while sliding away, AND resolves a browsed history
  // entry when one is active — both cases slide/render correctly here.
  // Any dev param present overlays the server-injected workshop payload. URLs now
  // come from env ([vars]); a link may still carry just ?token= until the secret is
  // set. Each field falls back to the server value, so partial params compose.
  const shownDirectiveFinal =
    shownDirective?.type === 'workshop' && (devTerm.url || devTerm.token || devTerm.viewer)
      ? {
          ...shownDirective,
          payload: {
            ...shownDirective.payload,
            wsUrl: devTerm.url || shownDirective.payload?.wsUrl || '',
            token: devTerm.token || shownDirective.payload?.token || '',
            viewerUrl: devTerm.viewer || shownDirective.payload?.viewerUrl || '',
          },
        }
      : shownDirective

  const canvasPane = (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 relative">
        <ContentCanvas
          directive={shownDirectiveFinal}
          selecting={selecting}
          onToggleSelect={() => setSelecting((v) => !v)}
          onSelect={onSelect}
          onLiveState={reportLiveState.current}
          onEvent={handleTerminalEvent}
          pinnedRect={pendingSelection?.rectPct}
        />
        {browsing ? (
          // Browsing an older directive OR a Contents Menu pick — always
          // offered a way back, wide or narrow.
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
            <button
              type="button"
              onClick={returnToCurrent}
              className="rounded-full bg-ink/90 px-4 py-2 text-[12px] font-semibold text-white shadow-card active:scale-[0.98] flex items-center gap-2"
            >
              <span aria-hidden>←</span>
              <span>Return to current</span>
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          !isNarrow &&
          pendingCanvas && (
            // Wide VP only (narrow uses the inline chat Continue button off the
            // same pendingCanvas state) — tap swaps + marks seen.
            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
              <button
                type="button"
                onClick={acceptPendingCanvas}
                className="continue-pulse max-w-full rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-white shadow-card active:scale-[0.98] flex items-center gap-2 session-fade"
              >
                <span className="truncate">Continue to {pendingCanvas.title}</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          )
        )}
      </div>
      {isNarrow && (
        // Narrow only: explicit return to chat (the canvas isn't beside the chat).
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className="shrink-0 border-t border-rule bg-white px-4 py-3 text-[13px] font-semibold text-accent active:bg-accent/5"
        >
          ← Back to chat
        </button>
      )}
    </div>
  )

  const chatPane = (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Narrow uses the compact top bar instead; this fuller header is desktop-only. */}
      {!isNarrow && (
        <ProgressHeader
          label={isLive ? 'Course Session' : 'Coached Session'}
          courseTitle={isLive ? `Day ${dayId} — ${live.dayTitle || '…'}` : SHOWCASE_SESSION.title}
          ticked={progress.ticked}
          totalRequired={progress.totalRequired}
          focus={progress.focus}
        />
      )}
      {isLive && phase === 'loading' ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-muted animate-pulse">Starting your session…</p>
        </div>
      ) : isLive && phase === 'error' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-ink">{live.error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-rule px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Reload
          </button>
        </div>
      ) : (
        <ChatMessages
          messages={messages}
          streamingLastEmpty={streamingLastEmpty}
          trailing={
            showContinue ? (
              // INLINE at the end of the latest response (both viewports): a distinct,
              // full-width navigation bar — NOT a reply chip. It pulses so it reads as
              // "the thing to do next" and stands apart from the optional-answer chips.
              <button
                type="button"
                onClick={continueToCanvas}
                className="continue-pulse w-full rounded-xl bg-accent px-4 py-3 text-[13px] font-semibold text-white shadow-card active:scale-[0.99] session-fade flex items-center justify-center gap-2"
              >
                <span className="truncate">Continue to {continueTitle}</span>
                <span aria-hidden>→</span>
              </button>
            ) : null
          }
        />
      )}
      {phase === 'active' && (
        <ChatInput
          suggestions={suggestions}
          onSend={onSend}
          disabled={sending}
          attachment={pendingSelection}
          onClearAttachment={() => setPendingSelection(null)}
        />
      )}
      {isLive && phase === 'done' && (
        <div className="shrink-0 border-t border-rule bg-white px-4 py-3 text-center">
          <p className="text-sm font-medium text-ink">Session complete — nice work. ✓</p>
        </div>
      )}
    </div>
  )

  const showNarrowTabs = isNarrow && hasCanvas
  const headerTitle = isLive ? live.dayTitle || 'Session' : SHOWCASE_SESSION.title
  const pct = progress.totalRequired ? (progress.ticked / progress.totalRequired) * 100 : 0

  return (
    // Locked to the window (#9): the app frame NEVER scrolls — only inner
    // containers do (chat list, canvas content, terminal inside its frame).
    // `relative` anchors the history popover.
    <div className="relative h-[100dvh] flex flex-col overflow-hidden bg-paper">
      {isLive && awaitingShip && phase !== 'done' && (
        shipCardOpen ? (
          <ShipCard
            studentSlug={studentSlug}
            day={dayId}
            onDone={markSignedOff}
            onClose={() => setShipCardOpen(false)}
          />
        ) : (
          // Dismissed to the workshop — a persistent nudge to come finish. The session
          // stays open (awaitingShip) until they ship + sign off.
          <button
            type="button"
            onClick={() => setShipCardOpen(true)}
            className="absolute top-3 right-3 z-50 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-card hover:brightness-110 continue-pulse"
          >
            🚀 Ship &amp; finish today
          </button>
        )
      )}
      {isNarrow ? (
        // Compact, translucent single-row header (Grok-style): title + progress
        // pill + slim progress line + nav/settings chips. ~46px total (~5-6% of a
        // phone), vs the ~18% the stacked toolbar + ProgressHeader used to take.
        <header className="shrink-0 z-30 bg-white/70 backdrop-blur-md border-b border-rule/60">
          <div className="flex items-center gap-2 px-3 h-11">
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-ink">{headerTitle}</span>
              {progress.totalRequired > 0 && (
                <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                  {progress.ticked}/{progress.totalRequired}
                </span>
              )}
            </div>
            {showNarrowTabs && (
              // One context toggle chip (shows the destination pane) instead of a
              // two-button group — Continue/Back handle the main flow, so this is
              // just the "jump to the other pane" shortcut. Conservative on width.
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'canvas' ? 'chat' : 'canvas')}
                className="relative shrink-0 rounded-full border border-rule/70 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-accent active:scale-95"
              >
                {activeTab === 'canvas' ? '‹ Chat' : 'Canvas ›'}
                {showContinue && activeTab !== 'canvas' && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                )}
              </button>
            )}
            {isLive && catalog.length > 0 && (
              <button
                type="button"
                onClick={toggleContents}
                title="Jump to any part of today's session"
                aria-label="Contents"
                className="shrink-0 h-7 w-7 grid place-items-center rounded-full border border-rule/70 bg-white/60 text-muted active:scale-95"
              >
                ☰
              </button>
            )}
            {canvasHistory.length > 1 && (
              <button
                type="button"
                onClick={toggleHistory}
                title="Revisit earlier canvas material"
                className="shrink-0 rounded-full border border-rule/70 bg-white/60 px-2 py-1 text-[11px] font-medium text-muted active:scale-95"
              >
                ‹ History
              </button>
            )}
            <button
              type="button"
              onClick={restart}
              title="Start this session over"
              className="shrink-0 h-7 w-7 grid place-items-center rounded-full border border-rule/70 bg-white/60 text-muted active:scale-95"
              aria-label="Restart session"
            >
              ↻
            </button>
          </div>
          {progress.totalRequired > 0 && (
            <div className="h-[2px] w-full bg-rule/40">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          )}
        </header>
      ) : (
        <div className="shrink-0 border-b border-rule bg-white flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/coursework-logo-techy.png"
              alt="Coursework"
              className="shrink-0 h-[30px] w-auto"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted truncate">
              {studentName || 'Coursework'}
            </span>
            <button
              type="button"
              onClick={restart}
              title="Clear this session and start over"
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-ink underline underline-offset-2"
            >
              ↻ Restart
            </button>
          </div>
          {/* Canvas-side controls live on the RIGHT, near the canvas they act on. */}
          <div className="flex items-center gap-3 shrink-0">
            {canvasHistory.length > 1 && (
              <button
                type="button"
                onClick={toggleHistory}
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-ink underline underline-offset-2"
              >
                ‹ History
              </button>
            )}
            {isLive && catalog.length > 0 && (
              <button
                type="button"
                onClick={toggleContents}
                title="Jump to any part of today's session"
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-ink underline underline-offset-2"
              >
                ☰ Contents
              </button>
            )}
            {hasCanvas && <OrientationToggle orientation={orientation} onChange={changeOrientation} />}
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="absolute right-3 top-12 sm:top-14 z-40 w-64 max-h-80 overflow-y-auto rounded-lg border border-rule bg-white shadow-card">
          <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-white px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">History</span>
            <button type="button" onClick={() => setHistoryOpen(false)} className="text-muted hover:text-ink text-[13px] leading-none">
              ✕
            </button>
          </div>
          <ul>
            {[...canvasHistory].reverse().map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => viewHistoryEntry(d.id)}
                  className={`w-full text-left px-3 py-2 text-[12px] hover:bg-accent/5 flex items-center justify-between gap-2 ${
                    canvasId === d.id ? 'bg-accent/10' : ''
                  }`}
                >
                  <span className="truncate text-ink">{d.title || d.id}</span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{d.type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {contentsOpen && (
        // Build 1 — Contents Menu: EVERY navigable target for the day (the
        // static catalog + anything already resolved client-side), not just
        // what's been visited — self-navigation, not a revisit list.
        <div className="absolute right-3 top-12 sm:top-14 z-40 w-72 max-h-80 overflow-y-auto rounded-lg border border-rule bg-white shadow-card">
          <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-white px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Contents</span>
            <button type="button" onClick={() => setContentsOpen(false)} className="text-muted hover:text-ink text-[13px] leading-none">
              ✕
            </button>
          </div>
          <ul>
            {catalogItems().map((item) => {
              const artifactId = item.type === 'artifact' ? item.key.slice('artifact:'.length) : null
              const drafted = artifactId ? Boolean((artifactsById?.[artifactId]?.content || '').trim()) : false
              const loading = contentsLoadingKey === item.key
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => openContentsItem(item)}
                    disabled={loading}
                    className={`w-full text-left px-3 py-2 text-[12px] hover:bg-accent/5 flex items-center justify-between gap-2 disabled:opacity-50 ${
                      canvasId === item.key ? 'bg-accent/10' : ''
                    }`}
                  >
                    <span className="truncate text-ink flex items-center gap-1.5 min-w-0">
                      {artifactId && (
                        <span
                          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${drafted ? 'bg-accent' : 'bg-rule'}`}
                          title={drafted ? 'Drafted' : 'Not started'}
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{item.title || item.key}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                      {loading ? '…' : item.type}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <SplitPane
        orientation={orientation}
        isNarrow={isNarrow}
        activeTab={activeTab}
        hasCanvas={hasCanvas}
        ratio={ratio}
        onRatioChange={setRatio}
        onRatioCommit={commitRatio}
        canvas={canvasPane}
        chat={chatPane}
      />
    </div>
  )
}
