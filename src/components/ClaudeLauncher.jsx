import { useState } from 'react'
import { STUDENT_NAME, COURSE_TITLE } from '../courseConfig.js'

function buildPointerPrompt({ day, fetchUrl }) {
  return `You are leading Day ${day.id} of ${STUDENT_NAME}'s ${COURSE_TITLE}: "${day.title}".

Fetch the full instructor briefing at ${fetchUrl} and follow it precisely. Address ${STUDENT_NAME} directly.

Brief context: ${day.description}`
}

function absoluteLocalUrl(relativeUrl) {
  if (relativeUrl.startsWith('http')) return relativeUrl
  return `${window.location.origin}${relativeUrl}`
}

function MirrorBadge({ mirror }) {
  if (!mirror) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        local only
      </span>
    )
  }
  if (mirror.status === 'synced') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-700">
        ✓ mirrored to github
      </span>
    )
  }
  if (mirror.status === 'pending') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-amber-700">
        ⏳ sync pending
      </span>
    )
  }
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-[0.1em] text-red-600"
      title={mirror.error || ''}
    >
      ✗ sync failed
    </span>
  )
}

function openInClaude(prompt) {
  const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`
  window.open(url, '_blank', 'noopener')
}

async function copyFullPrompt(fullUrl, setStatus) {
  try {
    const r = await fetch(fullUrl)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const text = await r.text()
    await navigator.clipboard.writeText(text)
    setStatus({ kind: 'ok', message: `Copied ${text.length.toLocaleString()} chars to clipboard` })
  } catch (e) {
    setStatus({ kind: 'err', message: e.message || 'Copy failed' })
  }
}

export default function ClaudeLauncher({ day, prompts }) {
  const [status, setStatus] = useState(null)
  if (!prompts?.length) return null

  return (
    <div className="border-t border-rule pt-4 mt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent mb-3">
        Start with Claude
      </div>
      <div className="space-y-3">
        {prompts.map((prompt) => {
          const localUrl = absoluteLocalUrl(prompt.url)
          // Claude.ai's WebFetch has an implicit domain allowlist. Use the GitHub raw
          // mirror URL if synced — otherwise fall back to local (will likely fail in
          // claude.ai but works in Claude Code).
          const fetchUrl = prompt.mirror?.status === 'synced' && prompt.mirror.url
            ? prompt.mirror.url
            : localUrl
          const pointerPrompt = buildPointerPrompt({ day, fetchUrl })
          return (
            <div
              key={prompt.url}
              className="rounded-md border border-rule bg-inset px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 5h12M4 10h12M4 15h7" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium text-ink truncate flex-1">{prompt.name}</span>
                <MirrorBadge mirror={prompt.mirror} />
                <a
                  href={prompt.mirror?.url || localUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink underline underline-offset-2"
                >
                  view raw
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openInClaude(pointerPrompt)}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white hover:bg-accent/90 transition-colors"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M10 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm3.7 8.5l-4.5 3a.5.5 0 0 1-.8-.4v-6a.5.5 0 0 1 .8-.4l4.5 3a.5.5 0 0 1 0 .8z" />
                  </svg>
                  Open in claude.ai
                </button>
                <button
                  type="button"
                  onClick={() => copyFullPrompt(localUrl, setStatus)}
                  className="inline-flex items-center gap-2 rounded-md bg-white border border-rule px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:border-accent hover:text-accent transition-colors"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="5" y="3" width="10" height="13" rx="1.5" />
                    <path d="M8 3v-.5a1.5 1.5 0 0 1 4 0V3" />
                  </svg>
                  Copy full prompt
                </button>
              </div>

              <p className="mt-2 font-mono text-[10px] text-muted leading-relaxed">
                "Open in claude.ai" sends a short prompt telling Claude to fetch this file.
                If Claude can't fetch URLs, use "Copy full prompt" and paste it in.
              </p>

              {status && (
                <p
                  className={`mt-2 font-mono text-[11px] ${
                    status.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {status.message}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
