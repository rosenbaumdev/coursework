import { Link } from 'react-router-dom'
import AssetList from './AssetList.jsx'
import AssetUploader from './AssetUploader.jsx'

function flatten(tree) {
  const out = []
  for (const day of tree) {
    out.push(day)
    if (day.children?.length) {
      for (const child of day.children) out.push(child)
    }
  }
  return out
}

export default function FilesView({ tree, manifest, onUpload, onRemove }) {
  const days = flatten(tree)

  let lastWeek = null

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-1">
            Course Materials
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Drop files where they belong
          </h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Every day shows its current materials. Drag a file onto a day, or click the
            zone to browse. Category is auto-detected from the file extension.
          </p>
        </div>
        <Link
          to="/dad"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink underline underline-offset-2"
        >
          ← review view
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const showWeek = day.week !== lastWeek
          lastWeek = day.week
          const assets = manifest[day.id]
          const assetCount = assets
            ? Object.values(assets).reduce((acc, list) => acc + list.length, 0)
            : 0
          const isSub = day.parentId != null

          return (
            <div key={day.id} className="flex flex-col gap-2">
              {showWeek && (
                <div className="flex items-center gap-3 pt-4 pb-1 first:pt-0">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                    Week {day.week}
                  </span>
                  <div className="h-px flex-1 bg-rule" />
                </div>
              )}

              <article
                className={`rounded-lg border bg-white shadow-card ${
                  isSub ? 'border-rule ml-6' : 'border-rule'
                }`}
              >
                <div className={`flex items-baseline gap-3 flex-wrap ${isSub ? 'px-4 pt-3' : 'px-5 pt-4'}`}>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                    Day {day.id}
                  </span>
                  <h3 className={`${isSub ? 'text-sm' : 'text-base'} font-semibold text-ink`}>
                    {day.title}
                  </h3>
                  <span className="font-mono text-[10px] text-muted">
                    {assetCount} file{assetCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className={isSub ? 'px-4 pb-4' : 'px-5 pb-5'}>
                  <AssetList
                    assets={assets}
                    isDAD={true}
                    onRemove={(category, filename) => onRemove(day.id, category, filename)}
                  />
                  <AssetUploader
                    dayId={day.id}
                    onUpload={(category, file) => onUpload(day.id, category, file)}
                    compact
                  />
                </div>
              </article>
            </div>
          )
        })}
      </div>
    </main>
  )
}
