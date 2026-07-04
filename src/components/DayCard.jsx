import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import NotesThread from './NotesThread.jsx'
import AssetList from './AssetList.jsx'
import AssetUploader from './AssetUploader.jsx'
import ClaudeLauncher from './ClaudeLauncher.jsx'
import { MD_COMPONENTS } from './markdown/readingMarkdown.jsx'

function Checkbox({ checked, disabled, onChange, size = 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <button
      type="button"
      aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      className={`check-pop flex ${dims} shrink-0 items-center justify-center rounded-md border ${
        checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-rule'
      } ${disabled ? 'cursor-default opacity-90' : 'hover:border-accent cursor-pointer'}`}
    >
      {checked && (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={icon}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 10.5 8.5 15 16 6" />
        </svg>
      )}
    </button>
  )
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 8 10 12 14 8" />
    </svg>
  )
}

export default function DayCard({
  day,
  student,
  course,
  state,
  isCurrent,
  isDAD,
  depth = 0,
  assets,
  getAssetsFor,
  getState,
  onToggle,
  onAddNote,
  onUploadAsset,
  onRemoveAsset,
  onToggleChild,
  onAddNoteChild,
  extraSlot = null,
}) {
  const [open, setOpen] = useState(false)
  const completed = !!state?.completed
  const notes = state?.notes || []
  const children = day.children || []
  const isSub = depth > 0

  const prompts = assets?.['claude-prompt'] || []
  // Don't double-render claude prompts inside the regular AssetList — they get the launcher UI.
  const otherAssets = assets
    ? Object.fromEntries(Object.entries(assets).filter(([k]) => k !== 'claude-prompt'))
    : null
  const assetCount = assets
    ? Object.values(assets).reduce((acc, list) => acc + list.length, 0)
    : 0

  return (
    <article
      className={`rounded-lg border bg-white transition-all ${
        isSub
          ? 'border-rule shadow-none'
          : isCurrent
            ? 'border-rule border-l-[3px] border-l-accent shadow-card-current'
            : 'border-rule shadow-card hover:shadow-card-hover'
      } ${completed ? 'opacity-60' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        className={`flex items-center gap-4 cursor-pointer select-none ${
          isSub ? 'px-4 py-3' : 'px-5 py-4'
        }`}
      >
        <Checkbox
          checked={completed}
          disabled={isDAD}
          onChange={onToggle}
          size={isSub ? 'sm' : 'md'}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Day {day.id}
            </span>
            {isCurrent && !completed && !isSub && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                Current
              </span>
            )}
            {notes.length > 0 && (
              <span className="font-mono text-[10px] text-muted">
                {notes.length} note{notes.length === 1 ? '' : 's'}
              </span>
            )}
            {assetCount > 0 && (
              <span className="font-mono text-[10px] text-accent">
                {assetCount} file{assetCount === 1 ? '' : 's'}
              </span>
            )}
            {children.length > 0 && (
              <span className="font-mono text-[10px] text-muted">
                {children.length} sub-day{children.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <h3
            className={`${isSub ? 'text-sm' : 'text-base'} font-semibold text-ink mt-0.5 ${
              completed ? 'line-through decoration-1' : ''
            }`}
          >
            {day.title}
          </h3>
          <p className="text-sm text-muted mt-0.5 leading-snug">{day.description}</p>
        </div>

        <Chevron open={open} />
      </div>

      <div
        className="notes-panel grid"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className={`${isSub ? 'px-4 pb-4' : 'px-5 pb-5'}`}>
            <AssetList
              assets={otherAssets}
              categories={['podcast']}
              isDAD={isDAD}
              onRemove={(category, filename) => onRemoveAsset(day.id, category, filename)}
            />

            <ClaudeLauncher day={day} student={student} course={course} prompts={prompts} />

            <AssetList
              assets={otherAssets}
              categories={['deck-pdf', 'deck-pptx', 'other']}
              isDAD={isDAD}
              onRemove={(category, filename) => onRemoveAsset(day.id, category, filename)}
            />

            {day.body && (
              <div className="border-t border-rule pt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                  {day.body}
                </ReactMarkdown>
              </div>
            )}

            {extraSlot}

            {children.length > 0 && (
              <div className="border-t border-rule pt-4 mt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mb-3">
                  Sub-days
                </div>
                <div className="flex flex-col gap-2">
                  {children.map((child) => (
                    <DayCard
                      key={child.id}
                      day={child}
                      student={student}
                      course={course}
                      state={getState(child.id)}
                      isCurrent={false}
                      isDAD={isDAD}
                      depth={depth + 1}
                      assets={getAssetsFor(child.id)}
                      getAssetsFor={getAssetsFor}
                      getState={getState}
                      onToggle={(next) => onToggleChild(child.id, next)}
                      onAddNote={(text) => onAddNoteChild(child.id, text)}
                      onUploadAsset={onUploadAsset}
                      onRemoveAsset={onRemoveAsset}
                      onToggleChild={onToggleChild}
                      onAddNoteChild={onAddNoteChild}
                    />
                  ))}
                </div>
              </div>
            )}

            <NotesThread notes={notes} student={student} isDAD={isDAD} onAdd={onAddNote} />

            {isDAD && (
              <AssetUploader
                dayId={day.id}
                onUpload={(category, file) => onUploadAsset(day.id, category, file)}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
