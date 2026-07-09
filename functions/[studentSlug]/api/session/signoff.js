// POST /<studentSlug>/api/session/signoff   body: { day?: "2" }
// The learner confirms they're happy with the shipped game — the FINAL, mandatory act
// of a requiresShip day (#9). It flips session.signedOff and finalizes completion, so
// the class ends on a delivered, signed-off artifact rather than trailing off. Requires
// a prior /ship (session.shipped) — you can't sign off on nothing.

import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import { loadLesson, saveLesson } from '../../../_session.js'

export async function onRequestPost({ params, env, request }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  let body = {}
  try { body = await request.json() } catch { /* empty body ok */ }
  const dayId = String(body?.day ?? '1')

  const session = await loadLesson(env, studentSlug, course.slug, dayId)
  if (!session || session.v !== 2) return errorResponse('No session in progress.', 404)
  if (!session.shipped) return errorResponse('Ship your game first, then sign off.', 409)

  session.signedOff = true
  if (!session.completed) {
    session.completed = true
    session.endedAt = new Date().toISOString()
  }
  await saveLesson(env, session)

  return jsonResponse({ sessionDone: true, url: session.shippedUrl })
}
