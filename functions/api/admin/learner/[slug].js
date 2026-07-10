// GET /api/admin/learner/:slug → one learner's per-day progress + full transcripts.
// Admin only. Data-driven: enumerates whatever day lessons exist in R2 for their course.
import { requireAdmin, loadGrants, saveGrants } from '../../../_access.js'
import { jsonResponse, errorResponse } from '../../../_shared.js'
import { STUDENTS, getStudent, getCourse, loadRegistry, saveRegistry } from '../../../_students.js'
import { loadLesson, loadGlance } from '../../../_session.js'
import { getSessionPack, progressInfo, objectiveBoardData } from '../../../_sessionPacks.js'
import { provisionState, enqueueProvision, VM_USER_RE, reconcileStatus, isTerminalStatus } from '../../../_provision.js'

// POST /api/admin/learner/:slug  { name?, email?, status?, nickname?, pronouns? } → edit
// mutable learner fields. nickname/pronouns control how the course ADDRESSES the learner
// (name a course speaks + neutral-by-default pronouns) — never assumed, only set here.
// Writes a registry override (works for code-seed learners too; the seed still provides the
// course/workshop config). Admin only.
const EDITABLE = ['name', 'email', 'status', 'nickname', 'pronouns']
const PRONOUN_KEYS = new Set(['he', 'she', 'they'])
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
    if (typeof body[k] === 'string') {
      const v = body[k].trim()
      // nickname/pronouns are clearable (empty string removes the override); name/email/status stay required.
      if (!v && (k === 'nickname' || k === 'pronouns')) {
        if (entry[k] != null) { delete entry[k]; changed = true }
        continue
      }
      if (!v) continue
      if (k === 'pronouns') {
        const p = v.toLowerCase()
        if (!PRONOUN_KEYS.has(p)) return errorResponse('pronouns must be one of: he, she, they', 400)
        entry[k] = p
      } else {
        entry[k] = v
      }
      changed = true
    }
  }
  if (!changed) return errorResponse('No editable fields provided', 400)
  registry[slug] = entry
  await saveRegistry(env, registry)
  return jsonResponse({ ok: true, slug, applied: Object.fromEntries(EDITABLE.filter((k) => entry[k] != null).map((k) => [k, entry[k]])) })
}

// DELETE /api/admin/learner/:slug → fully remove a registry learner: wipe the VM account,
// drop the registry entry, and revoke the access grant. Code-seed learners
// (jordan/zachary/…) are permanent and cannot be deleted here. Admin only.
export async function onRequestDelete({ request, env, params }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked
  const slug = params.slug
  if (STUDENTS[slug]) return errorResponse('built-in learner cannot be deleted', 409)

  const registry = await loadRegistry(env)
  const entry = registry[slug]
  if (!entry) return errorResponse('Unknown learner', 404)

  // Tear down the isolated VM account (home wiped) if one was provisioned.
  const vmUser = entry.workshop?.user
  if (vmUser && VM_USER_RE.test(vmUser)) {
    await enqueueProvision(env, slug, 'deprovision', { user: vmUser, wipe: true })
  }

  // Revoke the email → slug access grant.
  if (entry.email) {
    const grants = await loadGrants(env, { fresh: true })
    const email = String(entry.email).toLowerCase()
    if (Array.isArray(grants.grants[email])) {
      grants.grants[email] = grants.grants[email].filter((s) => s !== slug)
      if (grants.grants[email].length === 0) delete grants.grants[email]
      await saveGrants(env, grants)
    }
  }

  // Drop the learner from the registry (getStudent stops resolving the slug next prime).
  delete registry[slug]
  await saveRegistry(env, registry)

  return jsonResponse({ ok: true, slug, deprovisioned: Boolean(vmUser) })
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
      totalObjectives: pack ? pack.objectives.length : prog.totalRequired,
      focus: prog.focus,
      seq: lesson.seq || 0,
      completed: Boolean(lesson.completed),
      endedIncomplete: Boolean(lesson.endedIncomplete),
      signedOff: Boolean(lesson.signedOff),
      objectives: pack ? objectiveBoardData(pack, lesson.inventoryState) : [],
      updatedAt: lesson.updatedAt || null,
      parkingLot: lesson.parkingLot || [],
      situation: glance?.situation || null,
      transcript: (lesson.history || []).map((h) => ({ role: h.role, content: h.content })),
    })
  }
  days.sort((a, b) => String(a.dayId).localeCompare(String(b.dayId), undefined, { numeric: true }))

  // Reconcile the displayed status from the daemon's result (the daemon never writes the
  // registry). Self-heal: persist a resolved terminal status back so the roster reflects it.
  const provision = await provisionState(env, slug)
  const storedStatus = student.status || 'active'
  const status = reconcileStatus(student, provision.status, provision.queued)
  if (isTerminalStatus(status) && status !== storedStatus) {
    const registry = await loadRegistry(env)
    if (registry[slug]) {
      registry[slug] = { ...registry[slug], status }
      await saveRegistry(env, registry)
    }
  }

  return jsonResponse({
    slug,
    name: student.name,
    nickname: student.nickname || null,
    pronouns: student.pronouns || null,
    email: student.email || null,
    courseSlug,
    courseTitle: course?.title || null,
    workshopUser: student.workshop?.user || null,
    status,
    fromRegistry: Boolean(student.fromRegistry),
    dev: Boolean(student.dev),
    provision,
    days,
  })
}
