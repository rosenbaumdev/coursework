import { useEffect, useRef, useState } from 'react'

// Functional browser: editable URL bar + real iframe navigation with back/forward/
// reload. Supports two entry kinds — an html entry (self-contained srcDoc, e.g. the
// scripted intro page) and a url entry (a real site loaded in the iframe). Note:
// many sites send X-Frame-Options/CSP that refuse embedding; when that happens the
// frame stays blank and we surface a hint. A header-stripping proxy is the v2 fix.
function normalizeUrl(raw) {
  const s = raw.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return `https://${s}`
  // no dot → treat as a web search
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`
}

export default function BrowserCanvas({ payload, onLiveState }) {
  const initialEntry =
    payload.mode !== 'live' && payload.html
      ? { kind: 'html', value: payload.html, label: payload.url || 'start' }
      : { kind: 'url', value: normalizeUrl(payload.url || 'https://example.com'), label: '' }

  const [entries, setEntries] = useState([initialEntry])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState(initialEntry.kind === 'url' ? initialEntry.value : (payload.url || ''))
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showBlockHint, setShowBlockHint] = useState(false)
  const hintTimer = useRef(null)

  const current = entries[index]

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  useEffect(() => {
    if (!onLiveState) return
    onLiveState(
      current.kind === 'url'
        ? `Currently viewing ${current.value}.`
        : `Showing a self-contained intro page (${current.label || 'start'}).`,
    )
  }, [current, onLiveState])

  function navigate(rawUrl) {
    const url = normalizeUrl(rawUrl)
    if (!url) return
    const next = entries.slice(0, index + 1)
    next.push({ kind: 'url', value: url, label: '' })
    setEntries(next)
    setIndex(next.length - 1)
    setInput(url)
    startLoad()
  }
  function startLoad() {
    setLoading(true)
    setShowBlockHint(false)
    clearTimeout(hintTimer.current)
    // Cross-origin frames can't be inspected; if onLoad hasn't cleared loading
    // within a few seconds, assume the site refused embedding.
    hintTimer.current = setTimeout(() => setShowBlockHint(true), 3500)
  }
  function onFrameLoad() {
    setLoading(false)
    clearTimeout(hintTimer.current)
  }
  function go(delta) {
    const i = Math.max(0, Math.min(entries.length - 1, index + delta))
    setIndex(i)
    const e = entries[i]
    setInput(e.kind === 'url' ? e.value : e.label || '')
    if (e.kind === 'url') startLoad()
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4">
      <div className="flex-1 min-h-0 flex flex-col rounded-lg overflow-hidden border border-rule shadow-card bg-white">
        {/* chrome */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-rule bg-inset">
          <div className="flex gap-1.5 mr-1">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="px-1.5 text-muted hover:text-ink disabled:opacity-30"
            aria-label="Back"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= entries.length - 1}
            className="px-1.5 text-muted hover:text-ink disabled:opacity-30"
            aria-label="Forward"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => {
              setReloadKey((k) => k + 1)
              if (current.kind === 'url') startLoad()
            }}
            className="px-1.5 text-muted hover:text-ink"
            aria-label="Reload"
          >
            ⟳
          </button>
          <form
            className="flex-1 min-w-0"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a URL or search…"
              spellCheck={false}
              className="w-full rounded-md bg-white border border-rule px-3 py-1 font-mono text-[12px] text-ink focus:outline-none focus:border-accent"
            />
          </form>
        </div>
        {/* viewport */}
        <div className="relative flex-1 min-h-0 bg-white">
          {current.kind === 'html' ? (
            <iframe
              key={`html-${index}-${reloadKey}`}
              title="browser"
              srcDoc={current.value}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              className="w-full h-full border-0"
            />
          ) : (
            <iframe
              key={`url-${index}-${reloadKey}`}
              title="browser"
              src={current.value}
              onLoad={onFrameLoad}
              className="w-full h-full border-0"
            />
          )}
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent/30 overflow-hidden">
              <div className="h-full w-1/3 bg-accent animate-pulse" />
            </div>
          )}
          {showBlockHint && current.kind === 'url' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-ink/90 text-white text-[12px] px-3 py-1.5 shadow-card-hover">
              Blank? This site likely refuses embedding (X-Frame-Options). Try example.com or wikipedia.org.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
