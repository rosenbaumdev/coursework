import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CHAT_MD, copyText } from './chatMarkdown.jsx'

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

// A single chat bubble. Student (role 'user') is right-aligned, blue, plain text.
// Coach/assistant is left-aligned, inset, markdown-rendered. An empty assistant
// bubble with `streaming` shows a pulsing caret while the stream fills it in.
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={CHAT_MD}>
            {text}
          </ReactMarkdown>
        ) : streaming ? (
          <span className="inline-block w-1.5 h-4 align-middle bg-muted/60 animate-pulse rounded-sm" />
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
