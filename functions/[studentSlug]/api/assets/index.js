// GET /<studentSlug>/api/assets — manifest grouped by day → category.

import {
  CATEGORIES,
  DAY_ID_RE,
  errorResponse,
  fileUrl,
  jsonResponse,
  r2ListPrefix,
  rawUrl,
} from '../../../_shared.js'
import { getCourse } from '../../../_students.js'

export async function onRequestGet({ params, env }) {
  const { studentSlug } = params
  const course = getCourse(studentSlug)
  if (!course) return errorResponse('Unknown student', 404)

  const listPrefix = r2ListPrefix(course)
  const prefixStripLen = course.r2Prefix.length

  const manifest = {}
  let cursor = undefined

  do {
    const result = await env.STORAGE.list({
      prefix: listPrefix,
      cursor,
      include: ['customMetadata'],
    })
    for (const obj of result.objects) {
      // Strip the r2Prefix so we always parse from `day-<id>/<category>/<filename>`.
      const rel = obj.key.slice(prefixStripLen)
      const parts = rel.split('/')
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
        url: fileUrl(studentSlug, dayId, category, filename),
        size: obj.size,
        modified: obj.uploaded.toISOString(),
      }

      if (category === 'claude-prompt') {
        const meta = obj.customMetadata || {}
        if (meta.mirror_status) {
          entry.mirror = {
            url: rawUrl(course, dayId, filename),
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
