import { useEffect, useRef } from 'react'
import Bubble from './Bubble.jsx'

// Scrollable message list with auto-scroll-to-bottom on new content. Owns its own
// scroll container so it drops into either the full-height interview view or a
// pane of the coached-session split. `notice` is an optional node (loading /
// error line) rendered above the bubbles.
export default function ChatMessages({ messages, streamingLastEmpty, notice }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streamingLastEmpty])

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4">
        {notice}
        {messages.map((m, i) => (
          <Bubble
            key={i}
            role={m.role}
            text={m.content}
            streaming={streamingLastEmpty && i === messages.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
