// Composer: suggested-reply chips (tap to send) + a textarea (Enter sends,
// Shift+Enter newlines) + Send button. Controlled — parent owns `draft` and
// decides what `onSend(text)` does (clear draft, fire the turn). `disabled`
// reflects an in-flight turn: it hides the chips and blocks send.
export default function ChatInput({
  suggestions = [],
  draft,
  onDraft,
  onSend,
  disabled,
  attachment,
  onClearAttachment,
}) {
  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (draft.trim() && !disabled) onSend(draft)
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
          <div className="flex items-center gap-2 mb-2 rounded-lg border border-accent/30 bg-accent/[0.04] px-3 py-1.5">
            <span className="text-accent shrink-0">◲</span>
            <span className="flex-1 min-w-0 truncate text-[12px] text-ink">
              Pointing at: <span className="text-muted">{attachLabel}</span>
            </span>
            <button
              type="button"
              onClick={onClearAttachment}
              className="shrink-0 text-muted hover:text-ink text-sm leading-none"
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
                onClick={() => onSend(s)}
                className="rounded-full border border-accent/40 bg-accent/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent/10 active:scale-[0.98] transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end min-w-0">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your answer…"
            className="flex-1 min-w-0 resize-none rounded-xl border border-rule bg-paper px-4 py-3 text-base text-ink placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => onSend(draft)}
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
