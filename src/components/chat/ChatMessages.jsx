import { useEffect, useRef, useState } from 'react'
import Bubble from './Bubble.jsx'

// Scrollable message list. Streaming behavior = GROW-UP-THEN-FREEZE-AT-TOP (spec #1,
// ChatGPT/Claude-style): when a new reply starts, its bubble's TOP is scrolled to the
// top of the frame and FROZEN there — the text then streams downward off the bottom,
// so the reader reads from the top instead of being yanked to the bottom every tick.
// A down-arrow appears whenever content sits below the fold; tapping it switches to
// FOLLOW-BOTTOM for that turn (keeps newest text in view). A manual scroll frees the
// view ('free' mode) — no more auto-steering until the next turn re-arms pin-top.
// `trailing` renders after the last bubble inside the scroll flow (inline CTA).
export default function ChatMessages({ messages, streamingLastEmpty, notice, trailing }) {
  const scrollRef = useRef(null)
  const prevCountRef = useRef(0)
  const lastSetRef = useRef(-1)
  // Per-turn steering mode: 'pinTop' (default — freeze new bubble's top at frame top),
  // 'followBottom' (reader tapped the down-arrow), 'free' (reader scrolled manually).
  const modeRef = useRef('pinTop')
  const lastBubbleRef = useRef(null) // DOM node of the newest message wrapper
  // #1 — show a jump-to-bottom affordance when the reader is scrolled up.
  const [atBottom, setAtBottom] = useState(true)

  const NEAR_BOTTOM_PX = 80
  const TOP_GAP = 12 // breathing room above the pinned bubble
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => {
      // A scroll we didn't set = the reader took over; stop steering this turn.
      if (Math.abs(container.scrollTop - lastSetRef.current) > 4) modeRef.current = 'free'
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight
      setAtBottom(dist <= NEAR_BOTTOM_PX)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // The down-arrow: reveal below-the-fold content AND switch to follow-bottom so the
  // rest of a long streaming reply keeps scrolling into view.
  function scrollToBottom() {
    const container = scrollRef.current
    if (!container) return
    modeRef.current = 'followBottom'
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
    if (count > oldCount) modeRef.current = 'pinTop' // new turn → re-arm pin-top
    const mode = modeRef.current

    if (mode === 'free') {
      // Reader is steering; just keep the jump-to-bottom affordance honest (growth
      // fires no scroll event under overflowAnchor:none, so recompute atBottom here).
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight
      setAtBottom(dist <= NEAR_BOTTOM_PX)
      return
    }

    if (mode === 'followBottom') {
      const bottom = container.scrollHeight - container.clientHeight
      if (Math.abs(bottom - container.scrollTop) > 1) {
        container.scrollTop = bottom
        lastSetRef.current = container.scrollTop
      }
      setAtBottom(true)
      return
    }

    // mode === 'pinTop': align the newest bubble's TOP to the frame top (with a small
    // gap), then let it stream downward off the fold. getBoundingClientRect keeps this
    // correct regardless of offsetParent; once pinned, delta≈TOP_GAP so re-asserting
    // each streaming tick is a no-op — the top stays rock-steady. A reader scroll flips
    // mode to 'free' (onScroll), and a tall reply pushes text below the fold → arrow.
    const node = lastBubbleRef.current
    if (node) {
      const delta = node.getBoundingClientRect().top - container.getBoundingClientRect().top
      const max = container.scrollHeight - container.clientHeight
      const target = Math.max(0, Math.min(container.scrollTop + delta - TOP_GAP, max))
      if (Math.abs(container.scrollTop - target) > 1) {
        container.scrollTop = target
        lastSetRef.current = Math.round(target)
      }
    }
    const dist = container.scrollHeight - container.scrollTop - container.clientHeight
    setAtBottom(dist <= NEAR_BOTTOM_PX)
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
            <div key={i} ref={i === messages.length - 1 ? lastBubbleRef : null}>
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
