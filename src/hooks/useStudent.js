import { useEffect, useState } from 'react'
import { getStudent } from '../students.js'

// Resolve a learner by slug. Code-seed learners are in the static client bundle (instant);
// registry-invited learners are NOT, so fall back to GET /<slug>/api/student (the server knows
// them via the registry overlay). Returns { student, loading } — render a loader while loading,
// then Splash if student is null (genuinely unknown slug).
export function useStudent(studentSlug) {
  const staticStudent = getStudent(studentSlug)
  const [student, setStudent] = useState(staticStudent || null)
  const [loading, setLoading] = useState(!staticStudent && Boolean(studentSlug))

  useEffect(() => {
    if (staticStudent) { setStudent(staticStudent); setLoading(false); return }
    if (!studentSlug) { setStudent(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(`/${studentSlug}/api/student`, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setStudent(data && data.courses?.length ? data : null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setStudent(null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [studentSlug, staticStudent])

  return { student, loading }
}
