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
  const [nickname, setNickname] = useState(detail.nickname || '')
  const [pronouns, setPronouns] = useState(detail.pronouns || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const res = await fetch(`/api/admin/learner/${detail.slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // nickname/pronouns sent always (empty string clears the override server-side).
        body: JSON.stringify({ name, email, nickname, pronouns }),
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
      <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="nickname (optional)" title="What the course calls them — defaults to their name" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent" />
      <select value={pronouns} onChange={(e) => setPronouns(e.target.value)} title="Defaults to neutral they/them" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent">
        <option value="">they (default)</option>
        <option value="she">she/her</option>
        <option value="he">he/him</option>
        <option value="they">they/them</option>
      </select>
      <button onClick={save} disabled={saving} className="rounded bg-accent px-2 py-1 text-[12px] text-white disabled:opacity-50">
        {saving ? '…' : 'Save'}
      </button>
      <button onClick={() => setEditing(false)} className="text-[12px] text-muted hover:text-ink">Cancel</button>
      {err && <span className="text-[12px] text-red-600">{err}</span>}
    </div>
  )
}

// Fully remove a registry learner (wipes VM account + registry entry + access grant).
// Only offered for registry learners; code seeds are permanent.
function DeleteLearner({ detail, onDeleted }) {
  const [busy, setBusy] = useState(false)
  if (!detail.fromRegistry) return null
  async function del() {
    if (!confirm(`Delete ${detail.name} (/${detail.slug})? This wipes their VM account, registry entry, and access grant. Cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/learner/${detail.slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(`Error: ${d.error || res.status}`)
        return
      }
      onDeleted?.()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button onClick={del} disabled={busy} className="text-[12px] text-red-600 hover:underline disabled:opacity-50">
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  )
}

const BTN = 'rounded-md border border-rule px-2.5 py-1 text-[12px] font-medium text-ink hover:border-accent disabled:opacity-50'

function StatusPill({ status }) {
  const s = status || 'active'
  const cls =
    s === 'active' ? 'bg-green-100 text-green-700'
    : s === 'suspended' ? 'bg-amber-100 text-amber-700'
    : s === 'provisioning' ? 'bg-blue-100 text-blue-700'
    : s === 'error' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{s}</span>
}

