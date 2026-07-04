import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgressHeader from '../chat/ProgressHeader.jsx'
import ChatMessages from '../chat/ChatMessages.jsx'
import ChatInput from '../chat/ChatInput.jsx'
import ContentCanvas from './ContentCanvas.jsx'
import SplitPane from './SplitPane.jsx'
import OrientationToggle from './OrientationToggle.jsx'
import { useScriptedSessionDriver } from '../../session/useSessionDriver.js'
import { SHOWCASE_SESSION } from '../../session/scriptedSession.js'
import { describeCanvas } from '../../session/describeCanvas.js'
import { getStudent } from '../../students.js'

const NARROW_QUERY = '(max-width: 767px)'
const DEFAULT_RATIO = 0.6
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
  const student = getStudent(studentSlug)
  const studentName = student?.name

  const [draft, setDraft] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [pendingSelection, setPendingSelection] = useState(null)
  const liveStateRef = useRef(null)
  const reportLiveState = useRef((s) => {
    liveStateRef.current = s
  }).current

  // buildContext runs at send-time inside the driver: it snapshots what's on the
  // canvas (+ any marquee selection) for the model, then consumes the selection.
  function buildContext() {
    const directive = canvasRef.current
    const canvasContext = describeCanvas(directive, liveStateRef.current)
    const selection = pendingSelectionRef.current
      ? { text: pendingSelectionRef.current.text, note: pendingSelectionRef.current.note }
      : null
    setPendingSelection(null)
    return { canvasContext, selection }
  }

  // Hybrid driver: chips advance the scripted tour; free text → real model turn
  // (with the canvas context from buildContext).
  const { phase, messages, suggestions, canvas, progress, sending, send } =
    useScriptedSessionDriver(SHOWCASE_SESSION, { studentSlug, buildContext })

  // Refs so buildContext (captured by the driver) reads the latest values.
  const canvasRef = useRef(null)
  const pendingSelectionRef = useRef(null)
  pendingSelectionRef.current = pendingSelection
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches)
  const [activeTab, setActiveTab] = useState('chat') // narrow only
  const [canvasDirty, setCanvasDirty] = useState(false)

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
  canvasRef.current = canvas || lastDirectiveRef.current
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
      setCanvasDirty(false)
      setSelecting(false)
      setPendingSelection(null)
    }
  }, [canvas])

  // Reset reported live state + any selection when the shown directive changes.
  const canvasId = canvas?.id
  useEffect(() => {
    liveStateRef.current = null
    setSelecting(false)
    setPendingSelection(null)
  }, [canvasId])

  // Flag unseen canvas updates while on the chat tab (narrow).
  useEffect(() => {
    if (!canvas) return
    if (isNarrow && activeTab === 'chat') setCanvasDirty(true)
  }, [canvas, isNarrow, activeTab])

  function onSelect(sel) {
    const type = canvasRef.current?.type || 'canvas'
    const text = sel.text && sel.text.length ? sel.text : null
    setPendingSelection({
      rectPct: sel.rectPct,
      text,
      note: text ? null : `a region of the ${type}`,
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
    setDraft('')
  }
  function showCanvasTab() {
    setActiveTab('canvas')
    setCanvasDirty(false)
  }
  function restart() {
    try {
      localStorage.removeItem(`session:state:${studentSlug || 'session'}`)
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  const streamingLastEmpty =
    sending && messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  // Retain the last directive while sliding away so it slides out WITH its content.
  const canvasPane = (
    <ContentCanvas
      directive={canvas || lastDirectiveRef.current}
      selecting={selecting}
      onToggleSelect={() => setSelecting((v) => !v)}
      onSelect={onSelect}
      onLiveState={reportLiveState}
      pinnedRect={pendingSelection?.rectPct}
    />
  )

  const chatPane = (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      <ProgressHeader
        label="Coached Session"
        courseTitle={SHOWCASE_SESSION.title}
        ticked={progress.ticked}
        totalRequired={progress.totalRequired}
        focus={progress.focus}
      />
      <ChatMessages messages={messages} streamingLastEmpty={streamingLastEmpty} />
      {phase === 'active' && (
        <ChatInput
          suggestions={suggestions}
          draft={draft}
          onDraft={setDraft}
          onSend={onSend}
          disabled={sending}
          attachment={pendingSelection}
          onClearAttachment={() => setPendingSelection(null)}
        />
      )}
    </div>
  )

  const showNarrowTabs = isNarrow && hasCanvas

  return (
    <div className="h-[100dvh] flex flex-col overflow-x-hidden bg-paper">
      <div className="shrink-0 border-b border-rule bg-white flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
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
        {isNarrow ? (
          showNarrowTabs && (
            <div className="inline-flex rounded-lg border border-rule bg-white p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`rounded-md px-3 py-1 text-[12px] font-medium transition ${
                  activeTab === 'chat' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={showCanvasTab}
                className={`relative rounded-md px-3 py-1 text-[12px] font-medium transition ${
                  activeTab === 'canvas' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                }`}
              >
                Canvas
                {canvasDirty && activeTab !== 'canvas' && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
                )}
              </button>
            </div>
          )
        ) : (
          hasCanvas && <OrientationToggle orientation={orientation} onChange={changeOrientation} />
        )}
      </div>

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
