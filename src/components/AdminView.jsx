import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Bubble from './chat/Bubble.jsx'

// Admin console (read-first): roster → per-day progress + full transcripts (rendered with
// the SAME chat bubbles + markdown as the product), a multi-turn "ask AI about this learner"
// chat, and basic learner maintenance (edit name/email). Endpoints self-gate on the verified
// Access identity (functions/api/admin/*), so a non-admin gets 403.

async function getJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (res.status === 403) throw new Error('403')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function ProgressBar({ ticked, total }) {
  const pct = total ? Math.round((ticked / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-rule overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-muted">{ticked}/{total}</span>
    </div>
  )
}

// A day's transcript, rendered as the product's own chat stream (markdown bubbles).
function TranscriptStream({ turns }) {
  const [open, setOpen] = useState(false)
  if (!turns?.length) return <p className="text-[12px] text-muted italic">No transcript.</p>
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="text-[12px] font-medium text-accent hover:underline">
        {open ? 'Hide' : 'Show'} transcript ({turns.length} turns)
      </button>
      {open && (
        <div className="mt-2 max-h-[28rem] overflow-y-auto rounded-md border border-rule bg-paper px-3 py-3 flex flex-col gap-3">
          {turns.map((t, i) => (
            <Bubble key={i} role={t.role} text={t.content} />
          ))}
        </div>
      )}
    </div>
  )
}

// Multi-turn "ask AI about this learner" — reuses the product's chat bubbles + markdown.
function AskChat({ slug, name }) {
  const [messages, setMessages] = useState([]) // {role:'user'|'assistant', content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Reset when switching learners.
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [slug])

  async function send() {
    const q = input.trim()
    if (!q || busy) return
    const next = [...messages, { role: 'user', content: q }]
    setMessages([...next, { role: 'assistant', content: '' }]) // empty assistant → thinking dots
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, messages: next }),
      })
      const data = await res.json()
      const answer = res.ok ? data.answer : `Error: ${data.error || res.status}`
      setMessages([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-rule bg-white">
      <div className="border-b border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Ask AI about {name}
      </div>
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-[24rem] overflow-y-auto px-3 py-3 flex flex-col gap-3">
          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              text={m.content}
              streaming={busy && m.role === 'assistant' && !m.content && i === messages.length - 1}
            />
          ))}
        </div>
      )}
      <div className="flex gap-2 border-t border-rule p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={messages.length ? 'Ask a follow-up…' : 'e.g. is he stuck? summarize his Day-2 build'}
          className="flex-1 rounded-md border border-rule bg-white px-3 py-1.5 text-[14px] text-ink outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-md bg-accent px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {busy ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}