// VM provisioning status + suspend/resume/deprovision (enqueues for the droplet daemon).
function ProvisionControls({ detail, onChanged }) {
  const [busy, setBusy] = useState('')
  const p = detail.provision || {}
  const st = detail.status || 'active'
  async function act(action) {
    if (action === 'deprovision' && !confirm(`Deprovision ${detail.name}? This removes their VM account (data can be wiped separately).`)) return
    setBusy(action)
    try {
      const res = await fetch(`/api/admin/learner/${detail.slug}/provision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(`Error: ${d.error || res.status}`)
      }
      onChanged?.()
    } finally {
      setBusy('')
    }
  }
  const errored = p.status?.state === 'error'
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-rule bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">VM</span>
        <span className="text-[12px] text-ink">{detail.workshopUser ? `user: ${detail.workshopUser}` : 'no VM user'}</span>
        <StatusPill status={st} />
        {p.queued && <span className="text-[11px] text-muted">⏳ action queued — waiting on the daemon…</span>}
        {p.status?.state && !errored && <span className="text-[11px] text-muted">daemon: {p.status.state}</span>}
        <div className="ml-auto flex gap-2">
          {errored && (
            <button className={BTN} disabled={!!busy} onClick={() => act('create')}>
              {busy === 'create' ? 'Retrying…' : 'Retry provisioning'}
            </button>
          )}
          {st === 'suspended' ? (
            <button className={BTN} disabled={!!busy} onClick={() => act('resume')}>Resume</button>
          ) : (
            <button className={BTN} disabled={!!busy} onClick={() => act('suspend')}>Suspend</button>
          )}
          <button className={`${BTN} !text-red-600 hover:!border-red-400`} disabled={!!busy} onClick={() => act('deprovision')}>
            Deprovision
          </button>
        </div>
      </div>
      {errored && (
        <p className="rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700">
          Provisioning failed{p.status.detail ? `: ${p.status.detail}` : ''}
        </p>
      )}
      {!p.queued && !p.status && st === 'provisioning' && (
        <p className="text-[11px] text-muted">
          Requested, but no daemon result yet — the droplet provisioning daemon may not be running.
        </p>
      )}
    </div>
  )
}

const autoSlug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)

// Invite/create a learner → registry entry + access grant + enqueue VM provisioning.
function InviteForm({ courses, onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [courseSlug, setCourseSlug] = useState(courses[0]?.courseSlug || '')
  const [vmUser, setVmUser] = useState('')
  const [dev, setDev] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  async function submit() {
    setBusy(true)
    setErr('')
    setResult(null)
    try {
      const course = courses.find((c) => c.courseSlug === courseSlug)
      const res = await fetch('/api/admin/learners', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, slug, email, nickname, pronouns, courseSlug, courseTitle: course?.courseTitle, vmUser: vmUser || slug, dev }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || res.status)
      setResult(d)
      onCreated?.()
      setName(''); setSlug(''); setSlugTouched(false); setEmail(''); setNickname(''); setPronouns(''); setVmUser(''); setDev(false)
    } catch (e) {
      setErr(String(e.message))
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mb-3 w-full rounded-lg border border-dashed border-rule bg-white px-3 py-2 text-[13px] font-medium text-accent hover:border-accent">
        + Invite learner
      </button>
    )
  return (
    <div className="mb-3 rounded-lg border border-rule bg-white p-3">
      <div className="flex flex-col gap-2">
        <input value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(autoSlug(e.target.value)) }} placeholder="Name" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent" />
        <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} placeholder="slug (url)" className="rounded border border-rule px-2 py-1 font-mono text-[13px] outline-none focus:border-accent" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email (for access grant)" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent" />
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="nickname (optional — what the course calls them)" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent" />
        <select value={pronouns} onChange={(e) => setPronouns(e.target.value)} title="Defaults to neutral they/them" className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent">
          <option value="">pronouns: they/them (default)</option>
          <option value="she">she/her</option>
          <option value="he">he/him</option>
          <option value="they">they/them</option>
        </select>
        <select value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} className="rounded border border-rule px-2 py-1 text-[13px] outline-none focus:border-accent">
          {courses.map((c) => (
            <option key={c.courseSlug} value={c.courseSlug}>{c.courseTitle || c.courseSlug}</option>
          ))}
        </select>
        <input value={vmUser} onChange={(e) => setVmUser(e.target.value)} placeholder={`vm user (default: ${slug || 'slug'})`} className="rounded border border-rule px-2 py-1 font-mono text-[13px] outline-none focus:border-accent" />
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} />
          Dev user <span className="text-[11px] text-muted">(throwaway — grouped separately, one-click delete)</span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={submit} disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">
            {busy ? 'Inviting…' : 'Invite'}
          </button>
          <button onClick={() => setOpen(false)} className="text-[12px] text-muted hover:text-ink">Cancel</button>
          {err && <span className="text-[12px] text-red-600">{err}</span>}
        </div>
        {result && (
          <div className="rounded-md bg-accent-soft p-2 text-[12px] text-ink">
            Created <span className="font-mono">/{result.slug}</span> (vm:{result.vmUser}, provisioning). Invite link:{' '}
            <a href={result.inviteUrl} className="font-mono text-accent underline">{result.inviteUrl}</a>
          </div>
        )}
      </div>
    </div>
  )
}

function LearnerDetail({ slug, onEdited, onDeleted }) {
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
          {detail.dev && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-purple-700">dev</span>}
          <EditLearner
            detail={detail}
            onSaved={() => {
              load()
              onEdited?.()
            }}
          />
          <DeleteLearner detail={detail} onDeleted={onDeleted} />
        </div>
        <p className="font-mono text-[12px] text-muted">
          /{detail.slug} · {detail.courseTitle || detail.courseSlug}
          {detail.email ? ` · ${detail.email}` : ''}
          {detail.workshopUser ? ` · vm:${detail.workshopUser}` : ''}
          {detail.status && detail.status !== 'active' ? ` · ${detail.status}` : ''}
        </p>
      </div>

      <ProvisionControls
        detail={detail}
        onChanged={() => {
          load()
          onEdited?.()
        }}
      />

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

function RosterRow({ l, selected, onSelect }) {
  return (
    <li>
      <button
        onClick={() => onSelect(l.slug)}
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
          {l.dev && <span className="rounded bg-purple-100 px-1 text-[9px] uppercase text-purple-700">dev</span>}
          {!l.dev && l.fromRegistry && <span className="rounded bg-accent-soft px-1 text-[9px] uppercase text-accent">registry</span>}
          {l.status && l.status !== 'active' && (
            <span className="rounded bg-amber-100 px-1 text-[9px] uppercase text-amber-700">{l.status}</span>
          )}
        </div>
      </button>
    </li>
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
          {learners && (
            <InviteForm
              courses={[
                ...new Map(
                  learners.filter((l) => l.courseSlug).map((l) => [l.courseSlug, { courseSlug: l.courseSlug, courseTitle: l.courseTitle }]),
                ).values(),
              ]}
              onCreated={loadRoster}
            />
          )}
          {learners && (
            <>
              <ul className="flex flex-col gap-1.5">
                {learners.filter((l) => !l.dev).map((l) => (
                  <RosterRow key={l.slug} l={l} selected={selected} onSelect={setSelected} />
                ))}
              </ul>
              {learners.some((l) => l.dev) && (
                <>
                  <div className="mt-4 mb-1.5 flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Dev users
                    <span className="text-purple-400">·</span>
                    <span className="text-[10px] normal-case tracking-normal">throwaway</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {learners.filter((l) => l.dev).map((l) => (
                      <RosterRow key={l.slug} l={l} selected={selected} onSelect={setSelected} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </aside>

        <main className="min-w-0 flex-1">
          {selected ? (
            <LearnerDetail
              slug={selected}
              onEdited={loadRoster}
              onDeleted={() => {
                setSelected(null)
                loadRoster()
              }}
            />
          ) : (
            <p className="text-[13px] text-muted">Select a learner to see progress and transcripts.</p>
          )}
        </main>
      </div>
    </div>
  )
}
