import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { copyText } from '../../chat/chatMarkdown.jsx'
import { registerTerminalExtractor, terminalTextInScreenRect } from '../../../session/terminalSelection.js'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '')
function pasteFromClipboard(term) {
  // term.paste() routes through onData (respects bracketed-paste mode) → the ws sender.
  navigator.clipboard?.readText?.().then((t) => { if (t) term.paste(t) }).catch(() => {})
}

// Real terminal: xterm.js in the browser <-> WebSocket <-> a PTY on the droplet.
// `url` is the wss base (cloudflared tunnel); `token` gates the bridge. The bridge
// attaches to a PERSISTENT tmux session, so a dropped socket loses nothing — we
// auto-reconnect and re-attach to the same shell (running `claude`, cwd, scrollback
// all intact). The learner sees a brief "reconnecting…" and their session is back.
const ANSI_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b[()][0-9A-Za-z]|[\x00-\x08\x0b\x0c\x0e-\x1f]/g
// Claude Code shows this hint WHILE it's working. We use it as the "something is happening"
// marker: only after we've seen it AND the terminal then goes quiet (the hint gone, no new
// output for a few seconds) do we treat a chunk of work as having LANDED — the moment worth
// a Director glance. This keeps the proactive turn off ordinary shell noise and off the
// mid-work pauses (the hint is still on screen then).
const WORKING_RE = /esc to (interrupt|cancel)/i
// A loose "this might be a failure" armer so a command that errors FAST (no Claude working
// cycle, so WORKING_RE never showed) still triggers a glance. This does NOT classify — the
// Observer (Haiku) decides if it's a real error; a false arm just costs one quiet glance.
const ERRORISH_RE = /\b(error|failed|failure|exception|traceback|not found|denied|cannot|fatal)\b/i
const SETTLE_MS = 3000

// Terminal font sizing. On a narrow viewport (a phone) 13px shows almost no columns
// and wraps every line; auto-shrink so more fits. A learner's explicit +/- choice is
// remembered in localStorage and turns auto-sizing OFF (their number wins from then on).
const FONT_KEY = 'coursework.terminalFontSize'
const FONT_MIN = 8
const FONT_MAX = 20
const FONT_DEFAULT = 13
function autoFont(width) {
  if (!width) return FONT_DEFAULT
  if (width < 420) return 10
  if (width < 640) return 11
  return FONT_DEFAULT
}
// The text currently visible on screen (the viewport rows), read straight from the buffer.
// Fallback for the Copy button when there's no selection — under a TUI's mouse-reporting mode
// a plain drag never makes a selection, so "copy what I see" is the reliable path.
function viewportText(term) {
  try {
    const buf = term.buffer.active
    const start = buf.viewportY
    const out = []
    for (let i = 0; i < term.rows; i++) {
      const line = buf.getLine(start + i)
      out.push(line ? line.translateToString(true) : '')
    }
    return out.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
  } catch { return '' }
}

// The arrow / control sequences an on-screen key sends to the PTY.
const KEY_SEQ = {
  esc: '\x1b',
  tab: '\t',
  enter: '\r',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
}