function EditLearner({ detail, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(detail.name || '')
  const [email, setEmail] = useState(detail.email || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(`/api/admin/learner/${detail.slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || res.status)
      }
      setEditing(false)
      onSaved()
    } catch (e) {
      setErr(String(e.message))
    } finally {
      setSaving(false)
    }
  }

  if (!editing)
    return (
      <button onClick={() => setEditing(true)} className="text-[12px] text-accent hover:underline">
        Edit
      </button>
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent" />
      <button onClick={save} disabled={saving} className="rounded bg-accent px-2 py-1 text-[12px] text-white disabled:opacity-50">
        {saving ? '…' : 'Save'}
      </button>
      <button onClick={() => setEditing(false)} className="text-[12px] text-muted hover:text-ink">Cancel</button>
      {err && <span className="text-[12px] text-red-600">{err}</span>}
    </div>
  )
}

function LearnerDetail({ slug, onEdited }) {
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState('')

  function load() {
    return getJSON(`/api/admin/learner/${slug}`).then(setDetail).catch((e) => setErr(e.message))
  }
  useEffect(() => {
    setDetail(null)
    setErr('')
    load()
  }, [slug])

  if (err) return <p className="text-[13px] text-red-600">Failed to load: {err}</p>
  if (!detail) return <p className="text-[13px] text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-ink">{detail.name}</h2>
          <EditLearner
            detail={detail}
            onSaved={() => {
              load()
              onEdited?.()
            }}
          />
        </div>
        <p className="font-mono text-[12px] text-muted">
          /{detail.slug} · {detail.courseTitle || detail.courseSlug}
          {detail.email ? ` · ${detail.email}` : ''}
          {detail.workshopUser ? ` · vm:${detail.workshopUser}` : ''}
          {detail.status && detail.status !== 'active' ? ` · ${detail.status}` : ''}
        </p>
      </div>

      <AskChat slug={detail.slug} name={detail.name} />

      {detail.days.length === 0 && <p className="text-[13px] text-muted">No session data yet.</p>}
      {detail.days.map((d) => (
        <div key={d.dayId} className="rounded-lg border border-rule bg-paper p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink">
              Day {d.dayId} — {d.dayTitle}
            </span>
            <div className="flex items-center gap-3">
              <ProgressBar ticked={d.ticked} total={d.totalRequired} />
              {d.completed && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">complete</span>
              )}
            </div>
          </div>
          {d.focus && <p className="mt-1 text-[12px] text-muted">Focus: {d.focus}</p>}
          {d.situation && (
            <p className="mt-1 text-[12px] text-muted">
              <span className="font-mono uppercase text-[10px] tracking-wide">terminal</span> {d.situation}
            </p>
          )}
          {d.parkingLot?.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-[12px] text-ink">
              {d.parkingLot.map((p, i) => (
                <li key={i}>{p.note || JSON.stringify(p)}</li>
              ))}
            </ul>
          )}
          <div className="mt-2">
            <TranscriptStream turns={d.transcript} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminView() {
  const [learners, setLearners] = useState(null)
  const [selected, setSelected] = useState(null)
  const [err, setErr] = useState('')

  function loadRoster() {
    return getJSON('/api/admin/learners')
      .then((d) => setLearners(d.learners))
      .catch((e) => setErr(e.message))
  }
  useEffect(() => {
    loadRoster()
  }, [])

  if (err === '403')
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-semibold text-ink">Admin only</h1>
        <p className="mt-2 text-[13px] text-muted">This page is for course admins.</p>
        <Link to="/" className="mt-4 inline-block text-[13px] text-accent hover:underline">← Home</Link>
      </div>
    )

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-rule bg-white px-5 py-3">
        <h1 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-ink">Admin · Learners</h1>
        <Link to="/" className="text-[12px] text-muted hover:text-ink">Home</Link>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-5 md:flex-row">
        <aside className="md:w-72 shrink-0">
          {err && err !== '403' && <p className="text-[13px] text-red-600">Error: {err}</p>}
          {!learners && !err && <p className="text-[13px] text-muted">Loading roster…</p>}
          <ul className="flex flex-col gap-1.5">
            {learners?.map((l) => (
              <li key={l.slug}>
                <button
                  onClick={() => setSelected(l.slug)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selected === l.slug ? 'border-accent bg-accent-soft' : 'border-rule bg-white hover:border-accent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{l.name}</span>
                    <span className="font-mono text-[10px] text-muted">/{l.slug}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    <span>{l.courseTitle || l.courseSlug || '—'}</span>
                    {l.fromRegistry && <span className="rounded bg-accent-soft px-1 text-[9px] uppercase text-accent">registry</span>}
                    {l.status && l.status !== 'active' && (
                      <span className="rounded bg-amber-100 px-1 text-[9px] uppercase text-amber-700">{l.status}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 flex-1">
          {selected ? (
            <LearnerDetail slug={selected} onEdited={loadRoster} />
          ) : (
            <p className="text-[13px] text-muted">Select a learner to see progress and transcripts.</p>
          )}
        </main>
      </div>
    </div>
  )
}
