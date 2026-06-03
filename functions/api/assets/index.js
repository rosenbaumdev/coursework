// GET /api/assets — manifest of uploaded files grouped by day → category.
// Reads R2 listing and reconstructs the shape the old Express endpoint returned.

import {
  CATEGORIES,
  DAY_ID_RE,
  fileUrl,
  jsonResponse,
  rawUrl,
} from '../../_shared.js'

export async function onRequestGet({ env }) {
  const manifest = {}
  let cursor = undefined

  do {
    const result = await env.STORAGE.list({
      prefix: 'day-',
      cursor,
      include: ['customMetadata'],
    })
    for (const obj of result.objects) {
      // Key shape: day-<id>/<category>/<filename>
      const parts = obj.key.split('/')
      if (parts.length !== 3) continue
      const dayPart = parts[0]
      const category = parts[1]
      const filename = parts[2]
      if (!dayPart.startsWith('day-')) continue
      const dayId = dayPart.slice(4)
      if (!DAY_ID_RE.test(dayId)) continue
      if (!CATEGORIES.includes(category)) continue
      if (!filename) continue

      const entry = {
        name: filename,
        url: fileUrl(dayId, category, filename),
        size: obj.size,
        modified: obj.uploaded.toISOString(),
      }

      if (category === 'claude-prompt') {
        const meta = obj.customMetadata || {}
        if (meta.mirror_status) {
          entry.mirror = {
            url: rawUrl(env, dayId, filename),
            status: meta.mirror_status,
            syncedAt: meta.mirror_synced_at || null,
            error: meta.mirror_error || null,
          }
        }
      }

      if (!manifest[dayId]) manifest[dayId] = {}
      if (!manifest[dayId][category]) manifest[dayId][category] = []
      manifest[dayId][category].push(entry)
    }
    cursor = result.truncated ? result.cursor : undefined
  } while (cursor)

  for (const day of Object.values(manifest)) {
    for (const cat of Object.keys(day)) {
      day[cat].sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  return jsonResponse(manifest)
}