export default function LiveTerminal({ url, token, getToken, onStatus, onLiveState, onEvent }) {
  const hostRef = useRef(null)
  // Stable ref so onEvent identity changes never re-run the WS effect (which would drop
  // the socket). onEvent carries salient terminal signals up for the proactive Sentinel.
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  // Stable ref to the token fetcher (Phase I signed tokens) so its identity changing never
  // re-runs the WS effect; connect() calls it fresh before each (re)connect.
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const [note, setNote] = useState('connecting…') // visible overlay until first bytes arrive

  // --- Mobile controls: font sizing + a key pad for keys the iOS keyboard lacks. ---
  // Live handles into the effect so the render's buttons can drive the terminal/socket:
  const termRef = useRef(null)     // the xterm Terminal
  const fitRef = useRef(null)      // FitAddon (re-fit after a font change)
  const wsSendRef = useRef(null)   // send raw bytes over the CURRENT socket
  const resizeRef = useRef(null)   // tell the PTY the new cols/rows
  const ctrlArmedRef = useRef(false) // next typed letter → Ctrl-<letter>
  const disarmCtrlRef = useRef(null) // effect calls this to clear the armed UI state
  const [fontSize, setFontSize] = useState(FONT_DEFAULT)
  const [panelOpen, setPanelOpen] = useState(false)
  const [ctrlArmed, setCtrlArmed] = useState(false)
  const [copyFlash, setCopyFlash] = useState('')
  const flashTimer = useRef(null)
  ctrlArmedRef.current = ctrlArmed
  disarmCtrlRef.current = () => setCtrlArmed(false)

  // Copy the current selection, or — when there's none (a TUI's mouse mode swallows drags) —
  // the visible screen. Always puts real text on the clipboard, on mobile and desktop alike.
  function copyFromTerminal() {
    const term = termRef.current
    if (!term) return
    const sel = term.hasSelection() ? term.getSelection() : ''
    const text = sel || viewportText(term)
    if (!text) { flashCopy('Nothing to copy'); return }
    copyText(text)
    flashCopy(sel ? 'Copied selection' : 'Copied screen')
  }
  function flashCopy(msg) {
    setCopyFlash(msg)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setCopyFlash(''), 1500)
  }
  // Explicit paste (touch has no ⌘V, and desktop ⌘V is handled natively by xterm). Reads the
  // clipboard and sends it via term.paste (respects bracketed-paste). Surfaces WHY on failure —
  // clipboard.readText needs a gesture + permission and is silently blocked in some browsers.
  function pasteHere() {
    const term = termRef.current
    if (!term) return
    const read = navigator.clipboard?.readText?.()
    if (!read) { flashCopy('Use ⌘V to paste'); return }
    read.then((t) => {
      if (t) { term.paste(t); term.focus(); flashCopy('Pasted') }
      else flashCopy('Clipboard empty')
    }).catch(() => flashCopy('Blocked — use ⌘V'))
  }

  function applyFont(size) {
    const s = Math.max(FONT_MIN, Math.min(FONT_MAX, size))
    setFontSize(s)
    try { localStorage.setItem(FONT_KEY, String(s)) } catch {} // an explicit choice = disable auto-sizing
    const term = termRef.current
    if (term) {
      term.options.fontSize = s
      try { fitRef.current?.fit() } catch {}
      resizeRef.current?.()
    }
  }

  // Send a key/sequence to the PTY, keeping the terminal focused (buttons use
  // onPointerDown+preventDefault so tapping them never blurs xterm's textarea —
  // that's what keeps the iOS keyboard open for a Ctrl-<letter> combo).
  function sendKey(bytes) {
    wsSendRef.current?.(bytes)
    termRef.current?.focus()
  }

  useEffect(() => {
    if (!url) { setNote('no terminal URL'); return }
    setNote('connecting…')

    let outbuf = ''
    let reportTimer = null
    let settleTimer = null
    let sawWorking = false // Claude Code showed the "esc to interrupt" hint since the last settle
    let sawInteresting = false // worth a glance once quiet: a working cycle OR an error-ish line
    let gotData = false
    const clean = () => outbuf.replace(ANSI_RE, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n')
    const report = () => {
      const c = clean()
      // Salient-event signal for the proactive Sentinel (permission prompts etc.) — the
      // Sentinel + firing policy live upstream; here we just hand up the cleaned output.
      if (typeof onEventRef.current === 'function') onEventRef.current({ kind: 'output', text: c })
      if (typeof onLiveState !== 'function') return
      const tail = c.slice(-1800).trimStart()
      onLiveState(`Live terminal on the droplet (real PTY, user \`coder\`, persistent tmux session). Recent output:\n${tail || '(no output yet)'}`)
    }
    // "Work landed": we saw Claude Code working and the terminal has now been quiet for
    // SETTLE_MS. If the hint is STILL on screen the work is only paused (mid-think) — wait.
    const emitSettled = () => {
      settleTimer = null
      if (!sawInteresting) return
      const c = clean()
      // If Claude is still visibly working, the quiet is just a mid-think pause — wait.
      if (sawWorking && WORKING_RE.test(c.slice(-400))) { settleTimer = setTimeout(emitSettled, SETTLE_MS); return }
      sawWorking = false
      sawInteresting = false
      if (typeof onEventRef.current === 'function') onEventRef.current({ kind: 'settled', text: c })
    }
    const capture = (s) => {
      outbuf = (outbuf + s).slice(-6000)
      // Cheap raw-tail checks (these words carry no ANSI inside them). A working cycle or an
      // error-ish line arms the settle glance; only the working case waits out the hint.
      if (WORKING_RE.test(outbuf.slice(-600))) { sawWorking = true; sawInteresting = true }
      else if (ERRORISH_RE.test(s)) sawInteresting = true
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(emitSettled, SETTLE_MS)
      if (reportTimer) return
      reportTimer = setTimeout(() => { reportTimer = null; report() }, 500)
    }

    // Initial font: a remembered explicit choice wins; otherwise size to the viewport.
    let stored = 0
    try { stored = Number(localStorage.getItem(FONT_KEY)) || 0 } catch {}
    const initialFont = stored || autoFont(hostRef.current?.clientWidth || 0)
    setFontSize(initialFont)

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: initialFont,
      theme: { background: '#111111', foreground: '#e5e7eb', cursor: '#28c840', selectionBackground: '#2b4a63' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    termRef.current = term
    fitRef.current = fit

    // Clipboard (#7/#8): xterm forwards keystrokes to the PTY, so ⌘C/Ctrl-C would hit
    // the shell (SIGINT) and its selection isn't a real DOM selection (native copy grabs
    // nothing). Intercept the clipboard combos AND right-click so select→copy and
    // paste→terminal behave like a normal terminal. Bare Ctrl-C with NO selection must
    // still send SIGINT, so we only steal it when there's something to copy.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true
      const key = e.key.toLowerCase()
      const copyCombo =
        (IS_MAC && e.metaKey && key === 'c') ||
        (!IS_MAC && e.ctrlKey && e.shiftKey && key === 'c') ||
        (!IS_MAC && e.ctrlKey && !e.shiftKey && key === 'c' && term.hasSelection())
      if (copyCombo && term.hasSelection()) {
        e.preventDefault() // stop native copy from clobbering the clipboard with ''
        copyText(term.getSelection())
        return false
      }
      // Paste: DON'T intercept ⌘V / Ctrl-Shift-V — let xterm's built-in paste handle it.
      // It reads the clipboard synchronously off the real DOM paste event (works in Safari,
      // no flaky clipboard.readText permission) and applies bracketed-paste exactly as the
      // running app requested — which is what keeps a long OAuth code intact. The old
      // readText→term.paste path could deliver a partial/mangled string, so a pasted login
      // code failed the token exchange (OAuth 400). Native paste is the reliable path.
      return true
    })

    // Right-click: copy the selection if there is one, otherwise paste (PuTTY-style).
    const onContextMenu = (e) => {
      e.preventDefault()
      if (term.hasSelection()) copyText(term.getSelection())
      else pasteFromClipboard(term)
    }
    const hostEl = hostRef.current
    hostEl.addEventListener('contextmenu', onContextMenu)

    // Fit only once the container has real dimensions — fitting at mount (0×0 before
    // layout) leaves the terminal at 0 rows, which reads as "no prompt". rAF + a short
    // retry covers the fade-in transition.
    const safeFit = () => { try { if (hostRef.current?.clientHeight > 0) fit.fit() } catch {} }
    requestAnimationFrame(safeFit)
    const t1 = setTimeout(safeFit, 60)
    const t2 = setTimeout(safeFit, 250)

    const wsBase = url.replace(/^http/, 'ws').replace(/\/$/, '')

    let ws = null
    let closing = false // set on unmount so a deliberate close doesn't reconnect
    let attempts = 0
    let reconnectTimer = null

    const sendResize = () => {
      try { ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows })) } catch {}
    }
    resizeRef.current = sendResize
    // The key pad sends through here; the closure over `ws` (a let, reassigned on each
    // reconnect) always targets the live socket.
    wsSendRef.current = (s) => { try { ws?.readyState === WebSocket.OPEN && ws.send(s) } catch {} }

    async function connect() {
      onStatus?.('connecting')
      // Fresh, short-lived signed token per (re)connect; fall back to the injected token if
      // the fetch is unavailable. The persistent tmux means a brief token gap loses nothing.
      let tok = token || ''
      try {
        const fresh = typeof getTokenRef.current === 'function' ? await getTokenRef.current() : ''
        if (fresh) tok = fresh
      } catch { /* fall back to injected token */ }
      if (closing) return
      const wsUrl = `${wsBase}/?token=${encodeURIComponent(tok)}`
      try { ws = new WebSocket(wsUrl) } catch { setNote('bad terminal URL'); onStatus?.('error'); return }
      ws.binaryType = 'arraybuffer'
      const dec = new TextDecoder()

      ws.onopen = () => {
        attempts = 0
        onStatus?.('connected')
        safeFit()
        sendResize()
        term.focus()
      }
      ws.onmessage = (e) => {
        if (!gotData) { gotData = true; setNote('') }
        const s = typeof e.data === 'string' ? e.data : dec.decode(e.data)
        term.write(s)
        capture(s)
      }
      ws.onclose = () => {
        if (closing) return
        // The tmux session lives on the droplet — reconnect re-attaches to it.
        onStatus?.('connecting')
        setNote('reconnecting…')
        attempts += 1
        const delay = Math.min(1000 * attempts, 5000)
        reconnectTimer = setTimeout(connect, delay)
      }
      ws.onerror = () => { onStatus?.('error'); if (!gotData) setNote('connection error') }
    }

    // Learner keystrokes → the current socket. term persists across reconnects, so
    // this handler is wired once and always targets the live ws. We ALSO reconstruct the
    // line the learner is composing (for the learner-prompt event, #4): accumulate
    // printable chars, honor backspace, flush on Enter, and unwrap bracketed-paste blocks;
    // escape sequences (arrows/fn keys) are ignored so they don't corrupt the buffer.
    let lineBuf = ''
    const dataSub = term.onData((d) => {
      // Ctrl pad armed: turn the next single typed letter into Ctrl-<letter> (so a phone
      // keyboard can send Ctrl-C etc.), then disarm. Anything else passes through.
      let payload = d
      if (ctrlArmedRef.current) {
        if (d.length === 1) {
          const c = d.toLowerCase().charCodeAt(0)
          if (c >= 97 && c <= 122) payload = String.fromCharCode(c & 0x1f)
        }
        ctrlArmedRef.current = false
        disarmCtrlRef.current?.()
      }
      try { ws?.readyState === WebSocket.OPEN && ws.send(payload) } catch {}
      const emit = onEventRef.current
      if (typeof emit !== 'function') return
      const paste = d.match(/\x1b\[200~([\s\S]*?)\x1b\[201~/)
      if (paste) { lineBuf += paste[1].replace(/[\r\n]+/g, ' '); return }
      if (d.charCodeAt(0) === 0x1b) return // control sequence (arrows, fn keys) — ignore
      for (const ch of d) {
        if (ch === '\r' || ch === '\n') {
          const line = lineBuf.trim()
          lineBuf = ''
          if (line) emit({ kind: 'learner-prompt', text: line })
        } else if (ch === '\x7f' || ch === '\b') {
          lineBuf = lineBuf.slice(0, -1)
        } else if (ch >= ' ') {
          lineBuf += ch
        }
      }
    })

    const ro = new ResizeObserver(() => {
      // Responsive auto-sizing — only while the learner hasn't set an explicit size.
      let hasChoice = false
      try { hasChoice = Boolean(localStorage.getItem(FONT_KEY)) } catch {}
      if (!hasChoice) {
        const f = autoFont(hostRef.current?.clientWidth || 0)
        if (f && term.options.fontSize !== f) { term.options.fontSize = f; setFontSize(f) }
      }
      safeFit(); sendResize()
    })
    ro.observe(hostRef.current)

    // Let the marquee "Point" tool read real text out of this terminal (xterm paints to
    // a <canvas>, so the DOM caret probe the marquee uses elsewhere finds nothing here).
    const unregisterExtractor = registerTerminalExtractor((rect) => terminalTextInScreenRect(term, hostEl, rect))

    connect()

    return () => {
      closing = true
      if (reportTimer) clearTimeout(reportTimer)
      if (settleTimer) clearTimeout(settleTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      clearTimeout(t1); clearTimeout(t2)
      hostEl.removeEventListener('contextmenu', onContextMenu)
      unregisterExtractor()
      ro.disconnect()
      dataSub.dispose()
      try { ws && ws.close() } catch {}
      term.dispose()
      termRef.current = null
      fitRef.current = null
      wsSendRef.current = null
      resizeRef.current = null
    }
  }, [url, token, onStatus, onLiveState])

  // Buttons use onPointerDown+preventDefault so a tap never blurs xterm's textarea —
  // that keeps the iOS keyboard open (needed for arming Ctrl then typing a letter).
  const hold = (fn) => ({
    onPointerDown: (e) => { e.preventDefault(); fn() },
  })
  const keyCls = 'min-w-[2.1rem] rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-center font-mono text-[13px] text-[#e5e7eb] active:bg-white/20'

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" onClick={() => hostRef.current?.querySelector('textarea')?.focus()} />
      {note && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-[12px] text-[#9ca3af]">{note}</span>
        </div>
      )}

      {/* Controls panel — text size + keys the on-screen keyboard lacks. */}
      {panelOpen && (
        <div className="absolute bottom-14 right-2 z-30 w-[15rem] rounded-xl border border-white/15 bg-black/80 p-3 backdrop-blur-md shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9ca3af]">Text size</span>
            <div className="flex items-center gap-2">
              <button {...hold(() => applyFont(fontSize - 1))} className={keyCls} aria-label="Smaller text">A−</button>
              <span className="w-8 text-center font-mono text-[12px] text-[#e5e7eb]">{fontSize}</span>
              <button {...hold(() => applyFont(fontSize + 1))} className={keyCls} aria-label="Larger text">A+</button>
            </div>
          </div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#9ca3af]">Keys</div>
          <div className="grid grid-cols-4 gap-1.5">
            <button {...hold(() => sendKey(KEY_SEQ.esc))} className={keyCls}>esc</button>
            <button {...hold(() => sendKey(KEY_SEQ.tab))} className={keyCls}>tab</button>
            <button
              {...hold(() => setCtrlArmed((v) => !v))}
              className={`${keyCls} ${ctrlArmed ? '!bg-[#28c840] !text-black !border-[#28c840]' : ''}`}
            >
              ctrl
            </button>
            <button {...hold(() => sendKey(KEY_SEQ.enter))} className={keyCls}>⏎</button>
            <button {...hold(() => sendKey(KEY_SEQ.left))} className={keyCls}>←</button>
            <button {...hold(() => sendKey(KEY_SEQ.up))} className={keyCls}>↑</button>
            <button {...hold(() => sendKey(KEY_SEQ.down))} className={keyCls}>↓</button>
            <button {...hold(() => sendKey(KEY_SEQ.right))} className={keyCls}>→</button>
          </div>
          {ctrlArmed && (
            <div className="mt-2 font-mono text-[10px] leading-tight text-[#28c840]">
              Ctrl armed — tap a letter to send Ctrl-&lt;letter&gt; (e.g. C to interrupt).
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button {...hold(copyFromTerminal)} className={`${keyCls} flex-1`}>⧉ Copy</button>
            <button {...hold(pasteHere)} className={`${keyCls} flex-1`}>⇥ Paste</button>
            {copyFlash && <span className="font-mono text-[10px] text-[#28c840]">{copyFlash}</span>}
          </div>
          <div className="mt-1 font-mono text-[9px] leading-tight text-[#9ca3af]">
            Copy grabs your selection, or the visible screen. To select inside a menu, hold{' '}
            {IS_MAC ? '⌥ Option' : 'Shift'} while dragging, then {IS_MAC ? '⌘C' : 'Ctrl-Shift-C'}.
            Paste also works with {IS_MAC ? '⌘V' : 'Ctrl-Shift-V'}.
          </div>
        </div>
      )}

      {/* Floating, white-tinged translucent toggle — bottom-right of the terminal. */}
      <button
        {...hold(() => setPanelOpen((v) => !v))}
        aria-label="Terminal controls"
        className={`absolute bottom-2 right-2 z-30 grid h-5 place-items-center rounded-sm border border-white/25 px-1 font-mono text-[9px] font-bold leading-none tracking-[0.12em] backdrop-blur-md transition ${
          panelOpen ? 'bg-white/30 text-white' : 'bg-white/15 text-white/90 hover:bg-white/25'
        }`}
      >
        CTRL
      </button>
    </div>
  )
}
