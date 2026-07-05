import { useEffect, useMemo, useRef, useState } from 'react'

// Hybrid session driver. Exposes the DriverState contract (src/session/types.js).
// Two input paths:
//   • a suggested-reply chip → advance the SCRIPTED tour (canvas changes, canned
//     narration) — this is the guided walk through the modality.
//   • any free-typed message → a REAL, context-aware model turn: POST the running
//     conversation + a description of what's on the canvas (+ marquee selection) to
//     the session chat endpoint and stream the reply. The canvas is left as-is.
// So chips drive the tour; typing gets a real answer about whatever's on screen.
//
// Under plain `npm run dev` the chat endpoint isn't served (Functions need
// `wrangler pages dev`); a free-typed turn then degrades to a friendly note.
export function useScriptedSessionDriver(script, opts = {}) {
  const { studentSlug, buildContext, enabled = true } = opts
  const turns = script.turns
  const totalRequired = useMemo(() => turns.reduce((a, t) => a + (t.tick || 0), 0), [turns])
  const storageKey = `session:state:${studentSlug || 'session'}`

  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [canvas, setCanvas] = useState(null)
  const [ticked, setTicked] = useState(0)
  const [focus, setFocus] = useState('')
  const [sending, setSending] = useState(false)

  const messagesRef = useRef([])
  messagesRef.current = messages
  const suggestionsRef = useRef([])
  suggestionsRef.current = suggestions
  const indexRef = useRef(-1)
  const startedRef = useRef(false)
  const sendingRef = useRef(false)
  const scriptDoneRef = useRef(false)
  const timerRef = useRef(null)

  // Restore a persisted session (survive refresh), else emit the opening turn.
  // `enabled:false` keeps the scripted driver dormant (the live engine is in
  // charge); it can still wake later if the live driver reports no pack.
  useEffect(() => {
    if (!enabled || startedRef.current) return
    startedRef.current = true
    let restored = false
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved && saved.v === 1 && Array.isArray(saved.messages) && saved.messages.length) {
        setMessages(saved.messages)
        setCanvas(saved.canvas || null)
        setSuggestions(saved.suggestions || [])
        setTicked(saved.ticked || 0)
        setFocus(saved.focus || '')
        indexRef.current = typeof saved.index === 'number' ? saved.index : 0
        scriptDoneRef.current = !!saved.scriptDone
        restored = true
      }
    } catch {
      /* corrupt snapshot — start fresh */
    }
    if (!restored) {
      const first = turns[0]
      indexRef.current = 0
      setMessages([{ role: 'assistant', content: first.assistant }])
      setSuggestions(first.chips || [])
      setCanvas(first.canvas || null)
      setTicked(first.tick || 0)
      setFocus(first.focus || '')
    }
    return () => clearTimeout(timerRef.current)
  }, [turns, storageKey, enabled])

  // Persist settled state so a refresh resumes the session (not for in-flight turns).
  useEffect(() => {
    if (!startedRef.current || sending) return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          v: 1,
          messages,
          canvas,
          suggestions,
          ticked,
          focus,
          index: indexRef.current,
          scriptDone: scriptDoneRef.current,
        }),
      )
    } catch {
      /* quota / serialization — non-fatal */
    }
  }, [messages, canvas, suggestions, ticked, focus, sending, storageKey])

  function appendToLast(chunk) {
    setMessages((m) => {
      if (!m.length) return m
      const nx = [...m]
      const last = nx[nx.length - 1]
      nx[nx.length - 1] = { ...last, content: (last.content || '') + chunk }
      return nx
    })
  }
  function setLastContent(text) {
    setMessages((m) => {
      if (!m.length) return m
      const nx = [...m]
      nx[nx.length - 1] = { role: 'assistant', content: text }
      return nx
    })
  }

  function scriptedAdvance(text) {
    const next = indexRef.current + 1
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setSuggestions([])
    setSending(true)
    sendingRef.current = true
    timerRef.current = setTimeout(() => {
      const turn = turns[next]
      indexRef.current = next
      setLastContent(turn.assistant)
      if (turn.canvas) setCanvas(turn.canvas)
      setTicked((v) => v + (turn.tick || 0))
      setFocus(turn.focus || '')
      const isLast = next >= turns.length - 1
      if (isLast) {
        scriptDoneRef.current = true
        setSuggestions([])
      } else {
        setSuggestions(turn.chips || [])
      }
      setSending(false)
      sendingRef.current = false
    }, 450)
  }

  async function liveTurn(text) {
    const outgoing = [...messagesRef.current, { role: 'user', content: text }]
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setSending(true)
    sendingRef.current = true
    const ctx = buildContext ? buildContext() : { canvasContext: '', selection: null }
    try {
      const res = await fetch(`/${studentSlug || 'session'}/api/session/message`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: outgoing,
          canvasContext: ctx.canvasContext,
          selection: ctx.selection,
        }),
      })
      if (!res.ok || !res.body) {
        setLastContent(
          res.status === 404
            ? "_(Live chat needs the backend — run `wrangler pages dev` (or `npm run preview`). Under plain `npm run dev` the chat endpoint isn't served, so chips still work but typed questions can't reach the model.)_"
            : '_(The chat hit an error — try again.)_',
        )
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let sep
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          const dl = raw.split('\n').find((l) => l.startsWith('data:'))
          if (!dl) continue
          let evt
          try {
            evt = JSON.parse(dl.slice(5).trim())
          } catch {
            continue
          }
          if (evt.type === 'delta') appendToLast(evt.text)
          else if (evt.type === 'error') appendToLast(`\n\n_(${evt.message})_`)
        }
      }
    } catch {
      setLastContent("_(Couldn't reach the chat endpoint.)_")
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  function send(text) {
    const t = (text ?? '').trim()
    if (!t || sendingRef.current) return
    const canAdvance = !scriptDoneRef.current && indexRef.current + 1 < turns.length
    if (canAdvance && suggestionsRef.current.includes(t)) scriptedAdvance(t)
    else liveTurn(t)
  }

  return {
    phase: 'active',
    messages,
    suggestions,
    canvas,
    progress: { ticked, totalRequired, focus },
    sending,
    send,
  }
}

