// Shared constants + helpers for Pages Functions. Files prefixed with _ are
// not exposed as routes.

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

// R2 key under the course's prefix. Jordan's prefix is empty so files live
// at day-N/... (no migration). Other courses get a folder prefix.
export function r2Key(course, dayId, category, filename) {
  return `${course.r2Prefix}day-${dayId}/${category}/${filename}`
}

export function r2ListPrefix(course) {
  return `${course.r2Prefix}day-`
}

// /files URL under the student's path.
export function fileUrl(studentSlug, dayId, category, filename) {
  return `/${studentSlug}/files/day-${dayId}/${category}/${encodeURIComponent(filename)}`
}

// GitHub raw URL for a mirrored claude-prompt file. Uses the course's mirror
// prefix so each course namespaces its mirror content in the shared repo.
export function rawUrl(course, dayId, filename) {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${course.mirrorPrefix}day-${dayId}/${filename}`
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
