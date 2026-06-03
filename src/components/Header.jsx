import ProgressBar from './ProgressBar.jsx'

export default function Header({ student, course, arc, isDAD, completed, total, onChangeArc, extraNav }) {
  return (
    <header className="border-b border-rule bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
              {isDAD ? "Dad's View" : 'Builder Mode'}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {student.name}'s {course.title}
            </h1>
            <div className="mt-3 inline-flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Arc
              </span>
              {arc ? (
                <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 font-mono text-xs text-accent">
                  {arc}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rule px-3 py-1 font-mono text-xs text-muted">
                  not picked yet
                </span>
              )}
              {!isDAD && onChangeArc && (
                <button
                  type="button"
                  onClick={onChangeArc}
                  className="text-xs text-muted hover:text-ink underline underline-offset-2"
                >
                  change
                </button>
              )}
            </div>
          </div>
          {extraNav && <div className="shrink-0 pt-1">{extraNav}</div>}
        </div>
        <div className="mt-7">
          <ProgressBar completed={completed} total={total} />
        </div>
      </div>
    </header>
  )
}
