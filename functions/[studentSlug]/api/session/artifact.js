// POST /<studentSlug>/api/session/artifact   body: { id, content, day?: "1" }
// Stores LEARNER-authored artifact content into the server session (grammar
// contract §2: this is the only write path into session.artifacts — the model
// never writes here). Returns the gate state so the client can show progress
// toward "real enough to count."

import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import { getSessionPack, isArtifactSatisfied, loadLesson, saveLesson } from '../../../_session.js'

const MAX_ARTIFACT_CHARS = 100_000

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
  const pack = getSessionPack(course.slug, dayId)
  if (!pack) return errorResponse('No session configured for this day', 404)

  const id = String(body?.id || '')
  const gate = pack.artifacts?.[id]
  if (!gate) return errorResponse(`Unknown artifact "${id}"`, 400)

  const content = typeof body?.content === 'string' ? body.content : null
  if (content === null) return errorResponse('content must be a string')
  if (content.length > MAX_ARTIFACT_CHARS) return errorResponse('Artifact too large', 413)

  const session = await loadLesson(env, studentSlug, course.slug, dayId)
  if (!session || session.v !== 2) {
    return errorResponse('No session in progress — start one first.', 404)
  }
  if (session.completed) return errorResponse('This session is already complete.', 409)

  const prev = session.artifacts[id]
  const now = new Date().toISOString()
  // A no-op save must NOT count as a learner edit (gate layer b reads ordering).
  const changed = !prev || prev.content !== content
  session.artifacts[id] = {
    ...(prev || {}),
    content,
    title: gate.title,
    format: gate.format,
    updatedAt: now,
    by: 'learner',
    lastLearnerEditAt: changed ? now : (prev?.lastLearnerEditAt ?? null),
    lastDirectorWriteAt: prev?.lastDirectorWriteAt ?? null,
    directorDraft: prev?.directorDraft ?? null,
    ...(changed ? { verifier: null } : {}), // content changed → stale verdict
    history: changed
      ? [...(prev?.history || []), { by: 'learner', at: now, chars: content.trim().length }].slice(-30)
      : prev?.history || [],
  }
  await saveLesson(env, session)

  return jsonResponse({
    ok: true,
    id,
    chars: content.trim().length,
    minChars: gate.minChars,
    satisfied: isArtifactSatisfied(pack, session.artifacts, id),
  })
}
