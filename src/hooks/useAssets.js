import { useCallback, useEffect, useState } from 'react'

// All asset endpoints live under /<studentSlug>/api/assets and /<studentSlug>/files/*
export function useAssets(studentSlug) {
  const [manifest, setManifest] = useState({})
  const [error, setError] = useState(null)

  const base = `/${studentSlug}/api/assets`

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(base)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setManifest(await r.json())
      setError(null)
    } catch (e) {
      setError(e.message || 'Failed to load assets')
    }
  }, [base])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = useCallback(
    async (dayId, category, file) => {
      const fd = new FormData()
      fd.append('category', category)
      fd.append('file', file)
      const r = await fetch(`${base}/${encodeURIComponent(dayId)}`, {
        method: 'POST',
        body: fd,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `Upload failed (${r.status})`)
      await refresh()
      return data
    },
    [base, refresh],
  )

  const remove = useCallback(
    async (dayId, category, filename) => {
      const r = await fetch(
        `${base}/${encodeURIComponent(dayId)}/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`,
        { method: 'DELETE' },
      )
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error || `Delete failed (${r.status})`)
      }
      await refresh()
    },
    [base, refresh],
  )

  return { manifest, error, refresh, upload, remove }
}
