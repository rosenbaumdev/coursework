import { useState } from 'react'

// Copy that works OUTSIDE secure contexts too: navigator.clipboard is undefined
// on plain http (jserver:8788) — fall back to a transient textarea + execCommand.
export async function copyText(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// Extract plain text from a React children tree (for copy-to-clipboard).
function textOf(node) {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node.props?.children) return textOf(node.props.children)
  return ''
}

// Code block with a copy control in the corner (#13).
function PreBlock({ children }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (await copyText(textOf(children).replace(/\n$/, ''))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }
  return (
    <div className="relative group/pre my-2">
      <pre className="bg-white border border-rule rounded-md p-3 overflow-x-auto text-[12px]">
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute top-1.5 right-1.5 rounded border border-rule bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-muted hover:text-ink opacity-70 md:opacity-0 md:group-hover/pre:opacity-100 transition"
      >
        {copied ? '✓' : '⧉'}
      </button>
    </div>
  )
}

// Chat-tuned markdown map: tighter than the day-card renderer, sized for bubbles.
// Headers read as conversational emphasis (a greeting "# Hey Zachary"), not the
// muted mono section labels used elsewhere. Shared by the interview view and the
// coached-session chat pane so both render assistant turns identically.
export const CHAT_MD = {
  h1: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  h2: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  h3: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  h4: ({ children }) => <p className="text-[15px] font-semibold text-ink mb-2">{children}</p>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/40 pl-3 my-2 text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="font-mono text-[12px] bg-white/60 px-1 py-0.5 rounded border border-rule">
        {children}
      </code>
    ) : (
      <code className="font-mono text-[12px]">{children}</code>
    ),
  pre: ({ children }) => <PreBlock>{children}</PreBlock>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-[13px]">{children}</table>
    </div>
  ),
  hr: () => <hr className="my-3 border-rule" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
      {children}
    </a>
  ),
}
