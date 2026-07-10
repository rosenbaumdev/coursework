// POST /<studentSlug>/api/session/glance   body: { day?: "2", tail: "<terminal output>" }
//   -> { salient: boolean, kind: "activity"|"error"|"none", oneLine: string }
//
// The Observer's endpoint. Fired by the client when a chunk of terminal work LANDS (the
// LiveTerminal settle detector) — NOT on every repaint. It runs a cheap Haiku pass that
// (1) rewrites the rolling "terminal situation" summary the Director reads on every turn,
// and (2) judges whether this moment is worth the Director speaking to. If salient, the
// CLIENT then fires the normal proactive Director turn with the returned one-liner.
//
// Deliberately isolated from the session object: it writes ONLY the separate glance R2
// object (see saveGlance), so it can never clobber a concurrent Director turn's session
// write. Fail-open in every branch — a glance that can't run just means no proactive nudge
// this moment; the build is unaffected. Only runs on live-workshop days.

import { jsonResponse, errorResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import {
  getSessionPack,
  personalizePack,
  hasLiveWorkshop,
  loadLesson,
  loadGlance,
  saveGlance,
  runObserver,
} from '../../../_session.js'

const QUIET = { salient: false, kind: 'none', oneLine: '' }

export async function onRequestPost({ params, env, request }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  let body = {}
  try { body = await request.json() } catch { /* empty ok */ }
  const dayId = String(body?.day ?? '1')
  const tail = String(body?.tail || '')

  const pack = personalizePack(getSessionPack(course.slug, dayId), student)
  // No workshop today, or nothing to look at → nothing for the Observer to do.
  if (!pack || !hasLiveWorkshop(pack) || !tail.trim()) return jsonResponse(QUIET)

  // The session must be live for a proactive turn to make sense — but we DON'T touch it.
  const session = await loadLesson(env, studentSlug, course.slug, dayId)
  if (!session || session.v !== 2 || session.completed) return jsonResponse(QUIET)

  try {
    const prior = await loadGlance(env, studentSlug, course.slug, dayId)
    const result = await runObserver(env, {
      priorSituation: prior?.situation || '',
      tail,
      studentName: session.studentName,
    })
    // Persist the refreshed situation (own object — no session contention).
    await saveGlance(env, studentSlug, course.slug, dayId, result.situation)
    return jsonResponse({ salient: result.salient, kind: result.kind, oneLine: result.oneLine })
  } catch {
    return jsonResponse(QUIET)
  }
}
