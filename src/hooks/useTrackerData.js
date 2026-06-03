import { useCallback, useEffect, useState } from 'react'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function defaultDay() {
  return { completed: false, completedAt: null, notes: [] }
}

// Tracker state namespaced per student so multiple students sharing a
// browser don't collide. Keys: `${studentSlug}.arc`, `${studentSlug}.days`.
export function useTrackerData(studentSlug) {
  const arcKey = `${studentSlug}.arc`
  const daysKey = `${studentSlug}.days`

  const [arc, setArcState] = useState(() => localStorage.getItem(arcKey) || null)
  const [days, setDays] = useState(() => readJSON(daysKey, {}))

  useEffect(() => {
    if (arc) localStorage.setItem(arcKey, arc)
  }, [arc, arcKey])

  useEffect(() => {
    writeJSON(daysKey, days)
  }, [days, daysKey])

  const setArc = useCallback((next) => setArcState(next), [])

  const clearArc = useCallback(() => {
    localStorage.removeItem(arcKey)
    setArcState(null)
  }, [arcKey])

  const getDay = useCallback((id) => days[id] || defaultDay(), [days])

  const setCompleted = useCallback((id, completed) => {
    setDays((prev) => {
      const existing = prev[id] || defaultDay()
      return {
        ...prev,
        [String(id)]: {
          ...existing,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        },
      }
    })
  }, [])

  const addNote = useCallback((id, author, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setDays((prev) => {
      const existing = prev[id] || defaultDay()
      const note = {
        id: crypto.randomUUID(),
        author,
        timestamp: new Date().toISOString(),
        text: trimmed,
      }
      return {
        ...prev,
        [String(id)]: {
          ...existing,
          notes: [...existing.notes, note],
        },
      }
    })
  }, [])

  return { arc, setArc, clearArc, days, getDay, setCompleted, addNote }
}
