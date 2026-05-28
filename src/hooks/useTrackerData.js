import { useCallback, useEffect, useState } from 'react'

const ARC_KEY = 'arc'
const DAYS_KEY = 'days'

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

export function useTrackerData() {
  const [arc, setArcState] = useState(() => localStorage.getItem(ARC_KEY) || null)
  const [days, setDays] = useState(() => readJSON(DAYS_KEY, {}))

  useEffect(() => {
    if (arc) localStorage.setItem(ARC_KEY, arc)
  }, [arc])

  useEffect(() => {
    writeJSON(DAYS_KEY, days)
  }, [days])

  const setArc = useCallback((next) => setArcState(next), [])

  const clearArc = useCallback(() => {
    localStorage.removeItem(ARC_KEY)
    setArcState(null)
  }, [])

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
