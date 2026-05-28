import { useCallback, useEffect, useState } from 'react'

export function useAssets() {
  const [manifest, setManifest] = useState({})
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/assets')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setManifest(await r.json())
      setError(null)
    } catch (e) {
      setError(e.message || 'Failed to load assets')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = useCallback(
    async (dayId, category, file) => {
      const fd = new FormData()
      fd.append('category', category)
      fd.append('file', file)
      const r = await fetch(`/api/assets/${encodeURIComponent(dayId)}`, {
        method: 'POST',
        body: fd,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `Upload failed (${r.status})`)
      await refresh()
      return data
    },
    [refresh],
  )

  const remove = useCallback(
    async (dayId, category, filename) => {
      const r = await fetch(
        `/api/assets/${encodeURIComponent(dayId)}/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`,
        { method: 'DELETE' },
      )
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error || `Delete failed (${r.status})`)
      }
      await refresh()
    },
    [refresh],
  )

  return { manifest, error, refresh, upload, remove }
}
