// DELETE /api/assets/:dayId/:category/:filename — remove from R2.
// For claude-prompt category, also unmirrors from GitHub.

import {
  CATEGORIES,
  DAY_ID_RE,
  SAFE_NAME_RE,
  errorResponse,
  jsonResponse,
  r2Key,
} from '../../../../_shared.js'
import { removeFromGitHub } from '../../../../_github.js'

export async function onRequestDelete({ params, env }) {
  const { dayId, category, filename } = params

  if (!DAY_ID_RE.test(dayId)) return errorResponse('Invalid dayId')
  if (!CATEGORIES.includes(category)) return errorResponse('Invalid category')
  if (!SAFE_NAME_RE.test(filename) || filename.includes('..')) {
    return errorResponse('Invalid filename')
  }

  const key = r2Key(dayId, category, filename)
  const existing = await env.STORAGE.head(key)
  if (!existing) return errorResponse('Not found', 404)

  await env.STORAGE.delete(key)

  if (category === 'claude-prompt' && env.GITHUB_PAT) {
    await removeFromGitHub(dayId, filename, env.GITHUB_PAT)
  }

  return jsonResponse({ ok: true })
}
