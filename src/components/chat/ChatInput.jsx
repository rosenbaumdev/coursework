import { useEffect, useRef, useState } from 'react'

// Composer: suggested-reply chips (tap to send) + a textarea (Enter sends,
// Shift+Enter newlines) + Send button. Controlled — parent owns `draft` and
// decides what `onSend(text)` does (clear draft, fire the turn). `disabled`
// reflects an in-flight turn: it hides the chips and blocks send. The textarea
// starts one row tall and auto-grows with content up to ~40vh (then scrolls),
// keeping the bottom bar minimal while allowing long entries.
export default function ChatInput({
  suggestions = [],
  onSend,
  disabled,
  attachment,
  onClearAttachment,
}) {
  // Draft lives HERE, not in the page parent: on iPad both panes are mounted and
  // a parent-owned draft made every keystroke re-render the whole tree (all
  // bubbles' markdown + the canvas SVG) — visible typing lag. Local state keeps
  // keystrokes composer-only; send() clears locally and hands the text up.
  const [draft, setDraft] = useState('')
  const taRef = useRef(null)

  function fire(text) {
    const t = (text ?? draft).trim()
    if (!t || disabled) return
    setDraft('')
    onSend(t)
  }

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const max = Math.round(window.innerHeight * 0.4)
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`
    ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden'
  }, [draft])

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      fire()
    }
  }

  const attachLabel = attachment
    ? attachment.text
      ? `“${attachment.text.slice(0, 60)}${attachment.text.length > 60 ? '…' : ''}”`
      : attachment.note || 'a region of the canvas'
    : null

  return (
    <div className="border-t border-rule bg-white shrink-0 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-4">
        {attachment && (
          <div className="flex items-center gap-2.5 mb-2 rounded-lg border border-accent/30 bg-accent/[0.04] px-2.5 py-2">
            {attachment.thumb ? (
              <img
                src={attachment.thumb}
                alt="Selected region"
                className="shrink-0 h-11 w-16 object-cover rounded border border-accent/30 bg-white"
              />
            ) : (
              // No media to crop (text/iframe pane): a mini-map of where in the
              // pane the region sits, so there's still something visual.
              <div className="relative shrink-0 h-11 w-16 rounded border border-rule bg-inset overflow-hidden">
                {attachment.rectPct && (
                  <div
                    className="absolute bg-accent/30 border border-accent rounded-[1px]"
                    style={{
                      left: `${attachment.rectPct.left}%`,
                      top: `${attachment.rectPct.top}%`,
                      width: `${Math.max(4, attachment.rectPct.width)}%`,
                      height: `${Math.max(6, attachment.rectPct.height)}%`,
                    }}
                  />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-accent">◲ Pointing at</div>
              <div className="truncate text-[12px] text-ink">{attachLabel}</div>
            </div>
            <button
              type="button"
              onClick={onClearAttachment}
              className="shrink-0 text-muted hover:text-ink text-sm leading-none self-start"
              aria-label="Clear selection"
            >
              ✕
            </button>
          </div>
        )}
        {suggestions.length > 0 && !disabled && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => fire(s)}
                className="rounded-full border border-accent/40 bg-accent/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent/10 active:scale-[0.98] transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end min-w-0">
          <textarea
            ref={taRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your answer…"
            className="flex-1 min-w-0 resize-none rounded-xl border border-rule bg-paper px-4 py-3 text-base text-ink placeholder:text-muted focus:outline-none focus:border-accent leading-relaxed"
          />
          <button
            type="button"
            onClick={() => fire()}
            disabled={disabled || !draft.trim()}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
