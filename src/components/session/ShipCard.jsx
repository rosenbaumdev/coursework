import { useState } from 'react'
import { copyText } from '../chat/chatMarkdown.jsx'

// Mandatory ship gate (#9) for requiresShip days: the learner ships their built game to
// a permanent, public URL and signs off before the session can end. No skip — the whole
// day's payoff is a delivered thing a friend can actually open. Two steps: Ship (snapshot
// → public link) then Finish (sign off → session completes).
export default function ShipCard({ studentSlug, day, onDone, onClose }) {
  const [stage, setStage] = useState('intro') // intro | shipping | shipped | finishing
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  async function post(path) {
    const res = await fetch(`/${studentSlug}/api/session/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ day }),
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, data }
  }

  async function ship() {
    setErr('')
    setStage('shipping')
    try {
      const { ok, data } = await post('ship')
      if (!ok || !data?.url) {
        setErr(data?.error || 'Ship failed — is your game running in the viewer?')
        setStage('intro')
        return
      }
      setUrl(data.url)
      setStage('shipped')
    } catch {
      setErr('Network hiccup — try again.')
      setStage('intro')
    }
  }

  async function finish() {
    setErr('')
    setStage('finishing')
    try {
      const { ok, data } = await post('signoff')
      if (!ok || !data?.sessionDone) {
        setErr(data?.error || 'Could not finish — try again.')
        setStage('shipped')
        return
      }
      onDone(data.url || url)
    } catch {
      setErr('Network hiccup — try again.')
      setStage('shipped')
    }
  }

  async function copy() {
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }
  }

  const shipped = stage === 'shipped' || stage === 'finishing'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-rule bg-white p-6 shadow-card session-fade">
        {/* Duck back to the workshop (e.g. to get the app running) — the session still
            can't finish until sign-off, so a persistent banner re-opens this. */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Back to my workshop"
            title="Back to my workshop"
            className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-inset hover:text-ink"
          >
            ✕
          </button>
        )}
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted mb-1">Ship it</p>
        <h2 className="text-lg font-semibold text-ink mb-2">You built a real thing. Now put it in the world.</h2>

        {!shipped ? (
          <>
            <p className="text-sm text-muted mb-4">
              Shipping saves a permanent copy of your game and gives you a link anyone can
              play — no login, works on any phone. This is how you finish today.
            </p>
            {err && <p className="text-sm text-[#b42318] mb-3">{err}</p>}
            <button
              onClick={ship}
              disabled={stage === 'shipping'}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-white font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {stage === 'shipping' ? 'Shipping…' : 'Ship my game →'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">It’s live. Send this to a friend:</p>
            <div className="flex items-center gap-2 mb-3">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 rounded-lg border border-rule bg-inset px-3 py-2 font-mono text-[12px] text-ink"
              />
              <button
                onClick={copy}
                className="shrink-0 rounded-lg border border-rule px-3 py-2 text-sm hover:text-accent"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm text-accent underline underline-offset-2 mb-4"
            >
              Open your game in a new tab ↗
            </a>
            {err && <p className="text-sm text-[#b42318] mb-3">{err}</p>}
            <button
              onClick={finish}
              disabled={stage === 'finishing'}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-white font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {stage === 'finishing' ? 'Finishing…' : 'I’m happy with it — finish today'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
