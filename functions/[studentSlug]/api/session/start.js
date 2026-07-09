// POST /<studentSlug>/api/session/start   body: { day?: "1", reset?: boolean, stream?: boolean }
// Creates (or resumes) the lesson session for this student×course×day. Session
// state lives server-side in the private INTERVIEW bucket (R2) — the client is
// a renderer, not the owner. `reset:true` wipes the day and starts fresh (test
// affordance; a legitimate learner start-over is also explicit).
//
// A FRESH start with `stream:true` streams the opener as SSE (delta frames with
// the control-tag guard, then a `done` frame carrying the full start payload) so
// the first thing the learner sees types out like every other turn. Resume — and
// fresh without the flag — returns plain JSON.

import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import {
  parseTurn,
  applyTurnEffects,
  safeEmitLen,
  callAnthropic,
  callAnthropicStream,
  consumeAnthropicSSE,
} from '../../../_turnCore.js'
import {
  getSessionPack,
  progressInfo,
  lessonKey,
  loadLesson,
  saveLesson,
  newLesson,
  buildSessionSystemPrompt,
  buildSessionEnvelope,
  makeTickGuard,
  applyArtifactWrites,
  applyFigureValues,
  autoAdvanceShownFigureStep,
  runStagehand,
  runScribeSweep,
  resolveCanvasChange,
  currentCanvasDirective,
  resolveChips,
  looksAnswerable,
  ensureNextAsk,
  fallbackAsk,
  buildCanvasCatalog,
  MAX_NEW_TICKS_PER_TURN,
  SESSION_MODEL,
  SESSION_EFFORT,
  injectLiveSurfaces,
} from '../../../_session.js'
import { TANGENT_TABLE_ID } from '../../../_sessionPacks.js'

const enc = new TextEncoder()
const frame = (obj) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`)

// Settle the opener: parse tags, apply effects, resolve canvas, Usher backstop +
// chips, persist. Returns { cleanText, suggestions, payload } for the response.
async function settleOpener(env, session, pack, rawText, emitDelta) {
  const parsed = parseTurn(rawText)
  let cleanText = parsed.cleanText

  // Opener may prepopulate artifacts (e.g. structure carried over from a prior
  // day). Gate layer (b) guarantees an opener draft can never self-tick.
  applyArtifactWrites(session, pack, parsed.artifactWrites)
  session.artifactTruncated = Boolean(parsed.artifactTruncated)

  applyTurnEffects(session, pack, parsed, 0, {
    maxNewTicks: MAX_NEW_TICKS_PER_TURN,
    tickGuard: makeTickGuard(pack, session),
    extraTableIds: [TANGENT_TABLE_ID],
  })

  // Runtime [FIG:] value/addition injection (Phase T.5) — BEFORE canvas
  // resolution, same rule as the per-turn engine.
  applyFigureValues(session, pack, parsed.figValues)

  // FIX 1 (T.4g) — same auto-advance rule as the per-turn engine, applied to
  // the opener too (a resumed/prepopulated entry could conceivably carry one).
  autoAdvanceShownFigureStep(pack, session, parsed.figValues)

  // SCRIBE — same rule as the per-turn engine: Director-authored [FIG:]
  // values (above) apply first; the Scribe only fills what's still unfilled.
  // An opener rarely establishes real numbers (nothing said yet), but entry
  // context CAN prepopulate/recap prior-day values, so this is wired for
  // consistency rather than skipped. `lastUserText: null` — there's no real
  // learner turn yet at a fresh start.
  const scribeResult = await runScribeSweep(env, pack, session, { cleanText, lastUserText: null })
  if (scribeResult.figValues.length) {
    applyFigureValues(session, pack, scribeResult.figValues)
    autoAdvanceShownFigureStep(pack, session, scribeResult.figValues)
    session.transcriptLog.push({
      role: 'scribe',
      source: 'scribe',
      figValues: scribeResult.figValues,
      ts: new Date().toISOString(),
    })
  }

  // Stagehand (Phase T.4f Tier 3) — an opener could conceivably request one
  // (e.g. entry.context nudges toward a bespoke recap visual); same rule as
  // the per-turn engine: success force-shows it, failure leaves a one-shot
  // note for the FIRST real turn's envelope (there's no "next turn" of the
  // opener itself to surface it in).
  if (parsed.stage) {
    const stageResult = await runStagehand(env, pack, session, parsed.stage)
    session.transcriptLog.push({
      role: 'stage',
      request: parsed.stage,
      ok: stageResult.ok,
      key: stageResult.key,
      reason: stageResult.reason,
      spec: stageResult.spec,
      ts: new Date().toISOString(),
    })
    if (stageResult.ok) parsed.show = stageResult.key
    else session.lastStageNote = `Your last [STAGE:] request ("${parsed.stage}") failed: ${stageResult.reason}. Canvas stayed on what it was — try an authored target, an instance (#id), or compare() instead, or rephrase the request.`
  }

  // Opener may [SHOW:] something other than the entry canvas; honor it.
  const canvasDirective = resolveCanvasChange(pack, session, parsed.show, null)

  // NEVER-ORPHAN GUARANTEE (#11): the opener must never trail off with
  // nothing to do, and must never settle on literally EMPTY text. Usher
  // backstop first; a deterministic fallback (no network call) guarantees
  // non-empty output even if that Haiku pass also comes back ''.
  let usherAsk = ''
  if (!cleanText || !looksAnswerable(cleanText)) {
    usherAsk = (await ensureNextAsk(env, session, pack, cleanText)) || fallbackAsk(pack, session, canvasDirective)
    const sep = cleanText ? '\n\n' : ''
    if (emitDelta) emitDelta(`${sep}${usherAsk}`)
    cleanText = `${cleanText}${sep}${usherAsk}`
  }
  const suggestions = await resolveChips(env, {
    tagSuggestions: parsed.suggestions,
    cleanText,
    studentName: session.studentName,
    suppressMultiQuestion: true,
  })

  session.history.push({ role: 'assistant', content: cleanText })
  session.lastSuggestions = suggestions
  session.transcriptLog.push({
    role: 'assistant',
    raw: rawText,
    ticks: parsed.ticks,
    tables: parsed.tables,
    show: parsed.show,
    usherAsk: usherAsk || undefined,
    ts: new Date().toISOString(),
  })
  await saveLesson(env, session)

  return {
    resumed: false,
    messages: [{ role: 'assistant', content: cleanText }],
    suggestions,
    canvas: injectLiveSurfaces(currentCanvasDirective(pack, session), env, getStudent(session.studentSlug)),
    artifacts: session.artifacts,
    catalog: buildCanvasCatalog(pack, session), // Contents Menu (Build 1)
    sessionDone: false,
    seq: session.seq,
    day: session.dayId,
    dayTitle: pack.title,
    ...progressInfo(pack, session.inventoryState),
  }
}

