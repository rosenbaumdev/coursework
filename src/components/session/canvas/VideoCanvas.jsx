// Video pane. Three modes, best-tool-per-beat:
//  - payload.youtubeId (or a YouTube URL in payload.src) → embedded YouTube (reuse
//    existing material; privacy-friendly youtube-nocookie host)
//  - payload.src (a direct video file) → HTML5 <video>
//  - neither → labeled placeholder
function youTubeId(payload) {
  if (payload.youtubeId) return payload.youtubeId
  const s = payload.src || ''
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function VideoCanvas({ payload }) {
  const ytId = youTubeId(payload)
  const isFile = !ytId && payload.src
  return (
    <div className="h-full flex items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-3xl">
        <div className="rounded-lg overflow-hidden border border-rule bg-black">
          {ytId ? (
            <iframe
              className="w-full aspect-video bg-black"
              // Standard youtube.com host (not -nocookie) so a signed-in YouTube Premium
              // session in the same browser plays the embed ad-free. Private single-student
              // instance — fine here; revisit if this ever serves third parties at scale.
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1${payload.start ? `&start=${payload.start}` : ''}`}
              title={payload.label || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isFile ? (
            <video controls playsInline preload="metadata" poster={payload.poster} className="w-full aspect-video bg-black">
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
        {payload.caption && <p className="mt-1 text-[13px] text-muted">{payload.caption}</p>}
      </div>
    </div>
  )
}
