import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Header from './components/Header.jsx'
import ArcSelector from './components/ArcSelector.jsx'
import DayCard from './components/DayCard.jsx'
import FilesView from './components/FilesView.jsx'
import InterviewView from './components/InterviewView.jsx'
import SessionView from './components/session/SessionView.jsx'
import Splash from './components/Splash.jsx'
import { useTrackerData } from './hooks/useTrackerData.js'
import { useAssets } from './hooks/useAssets.js'
import { buildDayTree, parseCourseWork } from './data/parseCourseWork.js'
import { getStudent } from './students.js'

function useCoursework(mdFile) {
  const [days, setDays] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mdFile) return
    let cancelled = false
    fetch(`/${mdFile}`)
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
  }, [mdFile])

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

function TrackerView({ student, course, isDAD }) {
  const { arc, setArc, clearArc, getDay, setCompleted, addNote } = useTrackerData(student.slug, course.defaultArc)
  const { days: flatDays, error } = useCoursework(course.mdFile)
  const { manifest, upload, remove } = useAssets(student.slug)

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
        student={student}
        course={course}
        arc={arc}
        isDAD={isDAD}
        completed={completedTop}
        total={totalTop}
        onChangeArc={!isDAD && arc && !course.defaultArc ? handleChangeArc : undefined}
        extraNav={
          isDAD && (
            <Link
              to={`/${student.slug}/dad/files`}
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
                  student={student}
                  course={course}
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

function FilesViewRoute({ student, course }) {
  const { arc } = useTrackerData(student.slug, course.defaultArc)
  const { days: flatDays, error } = useCoursework(course.mdFile)
  const { manifest, upload, remove } = useAssets(student.slug)
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
      <Header student={student} course={course} arc={arc} isDAD={true} completed={0} total={totalTop} />
      <FilesView tree={tree} manifest={manifest} onUpload={upload} onRemove={remove} />
    </>
  )
}

function StudentRoute({ render }) {
  const { studentSlug } = useParams()
  const location = useLocation()
  const student = getStudent(studentSlug)

  if (!student) return <Splash />

  const course = student.courses[0]
  const isDAD = location.pathname.includes('/dad')

  // Set browser tab title from the student's course
  useEffect(() => {
    document.title = `${student.name} — ${course.title}`
  }, [student.name, course.title])

  return render({ student: { ...student, slug: studentSlug }, course, isDAD })
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/session" element={<SessionView />} />
      <Route path="/:studentSlug/interview" element={<InterviewView />} />
      <Route path="/:studentSlug/session" element={<SessionView />} />
      <Route
        path="/:studentSlug/dad/files"
        element={<StudentRoute render={(p) => <FilesViewRoute {...p} />} />}
      />
      <Route
        path="/:studentSlug/dad"
        element={<StudentRoute render={(p) => <TrackerView {...p} />} />}
      />
      <Route
        path="/:studentSlug"
        element={<StudentRoute render={(p) => <TrackerView {...p} />} />}
      />
      <Route path="*" element={<Splash />} />
    </Routes>
  )
}
