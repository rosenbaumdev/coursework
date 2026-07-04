import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CHAT_MD } from './chatMarkdown.jsx'

// A single chat bubble. Student (role 'user') is right-aligned, blue, plain text.
// Coach/assistant is left-aligned, inset, markdown-rendered. An empty assistant
// bubble with `streaming` shows a pulsing caret while the stream fills it in.
export default function Bubble({ role, text, streaming }) {
  const isStudent = role === 'user'
  if (isStudent) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[82%] min-w-0 rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-[15px] leading-relaxed text-white whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] sm:max-w-[82%] min-w-0 rounded-2xl rounded-bl-sm border border-rule bg-inset px-4 py-3 text-[15px] leading-relaxed text-ink break-words [overflow-wrap:anywhere]">
        {text ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={CHAT_MD}>
            {text}
          </ReactMarkdown>
        ) : streaming ? (
          <span className="inline-block w-1.5 h-4 align-middle bg-muted/60 animate-pulse rounded-sm" />
        ) : null}
      </div>
    </div>
  )
}
