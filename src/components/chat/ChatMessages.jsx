import { useEffect, useRef } from 'react'
import Bubble from './Bubble.jsx'

// Scrollable message list. On a NEW turn it anchors the top of the turn near the
// top of the viewport (so the learner reads a long response from its beginning,
// not its end) instead of jamming to the bottom; while a reply streams into the
// existing last bubble it does NOT auto-scroll, so the reader stays put. Owns its
// own scroll container so it drops into either the interview view or a session
// pane. `notice` renders above the bubbles; `trailing` renders after the last
// bubble, inside the scroll flow (used for the inline "Continue to canvas" CTA).
export default function ChatMessages({ messages, streamingLastEmpty, notice, trailing }) {
  const scrollRef = useRef(null)
  const bubbleRefs = useRef([])
  const prevCountRef = useRef(0)

  useEffect(() => {
    const container = scrollRef.current
    const oldCount = prevCountRef.current
    const count = messages.length
    prevCountRef.current = count
    if (!container) return
    if (count > oldCount) {
      // Anchor the FIRST newly-added bubble of this turn to the top of the
      // viewport: on send that's the learner's own message (the response then
      // streams in just below it); on the opener it's the assistant greeting.
      const el = bubbleRefs.current[oldCount]
      if (el) {
        const cRect = container.getBoundingClientRect()
        const eRect = el.getBoundingClientRect()
        container.scrollTop += eRect.top - cRect.top - 12
      }
    }
    // Same count = streaming into the last bubble → leave the scroll position be.
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4">
        {notice}
        {messages.map((m, i) => (
          <div key={i} ref={(el) => (bubbleRefs.current[i] = el)}>
            <Bubble
              role={m.role}
              text={m.content}
              streaming={streamingLastEmpty && i === messages.length - 1}
            />
          </div>
        ))}
        {trailing}
      </div>
    </div>
  )
}
