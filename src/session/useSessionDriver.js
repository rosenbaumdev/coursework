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
  const { studentSlug, buildContext } = opts
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
  useEffect(() => {
    if (startedRef.current) return
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
  }, [turns, storageKey])

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
