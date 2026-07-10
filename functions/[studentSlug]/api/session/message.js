// POST /<studentSlug>/api/session/message
//   body: { message, seq, day?: "1", canvasLiveState?, selection? }
// One lesson turn, STREAMED as SSE. This REPLACES the prototype's stateless
// open chat: the server now owns the session (R2), requires a known student +
// an in-progress lesson, enforces the turn-sequence guard and the day's turn
// budget, and stays authoritative on ticks (typed: check needs evidence,
// artifact needs its gate) and on the canvas (3-tier [SHOW:]).
//
// Wire protocol (each SSE frame is `data: <json>\n\n`):
//   { type: 'delta',  text }                                   — reply chunk
//   { type: 'canvas', directive }                              — canvas change
//   { type: 'done',   message, sessionDone, suggestions,
//     ticked, totalRequired, focus, seq, canvasTarget, catalog } — turn settled
//   { type: 'error',  message }                                 — turn failed; not persisted

import { errorResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import {
  parseTurn,
  applyTurnEffects,
  safeEmitLen,
  callAnthropicStream,
  consumeAnthropicSSE,
} from '../../../_turnCore.js'
import {
  getSessionPack,
  personalizePack,
  progressInfo,
  isComplete,
  loadLesson,
  saveLesson,
  buildSessionSystemPrompt,
  buildSessionEnvelope,
  makeTickGuard,
  rejectedTicks,
  resolveCanvasChange,
  detectClaimedShow,
  resolveClaimedTarget,
  resolveClaimedTargetLLM,
  RESOLVER_NONE,
  applyFigureValues,
  autoAdvanceShownFigureStep,
  runStagehand,
  runScribeSweep,
  foldHistory,
  focusIdOf,
  maxTurnsFor,
  resolveChips,
  looksAnswerable,
  ensureNextAsk,
  fallbackAsk,
  detectStopIntent,
  applyArtifactWrites,
  prepareOwnershipVerdicts,
  mirrorArtifacts,
  buildCanvasCatalog,
  MAX_NEW_TICKS_PER_TURN,
  MIN_TURNS_BEFORE_COMPLETE,
  SESSION_MODEL,
  SESSION_EFFORT,
  injectLiveSurfaces,
  hasLiveWorkshop,
  isOnLiveWorkshop,
  loadGlance,
  PROACTIVE_MAX_PER_SESSION,
  PROACTIVE_MAX_TOKENS,
} from '../../../_session.js'
import { TANGENT_TABLE_ID } from '../../../_sessionPacks.js'

const enc = new TextEncoder()
const frame = (obj) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`)

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
  // Personalize the shared pack for THIS learner (name token + pronouns).
  const pack = personalizePack(getSessionPack(course.slug, dayId), student)
  if (!pack) return errorResponse('No session configured for this day', 404)

  const session = await loadLesson(env, studentSlug, course.slug, dayId)
  if (!session || session.v !== 2) {
    return errorResponse('No session in progress — start one first.', 404)
  }
  if (session.completed) return errorResponse('This session is already complete.', 409)

  // Proactive terminal turn (#2/#4/#5): a lean, isolated path — SAME endpoint (client
  // posts here) but it does NOT thread through the 450-line learner settle sequence
  // (that's how drift happens). Budget-exempt, tick-inert, completion-inert.
  if (body?.kind === 'proactive') {
    return handleProactiveTurn({ env, studentSlug, courseSlug: course.slug, dayId, pack, session, body })
  }

  const message = (body?.message || '').trim()
  if (!message) return errorResponse('Empty message')

  // Turn-sequence guard: a stale/duplicate submit (second tab, refresh replay)
  // must not silently drop or double-apply a turn. Client echoes the seq it
  // last saw; mismatch → 409 with the authoritative seq so it can resync.
  const clientSeq = Number(body?.seq)
  if (!Number.isInteger(clientSeq) || clientSeq !== session.seq) {
    return new Response(
      JSON.stringify({ error: 'Out of sync — reload the session.', seq: session.seq }),
      { status: 409, headers: { 'content-type': 'application/json' } }
    )
  }

  // Day turn budget (pack-declared ceiling — defense in depth alongside auth).
  if (session.totalUserTurns >= maxTurnsFor(pack)) {
    return errorResponse('Today’s turn budget is used up.', 409)
  }

  // F1 settle-merge, part 1: snapshot artifact write-times at turn start so
  // learner saves that land mid-stream are never clobbered by the settle save.
  const artifactsAtTurnStart = Object.fromEntries(
    Object.entries(session.artifacts).map(([id, a]) => [id, a.updatedAt])
  )

  const focusBefore = focusIdOf(pack, session)
  // Observer's rolling terminal read (workshop days only) — so even a plain chat turn is
  // oriented to what's happening in the build, not just to what the learner typed.
  const glance = hasLiveWorkshop(pack) ? await loadGlance(env, studentSlug, course.slug, dayId) : null
  const system = `${buildSessionSystemPrompt(pack, session.studentName)}\n\n${buildSessionEnvelope(session, pack, body?.canvasLiveState, body?.selection, { terminalSituation: glance?.situation })}`
  session.lastStageNote = null // one-shot — just folded into this turn's outgoing envelope
  const turnMessages = [...session.history, { role: 'user', content: message }]

  // Open the upstream BEFORE committing to a 200 SSE body so auth/credit errors
  // surface as a normal JSON error the client can show.
  let upstream
  try {
    upstream = await callAnthropicStream(env, {
      model: SESSION_MODEL,
      max_tokens: 3000,
      thinking: { type: 'adaptive' },
      effort: SESSION_EFFORT,
      system,
      messages: turnMessages,
    })
  } catch (err) {
    return errorResponse(`Turn failed: ${err.message}`, 502)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Pump deltas with the control-tag guard: never let a partial
        // [TICK:/[TABLE:/[SHOW:/[SUGGESTED_REPLIES: flash on screen.
        let emitted = 0
        const pendingAnnounced = new Set()
        const full = await consumeAnthropicSSE(upstream, (_delta, acc) => {
          const cut = safeEmitLen(acc)
          if (cut > emitted) {
            controller.enqueue(frame({ type: 'delta', text: acc.slice(emitted, cut) }))
            emitted = cut
          }
          // Once a complete [ARTIFACT: id] header is in, announce the draft so
          // the client can show a "drafting…" state (streaming freezes while the
          // block accumulates — this kills the dead-air feel).
          for (const m of acc.matchAll(/\[ARTIFACT:\s*([^\]\n]+?)\s*\]/g)) {
            const id = m[1].trim()
            if (id && !pendingAnnounced.has(id)) {
              pendingAnnounced.add(id)
              controller.enqueue(frame({ type: 'artifactPending', id }))
            }
          }
        })

        // Turn settled — parse, apply (server-authoritative), persist.
        const parsed = parseTurn(full)
        let cleanText = parsed.cleanText

        const turnNo = session.totalUserTurns + 1

        // F1 settle-merge, part 2: one extra R2 read; any artifact whose stored
        // updatedAt is newer than the turn-start snapshot was saved by the
        // learner mid-turn — adopt it, and DROP Director writes for it
        // (learner wins, deterministically).
        const conflictedIds = []
        try {
          const stored = await loadLesson(env, studentSlug, course.slug, dayId)
          for (const [id, a] of Object.entries(stored?.artifacts || {})) {
            const snap = artifactsAtTurnStart[id]
            if (a.updatedAt && (!snap || a.updatedAt > snap)) {
              session.artifacts[id] = a
              conflictedIds.push(id)
            }
          }
        } catch {
          /* merge read is belt-and-braces; the client also defers mid-turn flushes */
        }

        // Director artifact writes (contract §2 v2) — BEFORE tick application so
        // the guard sees fresh lastDirectorWriteAt (same-turn draft-and-tick is
        // structurally impossible), and BEFORE canvas resolution so a same-turn
        // [SHOW: artifact:id] resolves with the new content.
        const { applied: artifactApplied, dropped: artifactDropped } = applyArtifactWrites(
          session,
          pack,
          parsed.artifactWrites,
          { conflictedIds }
        )
        session.artifactTruncated = Boolean(parsed.artifactTruncated)
        session.droppedArtifactWrites = artifactDropped
          .filter((d) => d.why === 'learner-newer')
          .map((d) => d.id)

        // Ownership verdicts (gate layer c) for any attempted artifact ticks.
        await prepareOwnershipVerdicts(env, session, pack, parsed.ticks, parsed.evidence)

        const tickedBefore = new Set(
          Object.entries(session.inventoryState)
            .filter(([, s]) => s.ticked)
            .map(([id]) => id)
        )
        applyTurnEffects(session, pack, parsed, turnNo, {
          maxNewTicks: MAX_NEW_TICKS_PER_TURN,
          tickGuard: makeTickGuard(pack, session),
          extraTableIds: [TANGENT_TABLE_ID],
        })
        session.rejectedTicks = rejectedTicks(pack, session, parsed.ticks, tickedBefore, parsed.evidence)

        // Runtime [FIG:] value/addition injection (Phase T.5) — BEFORE canvas
        // resolution so a same-turn value change on the showing figure is what
        // resolveCanvasChange's values-hash check sees.
        applyFigureValues(session, pack, parsed.figValues)

        // FIX 1 (T.4g) — if a value just landed on the CURRENTLY-DISPLAYED
        // figure/instance at a step later than what's shown, auto-advance it
        // so the learner never has to ask for the canvas to catch up. Must run
        // BEFORE resolveCanvasChange: it only sets the step figureState/
        // figureInstances will report; the existing values-hash check is what
        // actually emits the frame.
        autoAdvanceShownFigureStep(pack, session, parsed.figValues)

        // SCRIBE — per-turn Haiku sweep (new cast member): the Director's own
        // [FIG:] values are already applied above (Director-first precedence —
        // the Scribe only ever considers elements STILL unfilled after that).
        // Cheap prefilter + candidate check inside runScribeSweep mean most
        // turns skip the network call entirely. Never throws (fail-open).
        const scribeResult = await runScribeSweep(env, pack, session, {
          cleanText,
          lastUserText: message,
        })
        if (scribeResult.figValues.length) {
          applyFigureValues(session, pack, scribeResult.figValues)
          autoAdvanceShownFigureStep(pack, session, scribeResult.figValues)
          session.transcriptLog.push({
            role: 'scribe',
            source: 'scribe',
            figValues: scribeResult.figValues,
            ts: new Date().toISOString(),
          })
          // Values landed on a figure that isn't on canvas and the Director
          // gave no [SHOW:] → surface it. Client renders this as a
          // "Continue to <title> →" pill (pending-swap), never a yank.
          if (!parsed.show) {
            const receiving = scribeResult.figValues[0]?.key
            const displayedBase = (session.canvasTarget || '').split('@')[0]
            if (receiving && receiving.split('@')[0] !== displayedBase) {
              parsed.show = receiving
            }
          }
        }

        // Stagehand (Phase T.4f Tier 3) — BEFORE canvas resolution so a
        // successful build is [SHOW:]-able THIS turn. Success force-shows the
        // new key (auto [SHOW:] semantics — overrides whatever the model may
        // have also said, since the build IS the response to the request);
        // failure leaves parsed.show as-is (never blanks the canvas) and queues
        // a one-shot note for the NEXT turn's envelope.
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
          if (stageResult.ok) {
            parsed.show = stageResult.key
          } else {
            session.lastStageNote = `Your last [STAGE:] request ("${parsed.stage}") failed: ${stageResult.reason}. Canvas stayed on what it was — try an authored target, an instance (#id), or compare() instead, or rephrase the request.`
          }
        }

        // Artifact frames BEFORE the canvas frame (the pane may not be on canvas).
        for (const a of artifactApplied) {
          const art = session.artifacts[a.id]
          const gate = pack.artifacts[a.id]
          controller.enqueue(
            frame({
              type: 'artifact',
              id: a.id,
              content: art.content,
              by: 'director',
              chars: a.chars,
              minChars: gate.minChars,
            })
          )
        }

        // SAY-DO repair (deterministic backstop): if the Director narrated a
        // canvas show but emitted NO [SHOW:] (nor did the Scribe/Stagehand set
        // one above), perform the show it claimed. Long-context tag-emission
        // degradation stranded the learner on a stale canvas across many turns
        // in the pilot — this makes the canvas track the Director's OWN words
        // regardless of whether the tag fired. Delivered as a `requested` frame
        // (forced-emit + client displays immediately, no pending pill).
        // GUARD: never let the INFERRED (say-do) repair yank the learner off a LIVE
        // workshop surface. On Day 2 the canvas is the real terminal + app viewer; the
        // Director's deictic prose there ("look at the error", "see your build") — often
        // biased by the learner's injected marquee-selection text — refers to THIS live
        // pane. A forced retarget remounts the canvas, tears down the terminal socket +
        // viewer iframe, and loses the learner's in-progress work (reported bug). Only an
        // EXPLICIT [SHOW:] navigates away here (and that goes through the polite queued
        // pill, not a force-yank).
        let forceRequested = false
        if (!parsed.show && !isOnLiveWorkshop(pack, session) && detectClaimedShow(cleanText)) {
          // Robust primary: a constrained Haiku call resolves WHICH catalog target
          // the Director is pointing at (handles "take a look at the gear memo",
          // "line them up side by side" — phrasings regex kept missing). Tri-state
          // (review P1): RESOLVER_NONE means the resolver RAN and judged there is no
          // target — trust it and SKIP repair (a referential mention like "sharp
          // read on the scoreboard" must NOT yank the canvas). Only a null (outage /
          // unmappable) falls back to the always-returns-something deterministic
          // resolver, with the just-drafted artifact as its strongest hint.
          const llm = await resolveClaimedTargetLLM(env, pack, session, cleanText)
          let repaired = null
          if (llm === RESOLVER_NONE) {
            repaired = null
          } else if (llm) {
            repaired = llm
          } else {
            const stagedKeys = artifactApplied.map((a) => `artifact:${a.id}`)
            repaired = resolveClaimedTarget(pack, session, cleanText, stagedKeys)
          }
          if (repaired) {
            parsed.show = repaired
            forceRequested = true
          }
        }

        // 3-tier canvas: model [SHOW:] → new focus's default → keep current
        // (extended, Phase T.5: a live [FIG:] value change on the CURRENTLY-shown
        // figure still emits a frame even with no [SHOW:] this turn).
        const canvasDirective = resolveCanvasChange(pack, session, parsed.show, focusBefore, {
          requested: forceRequested,
        })
        if (canvasDirective) controller.enqueue(frame({ type: 'canvas', directive: injectLiveSurfaces(canvasDirective, env, student) }))

        // GRACEFUL EXIT (day-1 pilot fix): if the learner signalled they want to
        // stop for now, NEVER append a "keep going" nag — that loop (appending
        // "Let's keep going: <open objective>" after "we're done"/"please stop")
        // is exactly what trapped and enraged the pilot learner when required
        // artifact gates were unmet. Let the turn end on the Director's own words.
        const stopIntent = detectStopIntent(message)

        // NEVER-ORPHAN GUARANTEE (#11): a turn must never trail off with nothing
        // to do, and must never settle on literally EMPTY text (a tags-only
        // turn). Usher backstop first (context-aware Haiku ask); if that also
        // comes back '' (network failure, or nothing left open), a deterministic
        // fallback — never a network call — guarantees non-empty output. Suppressed
        // entirely when the learner is trying to stop (above).
        let usherAsk = ''
        if (!stopIntent && (!cleanText || !looksAnswerable(cleanText))) {
          usherAsk = (await ensureNextAsk(env, session, pack, cleanText)) || fallbackAsk(pack, session, canvasDirective)
          const sep = cleanText ? '\n\n' : ''
          controller.enqueue(frame({ type: 'delta', text: `${sep}${usherAsk}` }))
          cleanText = `${cleanText}${sep}${usherAsk}`
        }

        // Usher chips (#6): model tag → Haiku pass → deterministic extraction.
        const suggestions = await resolveChips(env, {
          tagSuggestions: parsed.suggestions,
          cleanText,
          studentName: session.studentName,
          suppressMultiQuestion: true,
        })

        session.history.push({ role: 'user', content: message })
        session.history.push({ role: 'assistant', content: cleanText })
        session.transcriptLog.push(
          { role: 'user', raw: message, ts: new Date().toISOString() },
          {
            role: 'assistant',
            raw: full,
            ticks: parsed.ticks,
            evidence: parsed.evidence,
            rejected: session.rejectedTicks,
            tables: parsed.tables,
            show: parsed.show,
            usherAsk: usherAsk || undefined,
            ts: new Date().toISOString(),
          }
        )
        session.totalUserTurns = turnNo
        session.lastSuggestions = suggestions
        session.seq += 1

        // A day closes when every required objective is ticked (the real gate) OR
        // — the graceful exit — the learner asks to stop AFTER the day has
        // substantially happened (>=70% of required objectives done, past the turn
        // floor). The learner is never trapped behind the last unmet gates; the
        // session is marked ended-incomplete so the report stays honest about what
        // wasn't finished, and tomorrow opens the next day instead of the trap.
        const fullyComplete = isComplete(pack, session.inventoryState)
        const prog = progressInfo(pack, session.inventoryState)
        const substantial = prog.totalRequired > 0 && prog.ticked / prog.totalRequired >= 0.7
        const gracefulEnd =
          stopIntent && substantial && turnNo >= MIN_TURNS_BEFORE_COMPLETE
        const baseDone = (fullyComplete && turnNo >= MIN_TURNS_BEFORE_COMPLETE) || gracefulEnd
        // Ship gate (#9): a requiresShip day (Day 2) can't finalize until the learner
        // ships + signs off via /signoff. baseDone still surfaces the mandatory ship
        // card on the client (awaitingShip) — completion just waits for the sign-off.
        const awaitingShip = pack.requiresShip && baseDone && !session.signedOff
        const done = baseDone && !awaitingShip
        if (done) {
          session.completed = true
          session.endedAt = new Date().toISOString()
          if (gracefulEnd && !fullyComplete) session.endedIncomplete = true
        }

        // Window memory: fold aged turns into the running summary (inline,
        // never-throw; on failure we just carry full history one more turn).
        await foldHistory(env, session)

        await saveLesson(env, session)
        // Durable per-artifact copies (private bucket) whenever a turn changed them.
        if (artifactApplied.length) {
          await mirrorArtifacts(env, session, artifactApplied.map((a) => a.id))
        }

        controller.enqueue(
          frame({
            type: 'done',
            message: cleanText,
            sessionDone: Boolean(session.completed),
            awaitingShip, // #9: server says "surface the mandatory ship card now"
            suggestions,
            seq: session.seq,
            canvasTarget: session.canvasTarget,
            // Contents Menu (Build 1): re-sent each turn since a Stagehand
            // build (Tier 3) can add a new session-scoped dynamicProgram
            // entry mid-session — cheap (titles/types only) and keeps the
            // menu current without forcing a restart to see a new target.
            catalog: buildCanvasCatalog(pack, session),
            ...progressInfo(pack, session.inventoryState),
          })
        )
      } catch (err) {
        controller.enqueue(frame({ type: 'error', message: `Turn failed: ${err.message}` }))
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

// --- Proactive (terminal-triggered) turn — lean, isolated path -------------------
// A short Director "glance over the shoulder" fired by a terminal EVENT, not a message.
// Deliberately NOT threaded through the learner settle sequence above (that's how drift
// creeps in): budget-exempt (increments proactiveTurns, NOT totalUserTurns), tick-inert
// (no applyTurnEffects — the board only moves on real learner turns), completion-inert
// (never ends the session or touches the ship gate). Buffered rather than live-streamed
// so a [PASS] can never flash on screen. `seq` still increments so it serializes with
// learner turns via the same guard.
async function handleProactiveTurn({ env, studentSlug, courseSlug, dayId, pack, session, body }) {
  const event = body?.event
  if (!event || !event.type) return errorResponse('Proactive turn missing event')

  // Defensive init for sessions created before these fields existed (additive v2).
  if (session.proactiveTurns == null) session.proactiveTurns = 0
  if (!session.explainedAffordances) session.explainedAffordances = {}

  // Same seq guard as a learner turn — it serializes ALL turns. If a learner turn won
  // the slot and bumped seq, this proactive post 409s and the client drops it silently.
  const clientSeq = Number(body?.seq)
  if (!Number.isInteger(clientSeq) || clientSeq !== session.seq) {
    return new Response(
      JSON.stringify({ error: 'Out of sync.', seq: session.seq }),
      { status: 409, headers: { 'content-type': 'application/json' } }
    )
  }
  // Hard per-session cap (backstop to the client-side rate policy).
  if (session.proactiveTurns >= PROACTIVE_MAX_PER_SESSION) {
    return errorResponse('Proactive limit reached for this session.', 429)
  }

  const focusBefore = focusIdOf(pack, session)
  const glance = await loadGlance(env, studentSlug, courseSlug, dayId)
  const system = `${buildSessionSystemPrompt(pack, session.studentName)}\n\n${buildSessionEnvelope(session, pack, body?.canvasLiveState, null, { proactiveEvent: event, terminalSituation: glance?.situation })}`
  const userLine = `[TERMINAL EVENT — not a message from ${session.studentName}] ${event.type}: "${String(event.excerpt || '').slice(0, 600)}"`

  let upstream
  try {
    upstream = await callAnthropicStream(env, {
      model: SESSION_MODEL,
      max_tokens: PROACTIVE_MAX_TOKENS,
      thinking: { type: 'adaptive' },
      effort: SESSION_EFFORT,
      system,
      messages: [...session.history, { role: 'user', content: userLine }],
    })
  } catch (err) {
    return errorResponse(`Turn failed: ${err.message}`, 502)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Buffer the whole reply (no live deltas) so a [PASS] never flashes on screen.
        const full = await consumeAnthropicSSE(upstream, () => {})
        const parsed = parseTurn(full)
        const cleanText = parsed.cleanText.replace(/\[PASS\]/gi, '').trim()
        const passed = cleanText === ''

        session.seq += 1
        session.proactiveTurns += 1

        if (passed) {
          // The Director judged the moment not worth words — no bubble, no history push.
          session.transcriptLog.push({ role: 'assistant', source: 'proactive', event, passed: true, raw: full, ts: new Date().toISOString() })
          await saveLesson(env, session)
          controller.enqueue(frame({ type: 'done', proactive: true, passed: true, seq: session.seq }))
          return
        }

        controller.enqueue(frame({ type: 'delta', text: cleanText }))

        // The Director may legitimately re-show the workshop; honor a [SHOW:] if present.
        if (parsed.show) {
          const dir = resolveCanvasChange(pack, session, parsed.show, focusBefore, {})
          if (dir) controller.enqueue(frame({ type: 'canvas', directive: injectLiveSurfaces(dir, env, student) }))
        }

        // First-time affordance memory (server-authoritative — "name it once", #2).
        if (session.explainedAffordances[event.type] == null) {
          session.explainedAffordances[event.type] = session.proactiveTurns
        }

        // Compact synthetic turn so the model stays consistent with its own visible
        // words next turn; the window fold ages these out like any other turn.
        session.history.push({ role: 'user', content: userLine })
        session.history.push({ role: 'assistant', content: cleanText })
        session.transcriptLog.push({ role: 'assistant', source: 'proactive', event, raw: full, show: parsed.show, ts: new Date().toISOString() })

        await foldHistory(env, session)
        await saveLesson(env, session)

        controller.enqueue(
          frame({
            type: 'done',
            proactive: true,
            message: cleanText,
            seq: session.seq,
            explainedAffordances: session.explainedAffordances,
          })
        )
      } catch (err) {
        controller.enqueue(frame({ type: 'error', message: `Turn failed: ${err.message}` }))
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
