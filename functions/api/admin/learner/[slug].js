// GET /api/admin/learner/:slug → one learner's per-day progress + full transcripts.
// Admin only. Data-driven: enumerates whatever day lessons exist in R2 for their course.
import { requireAdmin } from '../../../_access.js'
import { jsonResponse, errorResponse } from '../../../_shared.js'
import { getStudent, getCourse, loadRegistry, saveRegistry } from '../../../_students.js'
import { loadLesson, loadGlance } from '../../../_session.js'
import { getSessionPack, progressInfo } from '../../../_sessionPacks.js'
import { provisionState } from '../../../_provision.js'

// POST /api/admin/learner/:slug  { name?, email?, status? } → edit mutable learner fields.
// Writes a registry override (works for code-seed learners too; the seed still provides the
// course/workshop config). Admin only.
const EDITABLE = ['name', 'email', 'status']
export async function onRequestPost({ request, env, params }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked
  const slug = params.slug
  if (!getStudent(slug)) return errorResponse('Unknown learner', 404)
  const body = await request.json().catch(() => ({}))
  const registry = await loadRegistry(env)
  const entry = { ...(registry[slug] || {}) }
  let changed = false
  for (const k of EDITABLE) {
    if (typeof body[k] === 'string' && body[k].trim()) {
      entry[k] = body[k].trim()
      changed = true
    }
  }
  if (!changed) return errorResponse('No editable fields provided', 400)
  registry[slug] = entry
  await saveRegistry(env, registry)
  return jsonResponse({ ok: true, slug, applied: Object.fromEntries(EDITABLE.filter((k) => entry[k] != null).map((k) => [k, entry[k]])) })
}

export async function onRequestGet({ request, env, params }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked

  const slug = params.slug
  const student = getStudent(slug)
  if (!student) return errorResponse('Unknown learner', 404)
  const course = getCourse(slug)
  const courseSlug = course?.slug
  if (!courseSlug) return errorResponse('Learner has no course', 404)

  // Enumerate day lessons (skip -report.md and artifacts/ under the same prefix).
  const prefix = `lessons/${slug}/${courseSlug}/`
  const dayIds = []
  let cursor
  do {
    const res = await env.INTERVIEW.list({ prefix, cursor })
    for (const obj of res.objects) {
      const m = obj.key.match(/\/day-([^/]+)\.json$/)
      if (m) dayIds.push(m[1])
    }
    cursor = res.truncated ? res.cursor : undefined
  } while (cursor)

  const days = []
  for (const dayId of dayIds) {
    const lesson = await loadLesson(env, slug, courseSlug, dayId)
    if (!lesson) continue
    const pack = getSessionPack(courseSlug, dayId)
    const prog = pack ? progressInfo(pack, lesson.inventoryState) : { ticked: 0, totalRequired: 0, focus: '' }
    const glance = await loadGlance(env, slug, courseSlug, dayId)
    days.push({
      dayId,
      dayTitle: lesson.dayTitle || pack?.title || `Day ${dayId}`,
      ticked: prog.ticked,
      totalRequired: prog.totalRequired,
      focus: prog.focus,
      seq: lesson.seq || 0,
      completed: Boolean(lesson.completed),
      signedOff: Boolean(lesson.signedOff),
      updatedAt: lesson.updatedAt || null,
      parkingLot: lesson.parkingLot || [],
      situation: glance?.situation || null,
      transcript: (lesson.history || []).map((h) => ({ role: h.role, content: h.content })),
    })
  }
  days.sort((a, b) => String(a.dayId).localeCompare(String(b.dayId), undefined, { numeric: true }))

  return jsonResponse({
    slug,
    name: student.name,
    email: student.email || null,
    courseSlug,
    courseTitle: course?.title || null,
    workshopUser: student.workshop?.user || null,
    status: student.status || 'active',
    fromRegistry: Boolean(student.fromRegistry),
    provision: await provisionState(env, slug),
    days,
  })
}
