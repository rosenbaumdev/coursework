// POST /<studentSlug>/api/interview/start
// Creates (or resumes) the ingestion-interview session for this student×course.
// The session is keyed by student×course in the private INTERVIEW bucket, so:
//   - a page refresh resumes the same conversation (no lost state),
//   - a completed profile blocks a fresh re-run (one-and-done per course),
//   - taking a different course later starts a clean interview + profile.

import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import {
  getPack,
  progressInfo,
  buildBaseSystemPrompt,
  buildEnvelope,
  parseTurn,
  resolveChips,
  looksAnswerable,
  ensureQuestion,
  applyTurnEffects,
  callAnthropic,
  loadSession,
  saveSession,
  newSession,
  INTERVIEW_MODEL,
  INTERVIEW_EFFORT,
} from '../../../_interview.js'

export async function onRequestPost({ params, env }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  const pack = getPack(course.slug, course.title)
  if (!pack) return errorResponse('No interview configured for this course', 404)

  const loaded = await loadSession(env, studentSlug, course.slug)

  // Only honor a session that matches the CURRENT schema. A pre-redesign or
  // otherwise malformed session (no inventoryState map) is ignored and
  // overwritten by the fresh start below — never resumed (it would crash the
  // inventory helpers) and never treated as a completed one-and-done.
  const existing =
    loaded && loaded.inventoryState && typeof loaded.inventoryState === 'object'
      ? loaded
      : null

  // One-and-done per course: a finished interview can't be re-run from here.
  if (existing && existing.completed) {
    return jsonResponse(
      { error: 'This interview is already complete.', completed: true },
      409
    )
  }

  // Resume an in-progress session — rehydrate the UI with the full history and
  // the multichoice chips from the last assistant turn (else they vanish on reload).
  if (existing) {
    return jsonResponse({
      resumed: true,
      messages: existing.history,
      suggestions: existing.lastSuggestions || [],
      interviewDone: false,
      ...progressInfo(pack, existing.inventoryState),
    })
  }

  // Fresh start: first interviewer turn opens on the orientation objective.
  const session = newSession(student, course, studentSlug, pack)
  const baseSystem = buildBaseSystemPrompt(pack, session.studentName)
  const fullSystem = `${baseSystem}\n\n${buildEnvelope(session, pack)}`

  let rawText
  try {
    rawText = await callAnthropic(env, {
      model: INTERVIEW_MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      effort: INTERVIEW_EFFORT,
      system: fullSystem,
      messages: [
        {
          role: 'user',
          content:
            '[Interview session starting now. Open with your current focus objective per the envelope.]',
        },
      ],
    })
  } catch (err) {
    return errorResponse(`Failed to start interview: ${err.message}`, 502)
  }

  const parsed = parseTurn(rawText)
  let cleanText = parsed.cleanText
  const { ticks, tables, suggestions: tagSuggestions } = parsed

  applyTurnEffects(session, pack, { ticks, tables }, 0)

  // Backstop: the opener must end with something to answer (else the student
  // stares at a wall). Append the next question if it trailed off.
  if (!looksAnswerable(cleanText)) {
    const q = await ensureQuestion(env, session, pack, cleanText)
    if (q) cleanText += `\n\n${q}`
  }

  const suggestions = await resolveChips(env, {
    tagSuggestions,
    cleanText,
    studentName: session.studentName,
  })

  session.history.push({ role: 'assistant', content: cleanText })
  session.lastSuggestions = suggestions
  session.transcriptLog.push({
    role: 'assistant',
    raw: rawText,
    ticks,
    tables,
    ts: new Date().toISOString(),
  })
  await saveSession(env, session)

  return jsonResponse({
    resumed: false,
    messages: [{ role: 'assistant', content: cleanText }],
    suggestions,
    interviewDone: false,
    ...progressInfo(pack, session.inventoryState),
  })
}
