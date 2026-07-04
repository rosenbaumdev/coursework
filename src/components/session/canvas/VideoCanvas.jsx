// Real HTML5 video player. Falls back to a labeled placeholder if no src is given.
export default function VideoCanvas({ payload }) {
  return (
    <div className="h-full flex items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-2xl">
        <div className="rounded-lg overflow-hidden border border-rule bg-black">
          {payload.src ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={payload.poster}
              className="w-full aspect-video bg-black"
            >
              <source src={payload.src} />
              Your browser can’t play this video.
            </video>
          ) : (
            <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-accent to-dad">
              <span className="ml-1 block w-0 h-0 border-y-[11px] border-y-transparent border-l-[18px] border-l-white/90" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">{payload.label || 'Video'}</p>
          {payload.durationLabel && (
            <span className="font-mono text-[12px] text-muted">{payload.durationLabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}
