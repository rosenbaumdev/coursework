import { useEffect, useRef } from 'react'
import Bubble from './Bubble.jsx'

// Scrollable message list with Jonathan's streaming-render spec:
//   1. replies stream in;
//   2. the growing bubble stays bottom-pinned — visibly extending UPWARD — until
//      its top reaches the top of the chat frame;
//   3. from then on the rest overflows off-screen below with ZERO auto-scroll;
//   4. the reader scrolls down at their own pace to the bubble end + chips; any
//      manual scroll mid-stream immediately stops all programmatic scrolling.
// Both 2 and 3 are one formula: scrollTop = min(bottomPin, bubbleTopAnchor).
// `trailing` renders after the last bubble inside the scroll flow (inline CTA).
export default function ChatMessages({ messages, streamingLastEmpty, notice, trailing }) {
  const scrollRef = useRef(null)
  const bubbleRefs = useRef([])
  const prevCountRef = useRef(0)
  const lastSetRef = useRef(-1)
  const userTookOverRef = useRef(false)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => {
      // A scroll we didn't set = the reader took over; stop steering this turn.
      if (Math.abs(container.scrollTop - lastSetRef.current) > 4) userTookOverRef.current = true
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    const oldCount = prevCountRef.current
    const count = messages.length
    prevCountRef.current = count
    if (!container || !count) return
    if (count > oldCount) userTookOverRef.current = false // new turn → steering resumes
    if (userTookOverRef.current) return

    const el = bubbleRefs.current[count - 1] // the growing (or newest) bubble
    if (!el) return
    const bottomPin = container.scrollHeight - container.clientHeight
    // Anchor measured against the SCROLL CONTAINER (rect delta + current scroll),
    // not offsetTop — offsetTop reads from the nearest positioned ancestor, which
    // on wide viewports is not the scroll container, skewing the freeze point.
    const topAnchor =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 12
    const next = Math.min(bottomPin, topAnchor)
    if (Math.abs(next - container.scrollTop) > 1) {
      container.scrollTop = next
      lastSetRef.current = container.scrollTop
    }
  }, [messages, streamingLastEmpty])

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto"
      style={{ contain: 'layout paint' }}
    >
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
