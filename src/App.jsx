import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import ArcSelector from './components/ArcSelector.jsx'
import DayCard from './components/DayCard.jsx'
import FilesView from './components/FilesView.jsx'
import { useTrackerData } from './hooks/useTrackerData.js'
import { useAssets } from './hooks/useAssets.js'
import { buildDayTree, parseCourseWork } from './data/parseCourseWork.js'
import { COURSE_SLUG, COURSE_TITLE } from './courseConfig.js'

function useCoursework() {
  const [days, setDays] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/${COURSE_SLUG}.md`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((md) => {
        if (cancelled) return
        setDays(parseCourseWork(md))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message || 'Failed to load coursework')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { days, error }
}

function WeekSeparator({ week }) {
  return (
    <div className="flex items-center gap-3 pt-6 pb-1 first:pt-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Week {week}
      </span>
      <div className="h-px flex-1 bg-rule" />
    </div>
  )
}

function InlineArcPicker({ onSelect }) {
  return (
    <div className="border-t border-rule pt-4 mt-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent mb-3">
        Pick your arc
      </div>
      <p className="text-sm text-muted mb-4 leading-relaxed">
        Every day from here on bends around this choice. Pick the one that makes you
        most curious — you can change it later, but not without paying for it in
        momentum.
      </p>
      <ArcSelector onSelect={onSelect} compact />
    </div>
  )
}

function TrackerView() {
  const location = useLocation()
  const isDAD = location.pathname.startsWith('/dad')
  const { arc, setArc, clearArc, getDay, setCompleted, addNote } = useTrackerData()
  const { days: flatDays, error } = useCoursework()
  const { manifest, upload, remove } = useAssets()

  const tree = useMemo(() => buildDayTree(flatDays), [flatDays])

  const totalTop = tree.length
  const completedTop = useMemo(
    () => tree.reduce((acc, d) => acc + (getDay(d.id).completed ? 1 : 0), 0),
    [tree, getDay],
  )
  const currentDayId = useMemo(() => {
    const first = tree.find((d) => !getDay(d.id).completed)
    return first ? first.id : null
  }, [tree, getDay])

  function handleChangeArc() {
    const ok = window.confirm(
      'Change your arc? Your progress and notes stay — but every day going forward gets reframed around the new arc.',
    )
    if (ok) clearArc()
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-sm text-red-600">Failed to load coursework: {error}</p>
      </div>
    )
  }

  let lastWeek = null

  return (
    <>
      <Header
        arc={arc}
        isDAD={isDAD}
        completed={completedTop}
        total={totalTop}
        onChangeArc={!isDAD && arc ? handleChangeArc : undefined}
        extraNav={
          isDAD && (
            <Link
              to="/dad/files"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink underline underline-offset-2"
            >
              manage files →
            </Link>
          )
        }
      />
      <main className="max-w-3xl mx-auto px-6 py-8 pb-24">
        <div className="flex flex-col gap-3">
          {tree.map((day) => {
            const showWeek = day.week !== lastWeek
            lastWeek = day.week
            const showArcPicker = !isDAD && !arc && day.id === '0'
            return (
              <div key={day.id} className="flex flex-col gap-3">
                {showWeek && <WeekSeparator week={day.week} />}
                <DayCard
                  day={day}
                  state={getDay(day.id)}
                  isCurrent={day.id === currentDayId}
                  isDAD={isDAD}
                  assets={manifest[day.id]}
                  getAssetsFor={(id) => manifest[id]}
                  getState={(id) => getDay(id)}
                  onToggle={(next) => setCompleted(day.id, next)}
                  onAddNote={(text) => addNote(day.id, isDAD ? 'dad' : 'student', text)}
                  onUploadAsset={(id, category, file) => upload(id, category, file)}
                  onRemoveAsset={(id, category, filename) => remove(id, category, filename)}
                  onToggleChild={(id, next) => setCompleted(id, next)}
                  onAddNoteChild={(id, text) =>
                    addNote(id, isDAD ? 'dad' : 'student', text)
                  }
                  extraSlot={showArcPicker ? <InlineArcPicker onSelect={setArc} /> : null}
                />
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}

function FilesViewRoute() {
  const { arc } = useTrackerData()
  const { days: flatDays, error } = useCoursework()
  const { manifest, upload, remove } = useAssets()
  const tree = useMemo(() => buildDayTree(flatDays), [flatDays])
  const totalTop = tree.length

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-sm text-red-600">Failed to load coursework: {error}</p>
      </div>
    )
  }

  return (
    <>
      <Header arc={arc} isDAD={true} completed={0} total={totalTop} />
      <FilesView tree={tree} manifest={manifest} onUpload={upload} onRemove={remove} />
    </>
  )
}

export default function App() {
  useEffect(() => {
    document.title = COURSE_TITLE
  }, [])

  return (
    <Routes>
      <Route path="/dad/files" element={<FilesViewRoute />} />
      <Route path="/dad" element={<TrackerView />} />
      <Route path="/" element={<TrackerView />} />
      <Route path="*" element={<TrackerView />} />
    </Routes>
  )
}
