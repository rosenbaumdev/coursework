// Shown before the session has driven any content to the canvas.
export default function EmptyCanvas() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted text-center">
        The canvas follows the conversation.
        <br />
        Answer on the left to begin.
      </p>
    </div>
  )
}
