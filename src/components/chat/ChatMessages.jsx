import { useEffect, useRef, useState } from 'react'
import Bubble from './Bubble.jsx'

// Scrollable message list. Streaming behavior = FOLLOW THE BOTTOM (Claude-style,
// headless-verified): as a reply streams, the newest text stays pinned to the
// bottom of the frame so the reader always sees what's being written. A manual
// scroll-up stops the follow for the rest of the turn; the jump-to-bottom button
// (#1) or the next turn re-arms it. (The earlier "grow-up-then-freeze-at-top"
// spec pushed streaming text below the fold, which read as broken.)
// `trailing` renders after the last bubble inside the scroll flow (inline CTA).
export default function ChatMessages({ messages, streamingLastEmpty, notice, trailing }) {
  const scrollRef = useRef(null)
  const prevCountRef = useRef(0)
  const lastSetRef = useRef(-1)
  const userTookOverRef = useRef(false)
  // #1 — show a jump-to-bottom affordance when the reader is scrolled up.
  const [atBottom, setAtBottom] = useState(true)

  const NEAR_BOTTOM_PX = 80
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => {
      // A scroll we didn't set = the reader took over; stop steering this turn.
      if (Math.abs(container.scrollTop - lastSetRef.current) > 4) userTookOverRef.current = true
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight
      setAtBottom(dist <= NEAR_BOTTOM_PX)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // Jump to the newest message and re-arm streaming-follow for this turn.
  function scrollToBottom() {
    const container = scrollRef.current
    if (!container) return
    userTookOverRef.current = false
    container.scrollTop = container.scrollHeight - container.clientHeight
    lastSetRef.current = container.scrollTop
    setAtBottom(true)
  }

  useEffect(() => {
    const container = scrollRef.current
    const oldCount = prevCountRef.current
    const count = messages.length
    prevCountRef.current = count
    if (!container || !count) return
    if (count > oldCount) userTookOverRef.current = false // new turn → follow resumes
    if (userTookOverRef.current) {
      // Follow is OFF (the reader scrolled up). The frame still grows under them
      // as text streams, but growth fires no scroll event (overflowAnchor:none),
      // so re-evaluate the jump-to-bottom affordance HERE — otherwise a small
      // (5–79px) scroll-up strands the reader with text streaming off-screen and
      // no button ever appears (#6 dead band: takeover fires at >4px, the button
      // only at >80px, and nothing recomputed atBottom in between).
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight
      setAtBottom(dist <= NEAR_BOTTOM_PX)
      return
    }
    // Follow the bottom: keep the newest content in view as it streams. We are
    // the only programmatic writer; lastSetRef lets the scroll listener tell our
    // writes from a real reader scroll-up (which flips userTookOver, above).
    const bottom = container.scrollHeight - container.clientHeight
    if (Math.abs(bottom - container.scrollTop) > 1) {
      container.scrollTop = bottom
      lastSetRef.current = container.scrollTop
    }
    setAtBottom(true)
  }, [messages, streamingLastEmpty])

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto"
        style={{
          contain: 'layout paint',
          // Chrome's scroll anchoring auto-adjusts scrollTop as the streaming
          // bubble grows — its adjustments looked like USER scrolls to our
          // takeover detector, killing the grow-up-then-freeze behavior on
          // desktop (Safari has no scroll anchoring → iPad was fine). We are
          // the only scroll writer here; the reader is the only other one.
          overflowAnchor: 'none',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-4">
          {notice}
          {messages.map((m, i) => (
            <div key={i}>
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

      {/* #1 — jump-to-bottom, Claude-style: fades in only when scrolled up. */}
      {!atBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 grid h-9 w-9 place-items-center rounded-full border border-rule bg-white/95 text-ink shadow-card backdrop-blur transition hover:bg-white active:scale-95 session-fade"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
