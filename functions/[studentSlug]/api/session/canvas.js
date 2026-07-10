// POST /<studentSlug>/api/session/canvas   body: { day?: "1", target }
// Read-only resolve for the Contents Menu (Build 1, self-navigation): the
// learner picks a target that isn't already cached client-side (not the live
// canvas, not in local history), and this endpoint resolves it to a full
// CanvasDirective using the session's CURRENT state — same resolver authored
// [SHOW:] targets use — WITHOUT mutating anything. Browsing is not Director
// intent: session.canvasTarget, figureState/figureInstances, figureValues,
// dynamicProgram, and seq are all left exactly as they were. No turn is
// recorded, no tick/canvas/history state on the server changes.
//
// This intentionally does the LEAST work that's correct: no new persistence,
// no new session shape, no seq bump — just a pure read + resolve over
// existing session state, reusing resolveFigureDir (_session.js) rather than
// inventing a second resolution path.

import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import { getSessionPack, personalizePack, loadLesson, resolveFigureDir, injectLiveSurfaces } from '../../../_session.js'

export async function onRequestPost({ params, env, request }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const dayId = String(body?.day ?? '1')
  const pack = personalizePack(getSessionPack(course.slug, dayId), student)
  if (!pack) return errorResponse('No session configured for this day', 404)

  const target = String(body?.target || '').trim()
  if (!target) return errorResponse('Missing target')

  const session = await loadLesson(env, studentSlug, course.slug, dayId)
  if (!session || session.v !== 2) {
    return errorResponse('No session in progress — start one first.', 404)
  }

  const directive = resolveFigureDir(pack, session, target)
  if (!directive) return errorResponse(`Unknown or unresolvable target "${target}"`, 404)

  return jsonResponse({ directive: injectLiveSurfaces(directive, env, student) })
}
