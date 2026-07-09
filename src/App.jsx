import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Header from './components/Header.jsx'
import ArcSelector from './components/ArcSelector.jsx'
import DayCard from './components/DayCard.jsx'
import FilesView from './components/FilesView.jsx'
import InterviewView from './components/InterviewView.jsx'
import SessionView from './components/session/SessionView.jsx'
import TerminalCanvas from './components/session/canvas/TerminalCanvas.jsx'
import ContentCanvas from './components/session/ContentCanvas.jsx'
import SplitPane from './components/session/SplitPane.jsx'
import { describeCanvas } from './session/describeCanvas.js'
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

// Observability demo: /termtest?url=<tunnel>&token=<t> → live droplet terminal on the
// left, and on the right the EXACT string describeCanvas() feeds the Director as
// `canvasLiveState`. Type commands; watch what the Director would observe update live.
function TermTest() {
  const q = new URLSearchParams(useLocation().search)
  const url = q.get('url')
  const token = q.get('token')
  const [liveState, setLiveState] = useState(null)
  if (!url) return <div className="p-8 font-mono text-sm">Add ?url=&lt;tunnel&gt;&amp;token=&lt;t&gt; to the URL.</div>
  const directorSees = describeCanvas(
    { type: 'terminal', title: 'the workshop', payload: { mode: 'live' } },
    liveState,
  )
  return (
    <div className="h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-[#0b0b0b]">
      <div className="min-h-0 border-r border-[#2a2a2a]">
        <TerminalCanvas
          payload={{ mode: 'live', wsUrl: url, token, label: 'coursework-vm — live PTY' }}
          onLiveState={setLiveState}
        />
      </div>
      <div className="min-h-0 flex flex-col p-4 gap-2 overflow-hidden">
        <div className="font-mono text-[11px] uppercase tracking-wide text-[#7dd3fc]">
          What the Director observes (live) · describeCanvas → canvasLiveState
        </div>
        <pre className="flex-1 min-h-0 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#cbd5e1] bg-[#111] rounded-lg border border-[#2a2a2a] p-3">
{directorSees}
        </pre>
        <div className="font-mono text-[10px] text-[#64748b]">
          This is the real describeCanvas() output — the exact context the session engine sends to the Director each turn.
        </div>
      </div>
    </div>
  )
}

// Demo: /workshop?url=<tunnel>&token=<t>&viewer=<appUrl> → the 3-pane IDE presented
// through the REAL coursework shell (SplitPane + light look), chat stubbed.
function WorkshopTest() {
  const q = new URLSearchParams(useLocation().search)
  const url = q.get('url')
  const token = q.get('token')
  const viewer = q.get('viewer')
  const [liveState, setLiveState] = useState(null)
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia('(max-width:767px)').matches)
  const [activeTab, setActiveTab] = useState('canvas')
  const [selecting, setSelecting] = useState(false)
  const [pinnedRect, setPinnedRect] = useState(null)
  const [pointed, setPointed] = useState(null)
  const [ratio, setRatio] = useState(() => {
    const v = parseFloat(localStorage.getItem('demo:workshop:ratio'))
    return Number.isFinite(v) ? v : 0.62
  })
  useEffect(() => {
    const mq = window.matchMedia('(max-width:767px)')
    const on = () => setIsNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  if (!url) return <div className="p-8 font-mono text-sm">Add ?url=&lt;tunnel&gt;&amp;token=&lt;t&gt;&amp;viewer=&lt;appUrl&gt;</div>

  function handleSelect({ rectPct, text }) {
    setPinnedRect(rectPct)
    setSelecting(false)
    setPointed(text || '(a region of the workshop — no readable text there)')
  }

  const canvasPane = (
    <ContentCanvas
      directive={{
        type: 'workshop',
        id: 'workshop',
        title: 'Your workshop',
        payload: { mode: 'live', wsUrl: url, token, viewerUrl: viewer, label: 'coursework-vm — your machine' },
      }}
      selecting={selecting}
      onToggleSelect={() => setSelecting((s) => !s)}
      onSelect={handleSelect}
      onLiveState={setLiveState}
      pinnedRect={pinnedRect}
    />
  )
  const chatPane = (
    <div className="h-full min-h-0 flex flex-col bg-paper">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-3">
        <div className="text-[11px] font-mono uppercase tracking-wide text-accent">Instructor</div>
        <div className="rounded-2xl rounded-tl-sm border border-rule bg-white px-4 py-3 text-[14px] leading-relaxed text-ink shadow-card">
          Alright — this is your <strong>workshop</strong>. The terminal up top is your own machine. The panel below shows whatever you build, live.
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-rule bg-white px-4 py-3 text-[14px] leading-relaxed text-ink shadow-card">
          Try it: type <code className="font-mono text-[13px] text-accent">cd ~/app</code>, then <code className="font-mono text-[13px] text-accent">claude</code>, and tell it what to build. Hit <strong>↻ reload</strong> and watch your game appear.
        </div>
        {pointed && (
          <div className="rounded-2xl rounded-tr-sm border border-accent/30 bg-accent/5 px-4 py-3 ml-6">
            <div className="text-[10px] font-mono uppercase tracking-wide text-accent mb-1">You pointed at ◲</div>
            <div className="text-[13px] leading-relaxed text-ink break-words">“{pointed}”</div>
            <div className="text-[11px] text-muted mt-1">In the real session this quotes into your question to the Director.</div>
          </div>
        )}
        <p className="text-[12px] text-muted pt-1">Preview — the real session puts the live Director here. Hit <strong>◲ Point</strong> (top-right of the workshop) to marquee-select a region and ask about it.</p>
      </div>
      <details className="shrink-0 border-t border-rule bg-white/60">
        <summary className="cursor-pointer select-none px-4 py-2 text-[11px] font-mono uppercase tracking-wide text-muted">What the Director observes ▾</summary>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words px-4 pb-3 text-[12px] leading-relaxed text-muted">
{describeCanvas({ type: 'workshop', title: 'the workshop', payload: { mode: 'live', viewerUrl: viewer } }, liveState)}
        </pre>
      </details>
    </div>
  )

  return (
    <div className="relative h-[100dvh] flex flex-col overflow-hidden bg-paper">
      <div className="shrink-0 border-b border-rule bg-white flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
        <span className="text-[14px] font-semibold text-ink">Day 2 — The Keys to the Kingdom</span>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent">IDE preview</span>
      </div>
      {isNarrow && (
        <div className="shrink-0 flex border-b border-rule bg-white">
          {['canvas', 'chat'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-[13px] font-medium ${activeTab === t ? 'text-accent border-b-2 border-accent' : 'text-muted'}`}
            >
              {t === 'canvas' ? 'Workshop' : 'Chat'}
            </button>
          ))}
        </div>
      )}
      <SplitPane
        orientation="lr"
        isNarrow={isNarrow}
        activeTab={activeTab}
        hasCanvas={true}
        ratio={ratio}
        onRatioChange={setRatio}
        onRatioCommit={(r) => { setRatio(r); localStorage.setItem('demo:workshop:ratio', String(r)) }}
        canvas={canvasPane}
        chat={chatPane}
      />
    </div>
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
      <Route path="/termtest" element={<TermTest />} />
      <Route path="/workshop" element={<WorkshopTest />} />
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
