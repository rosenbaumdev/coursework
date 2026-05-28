import { useRef, useState } from 'react'

const CATEGORIES = [
  { value: 'podcast', label: 'Podcast (audio)' },
  { value: 'deck-pdf', label: 'Slide deck — PDF' },
  { value: 'deck-pptx', label: 'Slide deck — PPTX' },
  { value: 'claude-prompt', label: 'Claude prompt (md/txt)' },
  { value: 'other', label: 'Other' },
]

const EXT_CATEGORY = {
  mp3: 'podcast', m4a: 'podcast', wav: 'podcast', ogg: 'podcast', aac: 'podcast',
  pdf: 'deck-pdf',
  pptx: 'deck-pptx', ppt: 'deck-pptx', key: 'deck-pptx',
  md: 'claude-prompt', txt: 'claude-prompt',
}

function detectCategory(filename) {
  const dot = filename.lastIndexOf('.')
  if (dot === -1) return 'other'
  return EXT_CATEGORY[filename.slice(dot + 1).toLowerCase()] || 'other'
}

export default function AssetUploader({ dayId, onUpload, compact = false }) {
  const [pendingCategory, setPendingCategory] = useState(null) // null until a file is dropped/selected
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [lastUploaded, setLastUploaded] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  async function uploadFile(file, category) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const result = await onUpload(category, file)
      setLastUploaded(result?.file?.name || file.name)
      setPendingCategory(null)
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    // Upload one at a time with auto-detected category. User can change category mid-batch.
    files.forEach((file) => {
      const category = detectCategory(file.name)
      uploadFile(file, category)
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`mt-3 rounded-md border-2 border-dashed px-4 ${
        compact ? 'py-3' : 'py-4'
      } transition-colors ${
        dragOver ? 'border-accent bg-accent-soft' : 'border-rule bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          Drop files for Day {dayId}
        </span>
        <span className="font-mono text-[10px] text-muted">
          auto-detects by extension
        </span>
      </div>

      <label className="block cursor-pointer">
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
          <span className="text-sm text-ink">
            {dragOver ? 'Drop to upload' : 'Drop files here or click to browse'}
          </span>
          <span className="font-mono text-[10px] text-muted">
            mp3 → podcast · pdf/pptx → deck · md/txt → claude prompt · else → other
          </span>
        </div>
      </label>

      {pendingCategory && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            Detected:
          </span>
          <select
            value={pendingCategory}
            onChange={(e) => setPendingCategory(e.target.value)}
            className="rounded-md border border-rule bg-white px-2 py-1 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {busy && <p className="mt-2 font-mono text-[11px] text-muted">Uploading…</p>}
      {error && <p className="mt-2 font-mono text-[11px] text-red-600">{error}</p>}
      {!busy && !error && lastUploaded && (
        <p className="mt-2 font-mono text-[11px] text-emerald-700">
          Uploaded {lastUploaded}
        </p>
      )}
    </div>
  )
}
