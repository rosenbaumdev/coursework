import { useRef } from 'react'

// Two-pane layout, fully controlled by SessionView (which owns orientation, ratio,
// and the slide/override lifecycle). Wide: canvas + chat split along `orientation`
// with a draggable divider; when `hasCanvas` is false the canvas pane slides away
// (flex-basis → 0) and chat fills the space. Narrow: a single full-width pane.
export default function SplitPane({
  orientation,
  isNarrow,
  activeTab,
  hasCanvas,
  ratio,
  onRatioChange,
  onRatioCommit,
  canvas,
  chat,
}) {
  const containerRef = useRef(null)
  const draggingRef = useRef(false)
  const liveRatioRef = useRef(ratio)
  liveRatioRef.current = ratio

  const isLR = orientation === 'lr'

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    document.body.classList.add('select-none')
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // ratio = the CANVAS pane's fraction. Canvas sits on the right (lr) / top (tb).
    const raw = isLR
      ? (rect.right - e.clientX) / rect.width
      : (e.clientY - rect.top) / rect.height
    const r = Math.max(0.2, Math.min(0.8, raw))
    liveRatioRef.current = r
    onRatioChange(r)
  }
  function onPointerUp(e) {
    if (!draggingRef.current) return
    draggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    document.body.classList.remove('select-none')
    onRatioCommit(liveRatioRef.current)
  }

  // Narrow: one full-width pane at a time (tabs live in the parent toolbar).
  if (isNarrow) {
    return (
      <div className="flex-1 min-h-0 min-w-0">
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
          {activeTab === 'canvas' && hasCanvas ? canvas : chat}
        </div>
      </div>
    )
  }

  const canvasWrap = (
    <div
      aria-hidden={!hasCanvas}
      className="shrink-0 grow-0 min-w-0 min-h-0 overflow-hidden transition-[flex-basis,opacity] duration-300 ease-out"
      style={{ flexBasis: hasCanvas ? `${ratio * 100}%` : '0%', opacity: hasCanvas ? 1 : 0 }}
    >
      {canvas}
    </div>
  )
  const chatWrap = (
    <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">{chat}</div>
  )
  const divider = hasCanvas ? (
    <div
      role="separator"
      aria-orientation={isLR ? 'vertical' : 'horizontal'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`shrink-0 bg-rule hover:bg-accent/40 active:bg-accent/60 transition-colors touch-none ${
        isLR ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      }`}
    />
  ) : null

  // Order per orientation: chat LEFT (lr) / BOTTOM (tb), content RIGHT (lr) / TOP (tb).
  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 min-w-0 flex ${isLR ? 'flex-row' : 'flex-col'}`}
    >
      {isLR ? (
        <>
          {chatWrap}
          {divider}
          {canvasWrap}
        </>
      ) : (
        <>
          {canvasWrap}
          {divider}
          {chatWrap}
        </>
      )}
    </div>
  )
}