export async function onRequestPost({ params, env, request }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  let body = {}
  try {
    body = await request.json()
  } catch {
    /* empty body is fine */
  }
  const dayId = String(body?.day ?? '1')
  const pack = getSessionPack(course.slug, dayId)
  if (!pack) return errorResponse('No session configured for this day', 404)

  if (body?.reset) {
    await env.INTERVIEW.delete(lessonKey(studentSlug, course.slug, dayId))
  }

  const existing = body?.reset ? null : await loadLesson(env, studentSlug, course.slug, dayId)

  // Resume: rehydrate the client with history, chips, current canvas, progress.
  if (existing && existing.v === 2) {
    const prog = progressInfo(pack, existing.inventoryState)
    // #9: resumed at the ship gate — all objectives done, but a requiresShip day that
    // hasn't been shipped + signed off. Re-surfaces the mandatory ShipCard on reload.
    const awaitingShip = Boolean(
      pack.requiresShip && !existing.completed && !existing.signedOff &&
      prog.totalRequired > 0 && prog.ticked >= prog.totalRequired,
    )
    return jsonResponse({
      resumed: true,
      messages: existing.history,
      suggestions: existing.lastSuggestions || [],
      canvas: injectLiveSurfaces(currentCanvasDirective(pack, existing), env, student),
      artifacts: existing.artifacts,
      catalog: buildCanvasCatalog(pack, existing), // Contents Menu (Build 1)
      sessionDone: Boolean(existing.completed),
      awaitingShip,
      seq: existing.seq,
      day: dayId,
      dayTitle: pack.title,
      ...prog,
    })
  }

  // Fresh start: opener turn. Canvas opens on the pack's entry target.
  const session = newLesson(student, course, studentSlug, pack)
  const system = `${buildSessionSystemPrompt(pack, session.studentName)}\n\n${buildSessionEnvelope(session, pack)}`
  const openerMessages = [
    {
      role: 'user',
      content: `[Session starting now. Entry guidance: ${pack.entry.context}]`,
    },
  ]
  const llmOpts = {
    model: SESSION_MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    effort: SESSION_EFFORT,
    system,
    messages: openerMessages,
  }

  // Non-streaming path (no `stream` flag — curl tests, simple clients).
  if (!body?.stream) {
    let rawText
    try {
      rawText = await callAnthropic(env, llmOpts)
    } catch (err) {
      return errorResponse(`Failed to start session: ${err.message}`, 502)
    }
    const payload = await settleOpener(env, session, pack, rawText, null)
    return jsonResponse(payload)
  }

  // Streaming path (#3): the opener types out like any other turn.
  let upstream
  try {
    upstream = await callAnthropicStream(env, llmOpts)
  } catch (err) {
    return errorResponse(`Failed to start session: ${err.message}`, 502)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let emitted = 0
        const full = await consumeAnthropicSSE(upstream, (_delta, acc) => {
          const cut = safeEmitLen(acc)
          if (cut > emitted) {
            controller.enqueue(frame({ type: 'delta', text: acc.slice(emitted, cut) }))
            emitted = cut
          }
        })
        const payload = await settleOpener(env, session, pack, full, (t) =>
          controller.enqueue(frame({ type: 'delta', text: t }))
        )
        controller.enqueue(frame({ type: 'done', ...payload }))
      } catch (err) {
        controller.enqueue(frame({ type: 'error', message: `Failed to start session: ${err.message}` }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}
