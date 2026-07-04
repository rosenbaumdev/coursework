import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_COMPONENTS } from '../../markdown/readingMarkdown.jsx'

// Editable artifact: behaves like the tool it emulates — markdown (edit ↔ live
// rendered preview), html (edit ↔ live iframe preview), or code (editable source).
// Edits are session-local. The driver can still push a new version (same directive
// id) — an incoming payload.content change flows in via the effect below, so the
// scripted "live update" still lands. (Real cross-session persistence arrives with
// the live engine.) NOTE: dangerouslySetInnerHTML/iframe render trusted content
// only; the real engine must sanitize model HTML.
export default function ArtifactCanvas({ payload, onLiveState }) {
  const format = payload.format || 'markdown'
  const [content, setContent] = useState(payload.content || '')
  const [mode, setMode] = useState(format === 'code' ? 'edit' : 'preview')

  // Let external (driver) updates to this artifact's content flow in.
  useEffect(() => {
    setContent(payload.content || '')
  }, [payload.content])

  // Report the (possibly edited) content so the chat can discuss it.
  useEffect(() => {
    onLiveState?.(content)
  }, [content, onLiveState])

  const canPreview = format !== 'code'

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-rule bg-white">
        <span className="text-sm font-semibold text-ink truncate">{payload.title || 'Artifact'}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{format}</span>
          {canPreview && (
            <div className="inline-flex rounded-md border border-rule p-0.5">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  mode === 'edit' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  mode === 'preview' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                }`}
              >
                Preview
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mode === 'edit' || !canPreview ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full h-full resize-none bg-inset text-ink font-mono text-[13px] leading-relaxed p-4 focus:outline-none"
          />
        ) : format === 'html' ? (
          <iframe
            title="artifact-preview"
            srcDoc={content}
            sandbox="allow-same-origin"
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <div className="h-full overflow-y-auto overflow-x-hidden p-5">
            <div className="max-w-2xl mx-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
