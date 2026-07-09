import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { copyText } from '../../chat/chatMarkdown.jsx'

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

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 13,
      theme: { background: '#111111', foreground: '#e5e7eb', cursor: '#28c840', selectionBackground: '#2b4a63' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)

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
      const pasteCombo =
        (IS_MAC && e.metaKey && key === 'v') || (!IS_MAC && e.ctrlKey && e.shiftKey && key === 'v')
      if (pasteCombo) {
        e.preventDefault()
        pasteFromClipboard(term)
        return false
      }
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
      try { ws?.readyState === WebSocket.OPEN && ws.send(d) } catch {}
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

    const ro = new ResizeObserver(() => { safeFit(); sendResize() })
    ro.observe(hostRef.current)

    connect()

    return () => {
      closing = true
      if (reportTimer) clearTimeout(reportTimer)
      if (settleTimer) clearTimeout(settleTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      clearTimeout(t1); clearTimeout(t2)
      hostEl.removeEventListener('contextmenu', onContextMenu)
      ro.disconnect()
      dataSub.dispose()
      try { ws && ws.close() } catch {}
      term.dispose()
    }
  }, [url, token, onStatus, onLiveState])

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" onClick={() => hostRef.current?.querySelector('textarea')?.focus()} />
      {note && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-[12px] text-[#9ca3af]">{note}</span>
        </div>
      )}
    </div>
  )
}
