// A single contained image with an optional caption.
export default function ImageCanvas({ payload }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-5 sm:p-8 gap-3">
      <img
        src={payload.src}
        alt={payload.alt || ''}
        className="max-w-full max-h-full object-contain rounded-md border border-rule"
      />
      {payload.caption && (
        <p className="text-[13px] text-muted text-center max-w-lg">{payload.caption}</p>
      )}
    </div>
  )
}
