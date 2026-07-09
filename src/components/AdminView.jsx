import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Admin console (read-first): roster of every learner → per-day progress + full
// transcripts, and an "ask AI about this learner" box. Server endpoints self-gate on the
// verified Access identity (functions/api/admin/*), so a non-admin gets 403 here.

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

function Transcript({ turns }) {
  const [open, setOpen] = useState(false)
  if (!turns?.length) return <p className="text-[12px] text-muted italic">No transcript.</p>
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] font-medium text-accent hover:underline"
      >
        {open ? 'Hide' : 'Show'} transcript ({turns.length} turns)
      </button>
      {open && (
        <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-rule bg-white p-3 flex flex-col gap-2">
          {turns.map((t, i) => (
            <div key={i} className="text-[12px] leading-snug">
              <span
                className={`font-mono text-[10px] uppercase tracking-wide ${
                  t.role === 'user' ? 'text-accent' : t.role === 'assistant' ? 'text-muted' : 'text-amber-600'
                }`}
              >
                {t.role === 'user' ? 'learner' : t.role === 'assistant' ? 'director' : t.role}
              </span>
              <div className="whitespace-pre-wrap text-ink">{t.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LearnerDetail({ slug }) {
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    setDetail(null)
    setErr('')
    setAnswer('')
    getJSON(`/api/admin/learner/${slug}`)
      .then(setDetail)
      .catch((e) => setErr(e.message))
  }, [slug])

  async function ask() {
    const q = question.trim()
    if (!q) return
    setAsking(true)
    setAnswer('')
    try {
      const res = await fetch('/api/admin/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, question: q }),
      })
      const data = await res.json()
      setAnswer(res.ok ? data.answer : `Error: ${data.error || res.status}`)
    } catch (e) {
      setAnswer(`Error: ${e.message}`)
    } finally {
      setAsking(false)
    }
  }

  if (err) return <p className="text-[13px] text-red-600">Failed to load: {err}</p>
  if (!detail) return <p className="text-[13px] text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">{detail.name}</h2>
        <p className="font-mono text-[12px] text-muted">
          /{detail.slug} · {detail.courseTitle || detail.courseSlug}
          {detail.email ? ` · ${detail.email}` : ''}
          {detail.workshopUser ? ` · vm:${detail.workshopUser}` : ''}
        </p>
      </div>

      {/* Ask AI */}
      <div className="rounded-lg border border-rule bg-accent-soft/40 p-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          Ask AI about {detail.name}
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="e.g. is he stuck? summarize his Day-2 build"
            className="flex-1 rounded-md border border-rule bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
          />
          <button
            onClick={ask}
            disabled={asking}
            className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {asking ? '…' : 'Ask'}
          </button>
        </div>
        {answer && (
          <div className="mt-2 whitespace-pre-wrap rounded-md border border-rule bg-white p-3 text-[13px] leading-snug text-ink">
            {answer}
          </div>
        )}
      </div>

      {/* Days */}
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
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  complete
                </span>
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
            <Transcript turns={d.transcript} />
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

  useEffect(() => {
    getJSON('/api/admin/learners')
      .then((d) => setLearners(d.learners))
      .catch((e) => setErr(e.message))
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
        {/* Roster */}
        <aside className="md:w-72 shrink-0">
          {err && err !== '403' && <p className="text-[13px] text-red-600">Error: {err}</p>}
          {!learners && !err && <p className="text-[13px] text-muted">Loading roster…</p>}
          <ul className="flex flex-col gap-1.5">
            {learners?.map((l) => (
              <li key={l.slug}>
                <button
                  onClick={() => setSelected(l.slug)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selected === l.slug
                      ? 'border-accent bg-accent-soft'
                      : 'border-rule bg-white hover:border-accent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{l.name}</span>
                    <span className="font-mono text-[10px] text-muted">/{l.slug}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    <span>{l.courseTitle || l.courseSlug || '—'}</span>
                    {l.fromRegistry && (
                      <span className="rounded bg-accent-soft px-1 text-[9px] uppercase text-accent">registry</span>
                    )}
                    {l.status && l.status !== 'active' && (
                      <span className="rounded bg-amber-100 px-1 text-[9px] uppercase text-amber-700">{l.status}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Detail */}
        <main className="min-w-0 flex-1">
          {selected ? (
            <LearnerDetail slug={selected} />
          ) : (
            <p className="text-[13px] text-muted">Select a learner to see progress and transcripts.</p>
          )}
        </main>
      </div>
    </div>
  )
}
