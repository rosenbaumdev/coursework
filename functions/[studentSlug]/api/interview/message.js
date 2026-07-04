// POST /<studentSlug>/api/interview/message   body: { message }
// One conversational turn, STREAMED as Server-Sent Events. The server stays the
// authority on the objective inventory: it re-injects the live inventory
// envelope, streams the interviewer's reply token-by-token, then — once the full turn is
// in — parses the control tags, records ticks/tables (server-authoritative),
// and completes the interview when every required box is ticked (past the turn
// floor). On completion the profile is synthesized via waitUntil so the stream
// isn't blocked on the long Sonnet call.
//
// Wire protocol (each SSE frame is `data: <json>\n\n`):
//   { type: 'delta', text }                                  — a chunk of the reply
//   { type: 'done', message, interviewDone, suggestions,
//     ticked, totalRequired, focus }                          — turn settled
//   { type: 'error', message }                                — turn failed; not persisted

import { errorResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import {
  MAX_TURNS,
  MIN_TURNS_BEFORE_COMPLETE,
  getPack,
  isComplete,
  progressInfo,
  buildBaseSystemPrompt,
  buildEnvelope,
  parseTurn,
  resolveChips,
  looksAnswerable,
  ensureQuestion,
  applyTurnEffects,
  safeEmitLen,
  callAnthropicStream,
  consumeAnthropicSSE,
  loadSession,
  saveSession,
  generateAndStoreProfile,
  INTERVIEW_MODEL,
  INTERVIEW_EFFORT,
} from '../../../_interview.js'

const enc = new TextEncoder()
const frame = (obj) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`)

function sseResponse(readable) {
  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}

export async function onRequestPost({ params, env, request, waitUntil }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  const pack = getPack(course.slug, course.title)
  if (!pack) return errorResponse('No interview configured for this course', 404)

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }
  const message = (body && body.message ? String(body.message) : '').trim()
  if (!message) return errorResponse('Empty message')

  const session = await loadSession(env, studentSlug, course.slug)
  if (!session) return errorResponse('No interview in progress — start one first.', 404)
  // Stale / pre-redesign session shape — tell the client to restart cleanly
  // rather than crash the inventory helpers.
  if (!session.inventoryState || typeof session.inventoryState !== 'object') {
    return errorResponse('Interview session is out of date — please restart.', 409)
  }
  if (session.completed) return errorResponse('Interview already completed', 400)

  // Cost ceiling on the public endpoint — emit a canned wrap-up as a stream so
  // the client's single code path handles it, then synthesize the profile.
  if (session.totalUserTurns >= MAX_TURNS) {
    session.completed = true
    session.lastSuggestions = []
    await saveSession(env, session)
    const wrap =
      "We've covered a lot — I'm going to wrap things up here and put your profile together. Thanks for going deep on this."
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(frame({ type: 'delta', text: wrap }))
        controller.enqueue(
          frame({
            type: 'done',
            message: wrap,
            interviewDone: true,
            suggestions: [],
            ...progressInfo(pack, session.inventoryState),
          })
        )
        // Synthesize before closing (full request budget) — see note below.
        await generateAndStoreProfile(env, session, pack)
        controller.close()
      },
    })
    return sseResponse(stream)
  }

  // Record the user turn in memory (persisted only if the model call succeeds).
  session.history.push({ role: 'user', content: message })
  session.totalUserTurns++
  session.transcriptLog.push({
    role: 'user',
    raw: message,
    ts: new Date().toISOString(),
  })

  const baseSystem = buildBaseSystemPrompt(pack, session.studentName)
  const fullSystem = `${baseSystem}\n\n${buildEnvelope(session, pack)}`

  // Open the Anthropic stream BEFORE committing to a 200 SSE body, so an auth /
  // credit / rate error surfaces as a normal JSON error (and we don't persist
  // the dangling user turn).
  let anthRes
  try {
    anthRes = await callAnthropicStream(env, {
      model: INTERVIEW_MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      effort: INTERVIEW_EFFORT,
      system: fullSystem,
      messages: session.history,
    })
  } catch (err) {
    return errorResponse(`Failed to continue interview: ${err.message}`, 502)
  }

  const stream = new ReadableStream({
    async start(controller) {
      let emitted = 0
      try {
        const rawText = await consumeAnthropicSSE(anthRes, (_delta, acc) => {
          const cut = safeEmitLen(acc)
          if (cut > emitted) {
            controller.enqueue(frame({ type: 'delta', text: acc.slice(emitted, cut) }))
            emitted = cut
          }
        })

        const parsed = parseTurn(rawText)
        let cleanText = parsed.cleanText
        const { ticks, tables, suggestions: tagSuggestions } = parsed

        // Flush any tail withheld by the control-tag guard.
        if (cleanText.length > emitted) {
          controller.enqueue(frame({ type: 'delta', text: cleanText.slice(emitted) }))
        }

        // Record this turn's ticks first, so the focus (and any backstop question)
        // reflect post-turn state.
        applyTurnEffects(session, pack, { ticks, tables }, session.totalUserTurns)

        const interviewDone =
          isComplete(pack, session.inventoryState) &&
          session.totalUserTurns >= MIN_TURNS_BEFORE_COMPLETE

        // BACKSTOP: never leave the student with a dead-end. If the turn trailed
        // off without a question (and we're not wrapping up), generate + append
        // the next question and stream it into the same bubble.
        if (!interviewDone && !looksAnswerable(cleanText)) {
          const q = await ensureQuestion(env, session, pack, cleanText)
          if (q) {
            const add = `\n\n${q}`
            controller.enqueue(frame({ type: 'delta', text: add }))
            cleanText += add
          }
        }

        // Resolve chips (tag → adaptive Haiku → offline extraction) from the final
        // text, so an appended backstop question can still get chips.
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

        if (interviewDone) session.completed = true

        await saveSession(env, session)

        controller.enqueue(
          frame({
            type: 'done',
            message: cleanText,
            interviewDone,
            suggestions,
            ...progressInfo(pack, session.inventoryState),
          })
        )

        // Synthesize the profile BEFORE closing the stream, so the worker keeps
        // its full request budget (a post-response waitUntil can get cut short on
        // a ~30s Sonnet call — that's why the pilot's profile silently vanished).
        // The client already has the 'done' frame; it just keeps reading until we
        // close. Best-effort: the transcript is already safe in the session blob.
        if (interviewDone) {
          await generateAndStoreProfile(env, session, pack)
        }
      } catch (err) {
        // Mid-stream failure: session was NOT saved, so the dangling user turn
        // isn't persisted — a retry re-asks cleanly.
        controller.enqueue(
          frame({ type: 'error', message: `Interview turn failed: ${err.message}` })
        )
      } finally {
        controller.close()
      }
    },
  })

  return sseResponse(stream)
}
