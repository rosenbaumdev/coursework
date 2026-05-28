// Shared constants + helpers for Pages Functions.
// Files prefixed with _ are not exposed as routes.

export const CATEGORIES = ['podcast', 'deck-pdf', 'deck-pptx', 'claude-prompt', 'other']

export const CATEGORY_EXTS = {
  podcast: ['mp3', 'm4a', 'wav', 'ogg', 'aac'],
  'deck-pdf': ['pdf'],
  'deck-pptx': ['pptx', 'ppt', 'key'],
  'claude-prompt': ['md', 'txt'],
  other: null,
}

export const DAY_ID_RE = /^\d+(\.\d+)?$/
export const SAFE_NAME_RE = /^[^/\\]+$/

export const GITHUB_OWNER = 'rosenbaumdev'
export const GITHUB_REPO = 'coursework'
export const GITHUB_BRANCH = 'main'
export const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`

export function sanitizeFilename(name) {
  return name
    .replace(/^[.]+/, '')
    .replace(/[/\\ -]/g, '_')
    .slice(0, 200)
}

export function fileExt(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

export function r2Key(dayId, category, filename) {
  return `day-${dayId}/${category}/${filename}`
}

export function fileUrl(dayId, category, filename) {
  return `/files/day-${dayId}/${category}/${encodeURIComponent(filename)}`
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status)
}
