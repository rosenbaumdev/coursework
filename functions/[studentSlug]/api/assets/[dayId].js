// POST /<studentSlug>/api/assets/:dayId — multipart upload to R2.
// Body: multipart/form-data with fields "category" and "file".
// For claude-prompt category, also mirrors to GitHub via Contents API.

import {
  CATEGORIES,
  CATEGORY_EXTS,
  DAY_ID_RE,
  SAFE_NAME_RE,
  errorResponse,
  fileExt,
  fileUrl,
  jsonResponse,
  r2Key,
  rawUrl,
  sanitizeFilename,
} from '../../../_shared.js'
import { getCourse } from '../../../_students.js'
import { syncToGitHub } from '../../../_github.js'

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export async function onRequestPost({ request, params, env }) {
  const { studentSlug, dayId } = params
  const course = getCourse(studentSlug)
  if (!course) return errorResponse('Unknown student', 404)
  if (!DAY_ID_RE.test(dayId)) return errorResponse('Invalid dayId')

  let form
  try {
    form = await request.formData()
  } catch (e) {
    return errorResponse('Failed to parse multipart form')
  }

  const category = form.get('category')
  const file = form.get('file')

  if (!CATEGORIES.includes(category)) return errorResponse('Invalid category')
  if (!file || typeof file === 'string') return errorResponse('No file uploaded')
  if (file.size > MAX_SIZE) return errorResponse('File too large (max 100 MB)', 413)

  const filename = sanitizeFilename(file.name)
  if (!SAFE_NAME_RE.test(filename)) return errorResponse('Invalid filename')

  const allowed = CATEGORY_EXTS[category]
  const ext = fileExt(filename)
  if (allowed && !allowed.includes(ext)) {
    return errorResponse(`Category "${category}" only accepts: ${allowed.join(', ')}`)
  }

  const body = new Uint8Array(await file.arrayBuffer())
  const key = r2Key(course, dayId, category, filename)

  const customMetadata = {}
  let mirrorResult = null

  if (category === 'claude-prompt') {
    if (!env.GITHUB_PAT) {
      mirrorResult = { ok: false, error: 'GITHUB_PAT not configured' }
    } else {
      mirrorResult = await syncToGitHub(course, dayId, filename, body, env.GITHUB_PAT)
    }
    customMetadata.mirror_status = mirrorResult.ok ? 'synced' : 'failed'
    if (mirrorResult.syncedAt) customMetadata.mirror_synced_at = mirrorResult.syncedAt
    if (mirrorResult.error) customMetadata.mirror_error = mirrorResult.error.slice(0, 500)
  }

  await env.STORAGE.put(key, body, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
    customMetadata,
  })

  const payload = {
    ok: true,
    file: {
      name: filename,
      url: fileUrl(studentSlug, dayId, category, filename),
      size: file.size,
    },
  }

  if (mirrorResult) {
    payload.file.mirror = {
      status: mirrorResult.ok ? 'synced' : 'failed',
      syncedAt: mirrorResult.syncedAt || null,
      error: mirrorResult.error || null,
      url: mirrorResult.ok ? rawUrl(course, dayId, filename) : undefined,
    }
  }

  return jsonResponse(payload)
}