// Real lesson-session driver (Step 4 of the build order). Same DriverState
// contract as the scripted driver, backed by the server-authoritative engine:
//   POST /<slug>/api/session/start    → create/resume (server owns state in R2)
//   POST /<slug>/api/session/message  → SSE turn: delta / canvas / done frames
//   POST /<slug>/api/session/artifact → learner-authored artifact sync (debounced)
// Extra returns beyond DriverState: dayTitle, error, restart(), syncArtifact().
// phase: 'loading' | 'active' | 'done' | 'nopack' (no session pack for this
// student — caller falls back to the scripted showcase) | 'error'.
export function useSSESessionDriver(opts = {}) {
  const { studentSlug, day = '1', buildContext, enabled = true } = opts

  const [phase, setPhase] = useState('loading')
  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [canvas, setCanvas] = useState(null)
  const [progress, setProgress] = useState({ ticked: 0, totalRequired: 0, focus: '' })
  const [sending, setSending] = useState(false)
  const [dayTitle, setDayTitle] = useState('')
  const [error, setError] = useState('')

  const seqRef = useRef(0)
  const sendingRef = useRef(false)
  const startedRef = useRef(false)
  // Debounced learner-artifact sync: pending contents + timers, flushed before
  // each turn so the model's envelope sees current gate state.
  const artifactPendingRef = useRef({})
  const artifactTimersRef = useRef({})

  function api(path, body) {
    return fetch(`/${studentSlug}/api/session/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  function applyStartPayload(data) {
    seqRef.current = data.seq ?? 0
    setMessages(data.messages || [])
    setSuggestions(data.suggestions || [])
    setCanvas(data.canvas || null)
    setDayTitle(data.dayTitle || '')
    setProgress({
      ticked: data.ticked || 0,
      totalRequired: data.totalRequired || 0,
      focus: data.focus || '',
    })
    setPhase(data.sessionDone ? 'done' : 'active')
  }

  async function bootstrap(reset = false) {
    setPhase('loading')
    setError('')
    try {
      const res = await api('start', { day, stream: true, ...(reset ? { reset: true } : {}) })
      const isSSE = (res.headers.get('content-type') || '').includes('text/event-stream')

      if (!isSSE) {
        // Resume (or error) — plain JSON.
        const data = await res.json().catch(() => null)
        if (res.status === 404 && (data?.error || '').includes('No session configured')) {
          setPhase('nopack')
          return
        }
        if (!res.ok || !data) {
          setError(data?.error || `Couldn't start the session (${res.status}).`)
          setPhase('error')
          return
        }
        applyStartPayload(data)
        return
      }

      // Fresh start — the opener STREAMS like any other turn (#3).
      setPhase('active')
      setMessages([{ role: 'assistant', content: '' }])
      setSending(true)
      sendingRef.current = true
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let sep
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          const dl = raw.split('\n').find((l) => l.startsWith('data:'))
          if (!dl) continue
          let evt
          try {
            evt = JSON.parse(dl.slice(5).trim())
          } catch {
            continue
          }
          if (evt.type === 'delta') appendToLast(evt.text)
          else if (evt.type === 'canvas') setCanvas(evt.directive)
          else if (evt.type === 'done') applyStartPayload(evt)
          else if (evt.type === 'error') {
            setError(evt.message)
            setPhase('error')
          }
        }
      }
    } catch {
      setError("Couldn't reach the session backend — is `wrangler pages dev` running?")
      setPhase('error')
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  useEffect(() => {
    if (!enabled || startedRef.current) return
    startedRef.current = true
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  function appendToLast(chunk) {
    setMessages((m) => {
      if (!m.length) return m
      const nx = [...m]
      const last = nx[nx.length - 1]
      nx[nx.length - 1] = { ...last, content: (last.content || '') + chunk }
      return nx
    })
  }
  function setLastContent(text) {
    setMessages((m) => {
      if (!m.length) return m
      const nx = [...m]
      nx[nx.length - 1] = { role: 'assistant', content: text }
      return nx
    })
  }

  // Learner-authored artifact content → server session (grammar contract §2:
  // this client path is the ONLY writer into session.artifacts).
  function syncArtifact(id, content) {
    artifactPendingRef.current[id] = content
    clearTimeout(artifactTimersRef.current[id])
    artifactTimersRef.current[id] = setTimeout(() => flushArtifact(id), 800)
  }
  async function flushArtifact(id, force = false) {
    // F1: never flush mid-turn — the server holds the session in memory during a
    // stream and a mid-turn write would be clobbered at settle. Re-arm instead;
    // everything pending flushes right before the next turn and after settle.
    if (sendingRef.current && !force) {
      clearTimeout(artifactTimersRef.current[id])
      artifactTimersRef.current[id] = setTimeout(() => flushArtifact(id), 800)
      return
    }
    const content = artifactPendingRef.current[id]
    if (content === undefined) return
    delete artifactPendingRef.current[id]
    clearTimeout(artifactTimersRef.current[id])
    try {
      await api('artifact', { id, content, day })
    } catch {
      artifactPendingRef.current[id] = content // transient — retry on next flush
    }
  }
  async function flushAllArtifacts(force = false) {
    const ids = Object.keys(artifactPendingRef.current)
    await Promise.all(ids.map((id) => flushArtifact(id, force)))
  }
  // Is this artifact pane dirty (unsynced local edits)?
  function isArtifactDirty(id) {
    return artifactPendingRef.current[id] !== undefined
  }

  async function send(text) {
    const t = (text ?? '').trim()
    if (!t || sendingRef.current || phase !== 'active') return
    setMessages((m) => [...m, { role: 'user', content: t }, { role: 'assistant', content: '' }])
    setSuggestions([])
    try {
      // Flush artifact edits BEFORE the turn starts so the model's envelope and
      // gates see current content (and before sendingRef blocks flushes).
      await flushAllArtifacts(true)
      setSending(true)
      sendingRef.current = true
      const ctx = buildContext ? buildContext() : { canvasContext: '', selection: null }
      const res = await api('message', {
        message: t,
        seq: seqRef.current,
        day,
        canvasLiveState: ctx.canvasContext,
        selection: ctx.selection,
      })
      if (res.status === 409) {
        // Stale seq (second tab / replay) or completed — resync from the server.
        setLastContent('_(Out of sync — reloading the session…)_')
        await bootstrap()
        return
      }
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        setLastContent(`_(${data?.error || 'The turn failed — try again.'})_`)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let sep
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          const dl = raw.split('\n').find((l) => l.startsWith('data:'))
          if (!dl) continue
          let evt
          try {
            evt = JSON.parse(dl.slice(5).trim())
          } catch {
            continue
          }
          if (evt.type === 'delta') appendToLast(evt.text)
          else if (evt.type === 'canvas') setCanvas(evt.directive)
          else if (evt.type === 'artifactPending') {
            // Director is drafting into this artifact — show it, if mounted.
            setCanvas((c) =>
              c && c.id === `artifact:${evt.id}`
                ? { ...c, payload: { ...c.payload, drafting: true } }
                : c
            )
          } else if (evt.type === 'artifact') {
            // Director wrote content. LEARNER WINS: if the pane has unsynced
            // local edits, keep them (server adopts the learner's version at the
            // next flush; the draft survives in the transcript for review).
            setCanvas((c) => {
              if (!c || c.id !== `artifact:${evt.id}`) return c
              if (isArtifactDirty(evt.id)) return { ...c, payload: { ...c.payload, drafting: false } }
              return { ...c, payload: { ...c.payload, content: evt.content, drafting: false } }
            })
          } else if (evt.type === 'done') {
            setLastContent(evt.message) // authoritative clean text
            setSuggestions(evt.suggestions || [])
            seqRef.current = evt.seq ?? seqRef.current + 1
            setProgress({
              ticked: evt.ticked || 0,
              totalRequired: evt.totalRequired || 0,
              focus: evt.focus || '',
            })
            if (evt.sessionDone) setPhase('done')
          } else if (evt.type === 'error') {
            appendToLast(`\n\n_(${evt.message})_`)
          }
        }
      }
    } catch {
      setLastContent("_(Couldn't reach the session backend.)_")
    } finally {
      setSending(false)
      sendingRef.current = false
      flushAllArtifacts() // anything edited mid-turn lands now (learner wins server-side)
    }
  }

  function restart() {
    setMessages([])
    setSuggestions([])
    setCanvas(null)
    bootstrap(true)
  }

  return {
    phase,
    messages,
    suggestions,
    canvas,
    progress,
    sending,
    send,
    dayTitle,
    error,
    restart,
    syncArtifact,
  }
}
