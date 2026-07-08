import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CHAT_MD, copyText } from './chatMarkdown.jsx'
import { commaFormatMarkdown } from '../../lib/format.js'

// Small copy-to-clipboard affordance for a bubble. Sits below the bubble edge,
// faint until hover/tap; flips to a check briefly on success.
export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (await copyText(text || '')) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy message"
      className={`text-[10px] font-mono text-muted/60 hover:text-ink transition px-1 ${className}`}
    >
      {copied ? '✓ copied' : '⧉ copy'}
    </button>
  )
}

// The known "thinking" cue: three dots pulsing in staggered sequence. Shown
// whenever a cast member is actively working — waiting for the first token, mid
// stream, or paused on canvas work (Stagehand build / artifact draft) after the
// prose has landed. `animation-delay` staggers the three so it reads as motion.
function ThinkingDots({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`} aria-label="Working…" role="status">
      {[0, 200, 400].map((d) => (
        <span
          key={d}
          className="w-1.5 h-1.5 rounded-full bg-muted/70 animate-pulse"
          style={{ animationDelay: `${d}ms`, animationDuration: '1s' }}
        />
      ))}
    </span>
  )
}

// A single chat bubble. Student (role 'user') is right-aligned, blue, plain text.
// Coach/assistant is left-aligned, inset, markdown-rendered. While `streaming`,
// the assistant bubble shows the thinking dots — alone when no text has arrived
// yet, or trailing the text (so the cue persists through canvas-work pauses).
// Settled bubbles carry a faint copy control (#13).
function Bubble({ role, text, streaming }) {
  const isStudent = role === 'user'
  if (isStudent) {
    return (
      <div className="flex flex-col items-end group">
        <div className="max-w-[85%] sm:max-w-[82%] min-w-0 rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-[15px] leading-relaxed text-white whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {text}
        </div>
        {text && <CopyButton text={text} className="mt-0.5 opacity-50 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" />}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start group">
      <div className="max-w-[85%] sm:max-w-[82%] min-w-0 rounded-2xl rounded-bl-sm border border-rule bg-inset px-4 py-3 text-[15px] leading-relaxed text-ink break-words [overflow-wrap:anywhere]">
        {text ? (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={CHAT_MD}>
              {commaFormatMarkdown(text)}
            </ReactMarkdown>
            {streaming && <ThinkingDots className="mt-1" />}
          </>
        ) : streaming ? (
          <ThinkingDots />
        ) : null}
      </div>
      {text && !streaming && (
        <CopyButton text={text} className="mt-0.5 opacity-50 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" />
      )}
    </div>
  )
}

// Memoized: during streaming only the last bubble's text changes — the rest
// must not re-parse their markdown every delta (or on any parent re-render).
export default memo(Bubble)
