import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Splash from './Splash.jsx'
import ProgressHeader from './chat/ProgressHeader.jsx'
import ChatMessages from './chat/ChatMessages.jsx'
import ChatInput from './chat/ChatInput.jsx'
import { useStudent } from '../hooks/useStudent.js'

export default function InterviewView() {
  const { studentSlug } = useParams()
  const { student, loading: studentLoading } = useStudent(studentSlug)
  const course = student?.courses[0]

  const [messages, setMessages] = useState([])
  const [ticked, setTicked] = useState(0)
  const [totalRequired, setTotalRequired] = useState(0)
  const [focus, setFocus] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [phase, setPhase] = useState('loading') // loading | active | done | already | error
  const [errorMsg, setErrorMsg] = useState('')
  const [sending, setSending] = useState(false)

  const startedRef = useRef(false)

  useEffect(() => {
    document.title = `${student?.name ?? 'Student'} — Interview`
  }, [student])

  useEffect(() => {
    if (!student || startedRef.current) return
    startedRef.current = true
    ;(async () => {
      try {
        const res = await fetch(`/${studentSlug}/api/interview/start`, { method: 'POST' })
        const data = await res.json()
        if (res.status === 409 && data.completed) {
          setPhase('already')
          return
        }
        if (!res.ok) {
          setErrorMsg(data.error || 'Could not start the interview.')
          setPhase('error')
          return
        }
        setMessages(data.messages || [])
        setTicked(data.ticked || 0)
        setTotalRequired(data.totalRequired || 0)
        setFocus(data.focus || '')
        setSuggestions(data.suggestions || [])
        setPhase('active')
      } catch {
        setErrorMsg('Network error reaching the interview. Try refreshing.')
        setPhase('error')
      }
    })()
  }, [student, studentSlug])

  async function send(textArg) {
    const text = (textArg ?? '').trim()
    if (!text || sending || phase !== 'active') return
        setSuggestions([])
    // Add the student turn + an empty assistant bubble the stream fills in.
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setSending(true)

    try {
      const res = await fetch(`/${studentSlug}/api/interview/message`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok || !res.body) {
        appendToLast('Something went wrong on my end — send that again.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let doneData = null

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let sep
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const rawFrame = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          const dataLine = rawFrame.split('\n').find((l) => l.startsWith('data:'))
          if (!dataLine) continue
          let evt
          try {
            evt = JSON.parse(dataLine.slice(5).trim())
          } catch {
            continue
          }
          if (evt.type === 'delta') {
            appendToLast(evt.text)
          } else if (evt.type === 'error') {
            appendToLast('\n\n_(hiccup — send that again.)_')
          } else if (evt.type === 'done') {
            doneData = evt
          }
        }
      }

      if (doneData) {
        // Reconcile the final bubble with the server's authoritative clean text.
        setMessages((m) => {
          const next = [...m]
          if (next.length) next[next.length - 1] = { role: 'assistant', content: doneData.message }
          return next
        })
        setTicked(doneData.ticked || 0)
        setTotalRequired(doneData.totalRequired || 0)
        setFocus(doneData.focus || '')
        setSuggestions(doneData.suggestions || [])
        if (doneData.interviewDone) setTimeout(() => setPhase('done'), 2200)
      }
    } catch {
      appendToLast('\n\n_(network hiccup — send that again.)_')
    } finally {
      setSending(false)
    }
  }

  function appendToLast(chunk) {
    setMessages((m) => {
      if (!m.length) return m
      const next = [...m]
      const last = next[next.length - 1]
      next[next.length - 1] = { ...last, content: (last.content || '') + chunk }
      return next
    })
  }

  if (studentLoading) return null // resolving a registry learner from the server
  if (!student || !course) return <Splash />

  if (phase === 'already') {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <ProgressHeader courseTitle={course.title} />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <h2 className="text-xl font-semibold text-ink mb-3">You already did this.</h2>
          <p className="text-muted leading-relaxed">
            Your interview is complete and your profile is in. The next step is your real
            Day 1 — your coursemaster will take it from here.
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <ProgressHeader courseTitle={course.title} />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <h2 className="text-xl font-semibold text-ink mb-3">That's everything.</h2>
          <p className="text-muted leading-relaxed">
            Your profile is being put together now. This shapes your actual six-week plan —
            not a template, the real thing, built from what you just told me. Talk soon.
          </p>
        </div>
      </div>
    )
  }

  const streamingLastEmpty =
    sending && messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  const notice =
    phase === 'loading' ? (
      <p className="font-mono text-sm text-muted">Starting up…</p>
    ) : phase === 'error' ? (
      <p className="font-mono text-sm text-red-600">{errorMsg}</p>
    ) : null

  return (
    <div className="flex flex-col h-[100dvh] bg-paper overflow-x-hidden">
      <ProgressHeader
        courseTitle={course.title}
        ticked={ticked}
        totalRequired={totalRequired}
        focus={focus}
      />

      <ChatMessages
        messages={messages}
        streamingLastEmpty={streamingLastEmpty}
        notice={notice}
      />

      {phase === 'active' && (
        <ChatInput
          suggestions={suggestions}
          onSend={(text) => send(text)}
          disabled={sending}
        />
      )}
    </div>
  )
}
