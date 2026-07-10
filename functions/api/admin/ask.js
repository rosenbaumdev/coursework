// POST /api/admin/ask  { slug, question, courseSlug? } → an AI answer about ONE learner,
// grounded ONLY in their stored session data (progress, transcripts, parking-lot feedback,
// the Observer's terminal read). Admin only, read-only. For "is Zachary stuck on sizing?",
// "summarize his Day-2 build", etc.
import { requireAdmin } from '../../_access.js'
import { jsonResponse, errorResponse } from '../../_shared.js'
import { getStudent, getCourse } from '../../_students.js'
import { loadLesson, loadGlance, SESSION_MODEL, SESSION_EFFORT } from '../../_session.js'
import { getSessionPack, progressInfo, renderObjectiveBoard } from '../../_sessionPacks.js'
import { callAnthropic } from '../../_turnCore.js'

const MAX_CONTEXT_CHARS = 40_000
const MAX_TURN_CHARS = 700

export async function onRequestPost({ request, env }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked

  const body = await request.json().catch(() => ({}))
  const slug = body?.slug
  // Multi-turn: accept a full chat history (messages), or a single question (back-compat).
  const messages = Array.isArray(body?.messages)
    ? body.messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: m.content }))
    : body?.question
    ? [{ role: 'user', content: String(body.question) }]
    : []
  if (!slug || !messages.length) return errorResponse('slug and messages (or question) required', 400)
  if (messages[messages.length - 1].role !== 'user') return errorResponse('last message must be from the admin', 400)
  const student = getStudent(slug)
  if (!student) return errorResponse('Unknown learner', 404)
  const courseSlug = body?.courseSlug || getCourse(slug)?.slug
  if (!courseSlug) return errorResponse('Learner has no course', 404)

  // Enumerate + read the learner's day lessons.
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
  dayIds.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))

  const blocks = []
  for (const dayId of dayIds) {
    const lesson = await loadLesson(env, slug, courseSlug, dayId)
    if (!lesson) continue
    const pack = getSessionPack(courseSlug, dayId)
    const prog = pack ? progressInfo(pack, lesson.inventoryState) : { ticked: 0, totalRequired: 0 }
    const glance = await loadGlance(env, slug, courseSlug, dayId)
    const status = lesson.completed
      ? lesson.endedIncomplete
        ? ' — CLOSED (ended early, required objectives unfinished)'
        : lesson.signedOff
        ? ' — COMPLETED (signed off)'
        : ' — COMPLETED'
      : ''
    const lines = [
      `### Day ${dayId} — ${lesson.dayTitle || pack?.title || ''}`,
      `progress: ${prog.ticked}/${prog.totalRequired} required objectives${status}`,
    ]
    // The full objective board (every objective + tick state) so answers can enumerate
    // exactly what was/wasn't done — otherwise the model only sees the "X/Y" number.
    if (pack) lines.push('', renderObjectiveBoard(pack, lesson.inventoryState), '')
    if (glance?.situation) lines.push(`terminal read: ${glance.situation}`)
    if (lesson.parkingLot?.length) {
      lines.push('parking lot / feedback:')
      for (const p of lesson.parkingLot) lines.push(`  - ${p.note || JSON.stringify(p)}`)
    }
    lines.push('transcript:')
    for (const h of lesson.history || []) {
      const who = h.role === 'user' ? 'LEARNER' : h.role === 'assistant' ? 'DIRECTOR' : h.role.toUpperCase()
      lines.push(`  ${who}: ${String(h.content || '').slice(0, MAX_TURN_CHARS)}`)
    }
    blocks.push(lines.join('\n'))
  }

  let context = blocks.join('\n\n')
  if (context.length > MAX_CONTEXT_CHARS) context = context.slice(-MAX_CONTEXT_CHARS) // keep most-recent
  if (!context) context = '(No stored session data for this learner yet.)'

  const system =
    `You are an assistant helping the course INSTRUCTOR review a single learner's progress. ` +
    `Answer ONLY from the provided session data below — do not invent facts. Be concise, specific, ` +
    `and cite the day and quote briefly when useful. If the data doesn't answer the question, say so.\n\n` +
    `LEARNER: ${student.name} (${slug}), course "${courseSlug}".\n\n` +
    `=== SESSION DATA ===\n${context}`

  let answer
  try {
    answer = await callAnthropic(env, {
      model: SESSION_MODEL,
      effort: SESSION_EFFORT,
      max_tokens: 900,
      system,
      messages,
    })
  } catch (err) {
    return errorResponse(`Model call failed: ${err.message}`, 502)
  }
  return jsonResponse({ answer, days: dayIds.length })
}
