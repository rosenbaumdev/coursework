// Lesson session engine — Pages Functions runtime. Files prefixed with _ are
// not exposed as routes.
//
// This is the INSTRUCTION-register sibling of _interview.js (extraction
// register). Both import the same mechanical core (_turnCore.js); neither
// shares prompt prose with the other. All day-specific content comes from a
// session pack (_sessionPacks.js) — this module is content-agnostic.
//
// What this engine adds over the interview engine (per the two Fable reviews):
//   - typed tick authority via tickGuard: bare [TICK:] on a `check` objective is
//     REJECTED (evidence required); an `artifact` tick is rejected until the
//     learner-authored artifact meets its pack-declared gate.
//   - [SHOW:] canvas control, 3-tier: model target (validated) → objective's
//     canvasDefault when server focus advances → keep current.
//   - `tangent` parking (reserved TABLE target).
//   - bounded window memory: last WINDOW_KEEP turns verbatim; older turns folded
//     into a running summary via one Haiku call.
//   - turn sequence guard: client echoes `seq`; stale/duplicate → 409.
//   - per-day budget from the pack (maxTurns ceiling).
//
// Cast (a theater metaphor used consistently across this file and its
// siblings — the naming shows up in comments throughout, not just here):
//   DIRECTOR   — this engine (_session.js): decides, teaches, drives ticks and
//                the canvas. The primary voice the learner hears.
//   USHER      — (_usher.js): a per-turn side-call that resolves reply chips
//                and backstops a turn that trails off with nothing to do.
//   STAGEHAND  — (runStagehand, below): builds a runtime figure/deck spec on
//                request when nothing authored fits.
//   SCRIBE     — (_scribe.js): a per-turn Haiku sweep that lands values the
//                conversation clearly established but the Director's own
//                [FIG:] tag missed. A net, not a crutch — the Director should
//                still be emitting [FIG:] itself (see the system prompt).

import {
  getSessionPack,
  newObjectiveState,
  focusObjective,
  isComplete,
  progressInfo,
  isArtifactSatisfied,
  resolveShowTarget,
  renderObjectiveBoard,
  figureElementIds,
  unfilledFigureElementIds,
  TANGENT_TABLE_ID,
  DEFAULT_REPORT_SCHEMA,
  FIGURE_KINDS,
  ICON_GLYPHS,
  validateFigureSpec,
  validateDeckEntry,
  INSTANCE_ID_RE,
} from './_sessionPacks.js'
import { callAnthropic, readJSON, writeJSON } from './_turnCore.js'
import { ensureAsk } from './_usher.js'

// Usher re-exports so the session endpoints import everything from here.
export { resolveChips, looksAnswerable } from './_usher.js'
// Scribe re-exports — same pattern as the Usher above: the endpoints import
// everything through this one engine module rather than reaching into every
// cast member's own file. The pure helpers (scribeCandidates, buildScribePrompt,
// validateScribeOutput, mightContainValues) are re-exported too so the test
// harness can exercise every non-network piece directly.
export {
  runScribeSweep,
  mightContainValues,
  scribeCandidates,
  buildScribePrompt,
  validateScribeOutput,
  SCRIBE_MODEL,
  SCRIBE_VALUE_MAX_LEN,
} from './_scribe.js'

export { getSessionPack, progressInfo, isComplete, isArtifactSatisfied, resolveShowTarget, DEFAULT_REPORT_SCHEMA }

// Same model rationale as the interview: the per-turn reasoning pass is what
// works the board + canvas + evidence rules. Haiku proved it won't emit tags.
export const SESSION_MODEL = 'claude-sonnet-5'
export const SESSION_EFFORT = 'medium'
export const SUMMARY_MODEL = 'claude-haiku-4-5'

export const MAX_NEW_TICKS_PER_TURN = 3
export const DEFAULT_MAX_TURNS = 80 // engine fallback when a pack declares no budget
export const MIN_TURNS_BEFORE_COMPLETE = 8 // low sanity floor — objectives are the real gate

// Window memory bounds (Fable arch review #4): last WINDOW_KEEP turns verbatim;
// when history exceeds FOLD_AT, the oldest (len - WINDOW_KEEP) fold into
// session.summary via one Haiku call.
export const WINDOW_KEEP = 16
export const FOLD_AT = 24

// --- R2 key layout (PRIVATE bucket — env.INTERVIEW binding; never public) ---
export function lessonKey(studentSlug, courseSlug, dayId) {
  return `lessons/${studentSlug}/${courseSlug}/day-${dayId}.json`
}
export function reportKey(studentSlug, courseSlug, dayId) {
  return `lessons/${studentSlug}/${courseSlug}/day-${dayId}-report.md`
}

export async function loadLesson(env, studentSlug, courseSlug, dayId) {
  return readJSON(env.INTERVIEW, lessonKey(studentSlug, courseSlug, dayId))
}

export async function saveLesson(env, session) {
  session.updatedAt = new Date().toISOString()
  await writeJSON(
    env.INTERVIEW,
    lessonKey(session.studentSlug, session.courseSlug, session.dayId),
    session
  )
}

export function newLesson(student, course, studentSlug, pack) {
  return {
    v: 2,
    studentName: student.name,
    studentSlug,
    courseSlug: course.slug,
    courseTitle: course.title,
    dayId: String(pack.day),
    dayTitle: pack.title,
    seq: 0, // turn sequence guard — client echoes; server increments per accepted turn
    inventoryState: newObjectiveState(pack), // { [id]: { ticked, tickedAtTurn, evidence } } — field name matches _turnCore's applyTurnEffects contract
    artifacts: {}, // { [id]: { content, title, format, updatedAt } } — LEARNER-authored only
    parkingLot: [], // { objectiveId|'tangent', note, addedAtTurn }
    canvasTarget: pack.entry.canvas, // current canvas target key (BASE key — never carries a figure @step)
    figureState: {}, // { [baseKey]: stepIndex } — each figure's last-shown step (persisted so resume restores the build-up)
    figureValues: {}, // { [baseKey]: { elementId: string } } — live [FIG:] value overrides (Phase T.5)
    figureAdditions: {}, // { [baseKey]: [{ id, label, sub }] } — live-appended iconrow items ([FIG: key :: add="..."])
    figureValuesHash: {}, // { [id]: string } — last-EMITTED values+additions hash, keyed by whatever's on canvas (base key, "key#instance", or a compare id), so a value change alone (no step/[SHOW:] change) still triggers a canvas frame
    figureInstances: {}, // { ["key#instanceId"]: { step, values } } — per-instance state (Phase T.4f Tier 2), independent of the base figure's own figureState/figureValues
    dynamicProgram: {}, // { ["stage.N"]: CanvasProgramEntry } — Stagehand-built figures/decks (Phase T.4f Tier 3), session-scoped, merged over pack.canvasProgram at resolve time
    stageBuildCount: 0, // hard cap enforcement (STAGE_MAX_BUILDS)
    lastStageNote: null, // one-shot envelope note when the last [STAGE:] request failed (cleared once surfaced)
    lastSuggestions: [],
    rejectedTicks: [], // last turn's rejected tick attempts (fed back via envelope)
    history: [], // clean role+content fed to the model (bounded by window fold)
    summary: '', // running fold of turns aged out of the window
    transcriptLog: [], // full audit log — never folded, never sent to the model
    totalUserTurns: 0,
    completed: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function maxTurnsFor(pack) {
  return pack.budget?.maxTurns ?? DEFAULT_MAX_TURNS
}

// Current focus objective id (or null when all required are ticked).
export function focusIdOf(pack, session) {
  return focusObjective(pack, session.inventoryState)?.id ?? null
}

// Usher backstop, lesson persona: when a Director turn trails off with neither a
// question nor a direction, generate the single next ask from the open objectives
// so the learner always knows what to do next (dry-run finding #11).
export async function ensureNextAsk(env, session, pack, prevText) {
  const open = pack.objectives.filter((o) => !session.inventoryState[o.id]?.ticked)
  const lastUser = [...session.history].reverse().find((m) => m.role === 'user')
  const p = pack.pronouns
  return ensureAsk(env, {
    persona: `You are the instructor running a hands-on course session with a learner (${p.subject}/${p.object}). Asks may be questions OR concrete actions in the app ("write your first pass in the memo pane", "hit Next on the deck").`,
    openObjectives: open,
    lastUserText: lastUser?.content,
    prevText,
  })
}

// Deterministic (no LLM, never fails) last-resort ask for the never-orphan
// guarantee: when even the Usher's Haiku pass (ensureNextAsk) comes back ''
// (network failure, or every required objective is already ticked), the turn
// must STILL end on something the learner can act on. Two branches only:
// the canvas changed THIS turn (canvasDirective is non-null — resolveCanvasChange
// only returns a directive on a real change) → point at it; otherwise fall back
// to the current focus objective's need. No focus (all done) → generic nudge.
export function fallbackAsk(pack, session, canvasDirective) {
  if (canvasDirective) {
    return `Take a look at "${canvasDirective.title}" on the canvas — what stands out to you?`
  }
  const focus = focusObjective(pack, session.inventoryState)
  return focus
    ? `Let's keep going: ${focus.need} — where do you want to start?`
    : `Let's keep going — where do you want to pick this up?`
}

// The engine's tick authority (grammar contract §1/§2 v2), passed to
// applyTurnEffects as opts.tickGuard. Returns true = honor the tick.
// Artifact gate is THREE layers (Fable review #3 — all or the tick is theater):
//   (a) minChars met (isArtifactSatisfied)
//   (b) the learner saved a real edit AFTER the last Director write (ordering,
//       not delta — makes same-turn draft-and-tick structurally impossible)
//   (c) the ownership verifier passed (verdict pre-computed + cached on the
//       artifact by prepareOwnershipVerdicts; guard reads the cache).
export function makeTickGuard(pack, session) {
  return (id, evidence) => {
    const obj = pack.objectives.find((o) => o.id === id)
    if (!obj) return false
    if (obj.type === 'check' && !evidence) return false // bare check tick → rejected
    if (obj.type === 'artifact') {
      if (!isArtifactSatisfied(pack, session.artifacts, id)) return false // (a)
      const art = session.artifacts[id]
      if (art?.lastDirectorWriteAt && !(art.lastLearnerEditAt > art.lastDirectorWriteAt)) return false // (b)
      if (!art?.verifier || art.verifier.pass !== true) return false // (c)
    }
    return true
  }
}

// --- Director → artifact writes (contract §2 v2) ---
// Apply parsed [ARTIFACT: id]…[/ARTIFACT] blocks. `conflictedIds` (from the
// settle-merge) lists ids where a learner write landed mid-turn — those Director
// writes are DROPPED (learner wins, deterministically). Returns {applied, dropped}.
export function applyArtifactWrites(session, pack, writes, { conflictedIds = [] } = {}) {
  const applied = []
  const dropped = []
  const now = new Date().toISOString()
  for (const w of writes || []) {
    const gate = pack.artifacts?.[w.id]
    if (!gate) { dropped.push({ id: w.id, why: 'unknown' }); continue }
    if (conflictedIds.includes(w.id)) { dropped.push({ id: w.id, why: 'learner-newer' }); continue }
    const content = String(w.content ?? '').slice(0, 100_000)
    const prev = session.artifacts[w.id]
    session.artifacts[w.id] = {
      ...(prev || {}),
      content,
      title: gate.title,
      format: gate.format,
      updatedAt: now,
      by: 'director',
      lastDirectorWriteAt: now,
      lastLearnerEditAt: prev?.lastLearnerEditAt ?? null,
      directorDraft: content,
      verifier: null, // content changed → stale verdict
      history: [...(prev?.history || []), { by: 'director', at: now, chars: content.trim().length }].slice(-30),
    }
    applied.push({ id: w.id, chars: content.trim().length })
  }
  return { applied, dropped }
}

// --- Runtime [FIG:] value injection (Phase T.5 — promotes the reserved v1.1
// grammar from fable-collab-figures-review.md §2.4, extended with the
// iconrow `add=` item mechanism for the dynamic slate, and with instance
// targeting for Phase T.4f Tier 2). Applies parsed figValues onto
// session.figureValues/figureAdditions (base figures) or
// session.figureInstances[key#id].values (instances), validating every id
// against the TARGET figure's own spec (unknown ids dropped silently — a
// typo must never throw or corrupt state). Non-figure / unknown keys ignored.
// `[FIG: key#id :: ...]` — same key text `parseTurn` already captures verbatim
// (FIG_RE tolerates '#'); this function does the '#' split.
export function applyFigureValues(session, pack, figValues) {
  session.figureInstances ||= {}
  for (const { key, values } of figValues || []) {
    const hashIdx = key.indexOf('#')
    const base = hashIdx === -1 ? key : key.slice(0, hashIdx)
    let instanceId = hashIdx === -1 ? null : key.slice(hashIdx + 1)
    if (instanceId && !INSTANCE_ID_RE.test(instanceId)) instanceId = null // malformed → drop the instance targeting, degrade to base
    const entry = pack.canvasProgram?.[base]
    if (!entry || entry.type !== 'figure') continue
    const kind = entry.payload?.kind
    const spec = entry.payload?.spec || {}
    const validIds = new Set(figureElementIds(kind, spec))

    let cur, addedList
    if (instanceId) {
      const instKey = `${base}#${instanceId}`
      const inst = (session.figureInstances[instKey] ||= { step: 0, values: {} })
      inst.values ||= {}
      cur = inst.values
      addedList = null // add= (iconrow item append) not supported per-instance in v1
    } else {
      cur = (session.figureValues[base] ||= {})
      addedList = (session.figureAdditions[base] ||= [])
    }

    for (const [id, val] of Object.entries(values || {})) {
      if (id === 'add') {
        // Reserved add-item command (iconrow only): "Label|sub". Capped so a
        // figure never grows past the 6-item shape budget.
        if (!addedList || kind !== 'iconrow') continue
        const total = (spec.items?.length || 0) + addedList.length
        if (total >= 6) continue
        const [rawLabel, rawSub] = String(val).split('|')
        const label = (rawLabel || '').trim()
        if (!label) continue
        addedList.push({ id: `${base}.added.${addedList.length}`, label, sub: (rawSub || '').trim() })
        continue
      }
      if (!validIds.has(id)) continue // unknown element id — dropped silently
      cur[id] = String(val)
    }
  }
}

// --- FIX 1 (T.4g): auto-advance the CURRENTLY-DISPLAYED figure's step when a
// [FIG:] value lands on an element gated behind a step later than what's
// shown. Bug this closes: chat computes a later-stage number (e.g. SOM) while
// the canvas sits frozen on an earlier ring — nobody should have to ASK for
// the canvas to catch up. Scoped tightly to whatever's ALREADY on screen: a
// value landing on a figure (or a different instance) that ISN'T displayed
// must never hijack the canvas away from what the learner is looking at —
// that case is left to the model's own [SHOW:] plus Fix 2's envelope nudge.
// This function only MUTATES session.figureState/figureInstances (the step
// bookkeeping); it never emits anything itself — resolveCanvasChange's
// existing values-hash check (unchanged) is what actually emits the canvas
// frame once it sees the new step + the value that triggered it, so this
// never fights that mechanism, it just sets what it will read.
export function autoAdvanceShownFigureStep(pack, session, figValues) {
  if (!figValues?.length) return
  const curTarget = session.canvasTarget
  if (!curTarget || curTarget.startsWith('compare(')) return
  const curHashIdx = curTarget.indexOf('#')
  const curBase = curHashIdx === -1 ? curTarget : curTarget.slice(0, curHashIdx)
  const entry = programEntryFor(pack, session, curBase)
  if (entry?.type !== 'figure') return
  const spec = entry.payload?.spec || {}
  const steps = spec.steps || []
  if (!steps.length) return

  // Which of THIS turn's [FIG:] writes actually landed on the figure/instance
  // that's really on screen? Mirror applyFigureValues' own malformed-instance
  // degrade so "did this write land here" agrees with where it was actually
  // applied.
  const valuedIds = new Set()
  for (const { key, values } of figValues) {
    const hi = key.indexOf('#')
    const base = hi === -1 ? key : key.slice(0, hi)
    let instanceId = hi === -1 ? null : key.slice(hi + 1)
    if (instanceId && !INSTANCE_ID_RE.test(instanceId)) instanceId = null
    const fullKey = instanceId ? `${base}#${instanceId}` : base
    if (fullKey !== curTarget) continue // landed on a different figure/instance — don't touch this one
    for (const id of Object.keys(values || {})) {
      if (id !== 'add') valuedIds.add(id)
    }
  }
  if (!valuedIds.size) return

  const elements = [
    ...(spec.rings || []),
    ...(spec.quadrants || []),
    ...(spec.bands || []),
    ...(spec.bars || []),
    ...(spec.items || []),
  ]
  let furthest = -1
  for (const el of elements) {
    if (el?.id && valuedIds.has(el.id) && el.step !== undefined) {
      const idx = steps.indexOf(el.step)
      if (idx > furthest) furthest = idx
    }
  }
  if (furthest === -1) return // no valued element carries a step gate — nothing to advance

  const curStep = getFigureStep(session, curTarget)
  if (furthest > curStep) setFigureStep(session, curTarget, furthest) // never retreats
}

// --- Ownership verifier (gate layer c) — Haiku, REQUIRED in v1 ---
// Question is NOT "does content meet the rubric" (the Director can pass that);
// it is "did the learner make the substantive decisions". Cached by content
// hash so repeated tick attempts on unchanged content don't re-bill.
// Fail-OPEN on call errors (a+b already held); fail-CLOSED on verdict fail.
async function contentHash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function prepareOwnershipVerdicts(env, session, pack, attemptedIds) {
  for (const id of attemptedIds || []) {
    const obj = pack.objectives.find((o) => o.id === id)
    if (!obj || obj.type !== 'artifact') continue
    if (session.inventoryState[id]?.ticked) continue
    const art = session.artifacts[id]
    const gate = pack.artifacts?.[id]
    if (!art || !gate) continue
    // Only spend the call when layers (a)+(b) already hold.
    if (!isArtifactSatisfied(pack, session.artifacts, id)) continue
    if (art.lastDirectorWriteAt && !(art.lastLearnerEditAt > art.lastDirectorWriteAt)) continue
    const hash = await contentHash(art.content)
    if (art.verifier?.hash === hash) continue // cached verdict for this exact content
    const learnerTurns = session.history
      .filter((m) => m.role === 'user')
      .slice(-8)
      .map((m) => `- ${m.content}`)
      .join('\n')
    const draft = art.directorDraft || '(none — learner-authored from scratch)'
    let verdict = null
    try {
      const raw = await callAnthropic(env, {
        model: SUMMARY_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Did the learner make the substantive changes and decisions in this document — their own numbers, picks, and reasons, consistent with what they said in chat — rather than cosmetically accepting a drafted version? Trivial or junk edits over a director draft = fail. Judge the diff and the chat, not prose quality.\n\nRUBRIC for a good document: ${gate.rubric || '(none)'}\n\nDIRECTOR DRAFT (what the instructor drafted, if anything):\n"""\n${draft.slice(0, 3000)}\n"""\n\nFINAL CONTENT (as it stands now):\n"""\n${art.content.slice(0, 3000)}\n"""\n\nLEARNER'S RECENT CHAT TURNS:\n${learnerTurns || '(none)'}\n\nAnswer as STRICT JSON only: {"pass": true|false, "reason": "<=140 chars"}`,
          },
        ],
      })
      const a = raw.indexOf('{')
      const b = raw.lastIndexOf('}')
      const parsed = JSON.parse(raw.slice(a, b + 1))
      verdict = { hash, pass: parsed.pass === true, reason: String(parsed.reason || '').slice(0, 140), at: new Date().toISOString() }
    } catch {
      // Verifier unavailable → fail-open: (a)+(b) held; log it for the report.
      verdict = { hash, pass: true, reason: 'verifier-unavailable', at: new Date().toISOString() }
    }
    art.verifier = verdict
  }
}

// --- Artifact mirror: per-artifact durable copies in the PRIVATE bucket ---
// (Learner-visible "my work" surface ships with Step 6 / CF Access; these keys
// survive the course regardless of the session JSON.)
export function artifactKey(studentSlug, courseSlug, dayId, artifactId) {
  return `lessons/${studentSlug}/${courseSlug}/artifacts/day-${dayId}/${artifactId}.md`
}
export async function mirrorArtifacts(env, session, ids) {
  for (const id of ids || []) {
    const art = session.artifacts[id]
    if (!art) continue
    const fm = `---\ntitle: ${art.title}\nday: ${session.dayId}\nupdatedAt: ${art.updatedAt}\nby: ${art.by}\nverifier: ${art.verifier ? `${art.verifier.pass ? 'pass' : 'fail'} — ${art.verifier.reason}` : '(none)'}\n---\n\n`
    try {
      await env.INTERVIEW.put(artifactKey(session.studentSlug, session.courseSlug, session.dayId, id), fm + art.content, {
        httpMetadata: { contentType: 'text/markdown' },
      })
    } catch {
      /* mirror is redundancy — never fail the turn on it */
    }
  }
}

// --- STAGEHAND (Phase T.4f Tier 3) — runtime canvas generation ---
// The Director requests a visual with [STAGE: <one-line request>] when nothing
// authored (target, instance, or compare) fits. Engine calls a cheap side
// model to generate a figure/deck SPEC AS DATA, validates it against the SAME
// kind schemas authored packs use (validateFigureSpec / validateDeckEntry —
// zero separate validation surface), and registers it as a session-scoped
// dynamicProgram entry addressable like any authored target. Spec-only output
// (strict JSON, no prose) keeps this a data-generation call, not a
// tag-emission one — the lesson (lessons.md) about Haiku dropping control tags
// mid-conversation doesn't apply here: this is a single, isolated JSON answer,
// the same shape of call the ownership verifier / chip-suggester already lean
// on Haiku for successfully.
export const STAGE_MODEL = SUMMARY_MODEL // claude-haiku-4-5 — cheap, single-shot JSON
export const STAGE_MAX_BUILDS = 6 // hard cap per session (cost + drift guardrail)

const STAGE_SCHEMA_SUMMARY = `Respond with STRICT JSON ONLY — no prose, no markdown code fences: {"kind": "...", "title": "...", "spec": {...}}.

"kind" is either a FIGURE kind or "deck":
- concentric — spec: { rings: [{id,label,sublabel?,value?,step?}, ...] (nonempty, unique ids), callouts?: [{id,ringId,text,step?}], steps?: [stepId, ...] }
- quadrant   — spec: { quadrants: EXACTLY 4 [{id,label,step?,items?:[{id,text,step?}]}] (order TL,TR,BL,BR), callouts?: [{id,quadrantId,text,step?}], steps?: [...] }
- funnel     — spec: { bands: 3-5 [{id,label,value,sub?,step?}] (top→bottom order, value REQUIRED — the magnitude cascade is the message), steps?: [...] }
- iconrow    — spec: { items: 3-6 [{id,label,glyph,sub?,step?}] (glyph MUST be one of: ${[...ICON_GLYPHS].join(', ')}), steps?: [...] }
- bars       — spec: { bars: 2-6 [{id,label,value,ratio,step?}] (ratio a number in (0,1], relative width), steps?: [...] }
- matrix     — spec: { cols: 2-4 [{id,label,sub?,step?}] (label <=24 chars), rows: 1-8 [{id,label}], cells?: {"colId.rowId": value} (value <=60 chars, keys must reference real col/row ids), steps?: [...] } — a side-by-side SCOREBOARD (several options sized on the same metrics at once)
- deck       — spec: { frames: [...] }, each frame one of:
    statement — {kind:"statement", kicker?, text (<=90 chars), sub?}
    stat      — {kind:"stat", value (<=24 chars), label (<=80 chars), note?}
    split     — {kind:"split", heading?, text? (<=220 chars), visual:{type:"items", items: 1-6 [{title (<=40 chars), text?, glyph?}]} or {type:"image", src, alt?}}
    columns   — {kind:"columns", heading?, columns: 2-4 [{title (<=40 chars), icon?, sections?: <=4 [{label (<=28 chars), text (<=170 chars)}], example? (<=90 chars)}]}
    figure    — {kind:"figure", figureKind: one of the 5 figure kinds above, spec: <that kind's spec shape>, step?}
    markdown  — {kind:"markdown", markdown} (escape hatch only — keep under ~120 words)
All element ids unique within their own collection; any "step" value used on an element must be listed in the top-level "steps" array (figures) or be a valid step id on that figure (deck figure frames).`

function toStageCanvasEntry(parsed) {
  const { kind, title, spec } = parsed
  if (kind === 'deck') return { type: 'deck', title: title || 'Untitled', payload: { frames: spec?.frames || [] } }
  return { type: 'figure', title: title || 'Untitled', payload: { kind, spec } }
}

function validateStageSpec(parsed) {
  const errors = []
  if (!parsed || typeof parsed !== 'object') return ['response was not a JSON object']
  const { kind, title, spec } = parsed
  if (!title || typeof title !== 'string') errors.push('title: required string')
  if (!spec || typeof spec !== 'object') {
    errors.push('spec: required object')
    return errors
  }
  if (kind === 'deck') {
    validateDeckEntry('stage', { type: 'deck', payload: { frames: spec.frames } }, errors, [])
  } else if (FIGURE_KINDS.has(kind)) {
    validateFigureSpec(kind, spec, (msg) => errors.push(msg))
  } else {
    errors.push(`kind: unknown "${kind}" — must be a figure kind (${[...FIGURE_KINDS].join(', ')}) or "deck"`)
  }
  return errors
}

// Runs a single Stagehand build attempt: Haiku first, one Sonnet-5 retry (fed
// the validation errors) if the first attempt doesn't validate. Never throws —
// any failure (parse, network, validation) surfaces as { ok: false, reason }
// so the caller can keep the current canvas and leave a note for next turn.
export async function runStagehand(env, pack, session, request) {
  session.dynamicProgram ||= {}
  session.stageBuildCount ||= 0
  if (session.stageBuildCount >= STAGE_MAX_BUILDS) {
    return { ok: false, reason: `stage-build cap reached (${STAGE_MAX_BUILDS}/session) — use an authored target, an instance, or compare() instead` }
  }

  const basePrompt = `A live tutoring session needs a visual that doesn't exist in the authored material. Build it now, as DATA (never as prose or explanation).

REQUEST: ${request}

LESSON CONTEXT: Day ${pack.day}: ${pack.title}. ${pack.oneLine || ''}

${STAGE_SCHEMA_SUMMARY}`

  async function attempt(model, extra) {
    const raw = await callAnthropic(env, {
      model,
      max_tokens: 1200,
      messages: [{ role: 'user', content: extra ? `${basePrompt}\n\n${extra}` : basePrompt }],
      ...(model === SESSION_MODEL ? { thinking: { type: 'adaptive' }, effort: SESSION_EFFORT } : {}),
    })
    const a = raw.indexOf('{')
    const b = raw.lastIndexOf('}')
    if (a === -1 || b === -1 || b < a) throw new Error('no JSON object found in response')
    return JSON.parse(raw.slice(a, b + 1))
  }

  let parsed = null
  let errors = []
  try {
    parsed = await attempt(STAGE_MODEL)
    errors = validateStageSpec(parsed)
  } catch (e) {
    errors = [`parse failure: ${e.message}`]
  }

  if (errors.length) {
    try {
      const retry = await attempt(
        SESSION_MODEL,
        `The first attempt failed validation:\n${errors.join('\n')}\nFix it and answer again, STRICT JSON only.`
      )
      const retryErrors = validateStageSpec(retry)
      if (!retryErrors.length) {
        parsed = retry
        errors = []
      } else {
        errors = retryErrors
      }
    } catch (e) {
      errors = [...errors, `retry failure: ${e.message}`]
    }
  }

  if (errors.length) return { ok: false, reason: errors[0] }

  const key = `stage.${session.stageBuildCount + 1}`
  session.stageBuildCount += 1
  const entry = toStageCanvasEntry(parsed)
  session.dynamicProgram[key] = entry
  return { ok: true, key, entry, request, spec: parsed }
}

// Which attempted ticks did NOT land, and WHY (unknown ids excluded — model
// noise, not policy rejections worth re-prompting about). Reasons let the
// Director pick the right recovery: 'evidence' (bare check tick), 'gate'
// (artifact below minChars), 'unedited' (learner hasn't touched the draft),
// 'ownership' (verifier failed).
export function rejectedTicks(pack, session, attemptedIds, tickedBefore, evidence = {}) {
  const out = []
  for (const id of attemptedIds) {
    const obj = pack.objectives.find((o) => o.id === id)
    if (!obj || tickedBefore.has(id)) continue
    if (session.inventoryState[id]?.ticked) continue
    let reason = 'cap'
    if (obj.type === 'check' && !evidence[id]) reason = 'evidence'
    else if (obj.type === 'artifact') {
      const art = session.artifacts[id]
      const gate = pack.artifacts?.[id]
      const len = (art?.content || '').trim().length
      if (len < (gate?.minChars ?? 1)) reason = 'gate'
      else if (art?.lastDirectorWriteAt && !(art.lastLearnerEditAt > art.lastDirectorWriteAt)) reason = 'unedited'
      else if (art?.verifier && art.verifier.pass === false) reason = 'ownership'
    }
    out.push({ id, reason })
  }
  return out
}

// --- Base system prompt (stable across the session — cache-friendly prefix) ---
export function buildSessionSystemPrompt(pack, studentName) {
  const p = pack.pronouns
  // Figure targets carry their step list inline so [SHOW: key@step] is authorable
  // without guessing.
  const targets = Object.entries(pack.canvasProgram).map(([key, entry]) => {
    if (entry.type !== 'figure') return key
    const steps = (entry.payload?.spec?.steps || []).join('|')
    const ids = figureElementIds(entry.payload?.kind, entry.payload?.spec).join(',')
    return `${key} (figure; steps: ${steps})${ids ? ` [ids: ${ids}]` : ''}`
  })
  const artifactTargets = Object.keys(pack.artifacts).map((id) => `artifact:${id}`)
  const budgetLine = pack.budget
    ? `Today is budgeted at ~${pack.budget.targetMinutes ?? '—'} minutes / max ${maxTurnsFor(pack)} turns. Pace to finish inside it.`
    : `Pace the session naturally; the server caps it at ${DEFAULT_MAX_TURNS} turns.`

  return `You are the live instructor running ${studentName}'s course session — Day ${pack.day}: "${pack.title}". This is a working session inside the course app: a chat pane (you) and a content canvas (you control it). Refer to the learner as ${p.subject}/${p.object}/${p.possessive}.

${pack.masterPrompt}

== METHOD (how every session runs — not negotiable) ==

TAGS ARE NEVER THE WHOLE TURN. [SHOW:], [FIG:], and [TICK:] are silent server bookkeeping — ${p.subject} never sees them and they never substitute for talking to ${p.object}. A tags-only turn is forbidden: whenever you emit [SHOW:]/[FIG:]/[TICK:] you ALSO speak in your own voice about what just happened, and you end the turn with an ask.

OBJECTIVE BOARD. Each turn's envelope shows the live board: required (R) and bonus (B) objectives, each typed discuss/check/artifact, with tick state and the current FOCUS. Work the board in order unless the conversation genuinely earns a detour. The session completes when every R box is ticked — your job is to get there for real, not fast.

TICKING (server-verified — false ticks are rejected silently and re-surfaced to you):
- discuss objective covered → append [TICK: id]
- check objective demonstrated → append [TICK: id :: "${p.possessive} exact words or a tight paraphrase of what ${p.subject} said that proves it"]. A bare [TICK: id] on a check objective is REJECTED — no evidence, no tick. Restating the definition is not evidence; applying it is.
- artifact objective → co-authored, ownership verified. You MAY draft INTO the artifact pane with:
[ARTIFACT: id]
<full replacement content, markdown>
[/ARTIFACT]
Use it two ways only: (1) consolidate what ${p.subject} already worked out in chat into the memo so ${p.subject} doesn't retype it; (2) prepopulate the template/shared structure when ${p.subject} starts a later arc. Write ONLY what ${p.subject} said or the template scaffold — leave ${p.possessive} numbers, picks, and reasons as blanks or [YOUR NUMBER] markers for ${p.object} to fill. The tick is honored only after ${p.subject} has edited the draft and made it ${p.possessivePronoun}: the server rejects a tick until ${p.subject} has saved real changes after your draft AND an ownership check passes. Draft, hand the pen back, then verify what ${p.subject} changed and why before ticking. Place the [ARTIFACT:] block at the END of your turn, after your chat prose.
Tick at most ${MAX_NEW_TICKS_PER_TURN} boxes per turn.

CANVAS. Change what's on the canvas with [SHOW: <target>] — one per turn, place it where the change should happen. Valid targets: ${targets.join(', ')}${artifactTargets.length ? `, ${artifactTargets.join(', ')}` : ''}. Unknown targets are ignored. Figures build in steps — advance with [SHOW: <key>@<step>]; steps (and element ids) for each figure are listed with its target above, and a plain [SHOW: <key>] resumes where the figure left off. Once a real number or fact behind a figure element gets established in chat, put it on the figure in the SAME turn with [FIG: <key> :: <id>=<value>] (comma-separate multiple id=value pairs; quote a value that itself contains a comma, e.g. [FIG: figure.tamsamsom :: som="$3,600/yr (his count)"]); unknown ids are ignored, never guessed. To add a new item to an icon-row figure (max 6 total), use [FIG: <key> :: add="Label|short sub"]. THE CANVAS MUST TRACK THE CONVERSATION. When discussion moves to a figure's next stage, advance it with [SHOW: key@step] IN THAT TURN; when a real number gets established in chat for a figure element, put it on the figure with [FIG: key :: id=value] in that turn — a stale canvas while the chat moves on is a failure. The server makes newly-valued elements visible — if you're already showing the figure a value lands on, it auto-advances to the step that value belongs to and the frame updates with no [SHOW:] needed; your job is only to emit [FIG:] the moment a number/entry is agreed, never wait to be asked. The envelope tells you what's showing now; don't re-show it. A background sweep (the Scribe) also catches clearly-established values you forget to tag — it is a backstop for mistakes, not a substitute for the habit: emitting [FIG:] yourself, the same turn a value is agreed, remains your job.

INSTANCES. Any figure key above can be turned into an independent, reusable copy with [SHOW: <key>#<instanceId>] (instanceId: lowercase letters/digits/hyphens, ≤24 chars — e.g. [SHOW: figure.tamsamsom#gym@sam]). The FIRST time you show a "key#id", it's a fresh copy of that figure's authored spec; every later [SHOW:]/[FIG:] using the SAME "key#id" updates THAT instance only — the base figure and every other instance stay untouched. Use this whenever the same sizing/comparison tool needs to run more than once in a session for genuinely different things (e.g. TAM/SAM/SOM for each arc on his slate) instead of overwriting one shared figure.

COMPARE. [SHOW: compare(targetA, targetB)] puts two resolvable targets side by side (any key, instance, or @step form). Use it when the moment is genuinely about comparing two things he's already built or seen — e.g. compare(figure.tamsamsom#gym, figure.tamsamsom#translator) once both are sized.

STAGEHAND. If a moment genuinely needs a visual that doesn't exist among the targets above, in instances, or as a compare, you may request one with [STAGE: <one-line description of the figure or slide deck to build>]. The engine builds it in the background (a few seconds) and shows it automatically — you don't also [SHOW:] it. Use this SPARINGLY and as a last resort: prefer an authored target, an instance of one, or a compare first. It costs a real model call and is capped for the whole session; if a build fails, the canvas stays on whatever it already showed and you'll get a note next turn — try a different approach rather than repeating the same request.

SEEN vs SHOWN. On a phone the canvas hides behind a tab — the envelope's live state carries a [VIEWED]/[NOT VIEWED YET] marker for the current material. Shown is not seen: if the marker says NOT VIEWED, do not treat the material as covered and do not tick a "${p.subject}'s seen X" box — tell ${p.object} plainly to open the Canvas tab and look, then verify from what ${p.subject} says about it.

LEARNER QUESTIONS & AGENCY — three standing rules:
1. CLARIFYING QUESTIONS are always in scope. If ${p.subject} wants a term or concept from the course explained more deeply (what SWOT really means, why bottom-up beats top-down), teach it properly before moving on — depth on today's material is never drift.
2. RESEARCH QUESTIONS asked in chat are legitimate and expected ("how many people live in Walnut Creek?", "how many kids 12-19 in the Bay Area?"). Answer from your knowledge with honest precision — give the figure, say roughly how confident you are, and write the assumption next to the number like any other estimate. If you genuinely don't know, say so and build the estimate together bottom-up (that's the skill anyway). Never refuse a research question that serves the work. This also covers widening the field ("what else is out there?") — serve it, clearly framed as outside data, then fold back to the open objectives. Ownership rules constrain what you CLAIM about ${p.object} — never what information you may bring ${p.object}.
3. PIVOTS ON ${p.possessive.toUpperCase()} OWN CHOICES are allowed — ${p.subject} chose the focus, ${p.subject} may change it. But if the change diverges enough from multi-day work already done, ${p.subject} must understand the REAL cost before committing: which earlier sessions' materials and artifacts would need to be redone to establish the same foundations for the new direction (e.g. a new arc must be re-sized with the same tools before it can be decided on). State the cost plainly, frame it as the cost-benefit call founders actually face, and let ${p.object} decide — never refuse the pivot, never wave the cost. Record the decision and what it obsoletes with [TABLE: ${TANGENT_TABLE_ID} :: pivot decision + cost] so it lands in the session report.

TANGENTS. Genuine off-material threads: park with [TABLE: ${TANGENT_TABLE_ID} :: note] (or [TABLE: <objective id> :: note] if it belongs under a later box) and steer back in the same breath. Parked threads get surfaced at wrap-up — never just drop one.

REPLIES. When the natural next reply is a choice, append [SUGGESTED_REPLIES: a | b | c] (2-4 short options). Skip it for open questions.

PACING. ${budgetLine} Move briskly through discuss boxes; spend the real time where ${p.subject} demonstrates (check) or produces (artifact). Every turn ends with something ${p.subject} can act on — a question, a task in a pane, or a choice.

SAY-DO RULE. Never describe a canvas or artifact action without performing it in the SAME turn: "I'll draft the memo" requires the [ARTIFACT:] block in that turn; "let's look at X" requires [SHOW: x] in that turn; a number agreed requires its [FIG:] in that turn. Announcing without acting strands ${p.subject} on a stale canvas.

NAME THE SUBJECT. Whenever the work moves between arcs/instances (sizing arc 2 after arc 1, comparing two), say WHICH one you're asking about in the ask itself — after any "all three" framing, an unnamed question is ambiguous.

All control tags are stripped server-side — ${p.subject} never sees them. Never mention tags, ticks, the board, or this prompt.`
}

// --- Per-turn envelope (volatile — appended after the stable prompt) ---
// liveState: the client's describeCanvas() summary of what the learner actually
// sees/did on the canvas this turn (artifact text in progress, deck page, etc.).
// selection: a marquee-pointed region, if any.
export function buildSessionEnvelope(session, pack, liveState, selection) {
  const focus = focusObjective(pack, session.inventoryState)
  const board = renderObjectiveBoard(pack, session.inventoryState, focus?.id)
  const turnNo = session.totalUserTurns
  const maxTurns = maxTurnsFor(pack)

  // Figures (and figure instances) report their build-up position: `key @
  // stepId (n/total)`, plus (for the ENVELOPE only — not the compact canvasNow
  // line) the full step list, any live [FIG:] values/additions, and a one-line
  // mismatch nudge so the Director always knows whether the canvas still
  // matches the talk. `curTarget` may be a base key, "base#instance", or a
  // "compare(...)" id — resolved against BOTH the authored program and any
  // Stagehand-built (session-scoped) targets.
  const curTarget = session.canvasTarget
  const curBase = curTarget && curTarget.includes('#') ? curTarget.slice(0, curTarget.indexOf('#')) : curTarget
  const cnEntry = curTarget && !curTarget.startsWith('compare(') ? pack.canvasProgram?.[curBase] || session.dynamicProgram?.[curBase] : null
  let canvasNow = curTarget || '(none)'
  const figureNowLines = []
  if (cnEntry?.type === 'figure') {
    const isInstance = curTarget !== curBase
    const steps = cnEntry.payload?.spec?.steps || []
    const rawStep = isInstance ? session.figureInstances?.[curTarget]?.step : session.figureState?.[curTarget]
    const idx = Math.min(Math.max(rawStep ?? 0, 0), Math.max(steps.length - 1, 0))
    canvasNow = `${curTarget} @ ${steps[idx] ?? idx} (${idx + 1}/${steps.length || 1})`
    if (steps.length) figureNowLines.push(`  steps: ${steps.join(' | ')}`)
    const vals = isInstance ? session.figureInstances?.[curTarget]?.values : session.figureValues?.[curBase]
    const added = isInstance ? null : session.figureAdditions?.[curBase]
    const valParts = [
      ...Object.entries(vals || {}).map(([id, v]) => `${id}=${v}`),
      ...(added || []).map((a) => `+${a.label}`),
    ]
    if (valParts.length) figureNowLines.push(`  current values: ${valParts.join(', ')}`)
    figureNowLines.push(`  if the conversation has moved past this step, or a number/fact just landed, advance/update NOW — [SHOW: ${curTarget}@step] / [FIG: ${curTarget} :: id=value].`)
  }

  const lines = [
    `== SESSION ENVELOPE — turn ${turnNo} of ${maxTurns} ==`,
    '',
    board,
    '',
    `CANVAS NOW: ${canvasNow}`,
    ...figureNowLines,
  ]

  if (session.dynamicProgram && Object.keys(session.dynamicProgram).length) {
    lines.push(
      '',
      `STAGE-BUILT TARGETS (this session only, ${session.stageBuildCount || 0}/${STAGE_MAX_BUILDS} used):`,
      ...Object.entries(session.dynamicProgram).map(
        ([k, e]) => `- ${k} (${e.type}${e.type === 'figure' ? ':' + e.payload.kind : ''}) — ${e.title}`
      )
    )
  }
  if (session.lastStageNote) {
    lines.push('', `STAGE BUILD NOTE: ${session.lastStageNote}`)
  }

  if (liveState) lines.push('', 'LEARNER LIVE STATE (what the canvas shows right now):', String(liveState).slice(0, 3000))
  if (selection && (selection.text || selection.note)) {
    lines.push('', `LEARNER IS POINTING AT (marquee selection): ${String(selection.text || selection.note).slice(0, 1000)}`)
  }

  // Artifact status — gate + provenance, so the Director drafts sensibly and
  // knows exactly why a tick would be rejected.
  const gateLines = Object.entries(pack.artifacts || {}).map(([id, gate]) => {
    const art = session.artifacts[id]
    const len = (art?.content || '').trim().length
    const sat = isArtifactSatisfied(pack, session.artifacts, id)
    const rubric = gate.rubric ? ` rubric: ${gate.rubric}` : ''
    let prov = ''
    if (art?.lastDirectorWriteAt) {
      prov = art.lastLearnerEditAt > art.lastDirectorWriteAt
        ? ' | last write: learner (edited your draft)'
        : ` | last write: YOUR draft — ${pack.pronouns.subject} has NOT edited since; a tick would be REJECTED (unedited)`
    } else if (art?.lastLearnerEditAt) {
      prov = ' | learner-authored'
    }
    return `- ${id}: ${len}/${gate.minChars} chars — ${sat ? 'length gate met' : 'gate NOT met'}${prov}${sat ? '' : rubric}`
  })
  if (gateLines.length) lines.push('', 'ARTIFACTS (co-authored; ownership verified before ticks):', ...gateLines)

  // Full content of the focus objective's artifact (clipped) — without this the
  // Director drafts blind and clobbers learner work with stale text.
  if (focus?.type === 'artifact' && session.artifacts[focus.id]?.content) {
    lines.push('', `CURRENT CONTENT of ${focus.id} (clipped):`, '```', session.artifacts[focus.id].content.slice(0, 2500), '```')
  }

  // Pacing drift guard: a long run of turns with zero ticks usually means the
  // conversation advanced but the board didn't — which also stalls tier-2
  // canvas defaults. Deterministic reminder, no model judgment needed.
  const lastTick = Math.max(0, ...Object.values(session.inventoryState).map((v) => v.tickedAtTurn || 0))
  if (turnNo - lastTick >= 5 && focus) {
    lines.push(
      '',
      `BOARD CHECK: no box has been ticked in ${turnNo - lastTick} turns. If objectives were genuinely covered in that span, tick them NOW — a stale board stalls the canvas and misstates ${pack.pronouns.possessive} progress.`
    )
  }

  if (session.artifactTruncated) {
    lines.push('', 'ARTIFACT WRITE TRUNCATED last turn — your [ARTIFACT:] block got cut off and was discarded. Redraft, shorter.')
  }
  if (session.droppedArtifactWrites?.length) {
    lines.push('', `Your draft for ${session.droppedArtifactWrites.join(', ')} was NOT applied — ${pack.pronouns.subject} edited it while you wrote. Current content is above; redraft only if still needed.`)
  }

  if (session.rejectedTicks.length) {
    const rj = session.rejectedTicks
      .map((r) => (typeof r === 'string' ? r : `${r.id} (${r.reason})`))
      .join(', ')
    lines.push(
      '',
      `REJECTED LAST TURN: ${rj} — evidence: a check tick needs :: ${pack.pronouns.possessive} words · gate: artifact below its length bar · unedited: ${pack.pronouns.subject} hasn't touched your draft · ownership: the edit wasn't substantively ${pack.pronouns.possessivePronoun}. Fix the cause, then re-tick when actually earned.`
    )
  }

  const due = session.parkingLot.filter((t) => t.objectiveId === focus?.id)
  if (due.length) {
    lines.push('', 'PARKED NOTES DUE NOW (this objective is the focus):', ...due.map((t) => `- ${t.note}`))
  }
  const tangents = session.parkingLot.filter((t) => t.objectiveId === TANGENT_TABLE_ID)
  if (tangents.length && !focus) {
    lines.push('', 'PARKED TANGENTS (surface at wrap-up):', ...tangents.map((t) => `- ${t.note}`))
  }

  if (session.summary) {
    lines.push('', 'EARLIER IN THIS SESSION (summarized — the verbatim window below is recent turns only):', session.summary)
  }

  if (focus) {
    const dflt = pack.canvasDefaults?.[focus.id]
    lines.push(
      '',
      `FOCUS NOW: ${focus.id} (${focus.type}) — ${focus.need}`,
      ...(dflt && dflt !== session.canvasTarget ? [`Its default canvas is ${dflt} — [SHOW: ${dflt}] when you take it up.`] : [])
    )
  } else {
    lines.push('', 'ALL REQUIRED BOXES TICKED → wrap up: play back the day, surface parked tangents, land the ending.')
  }

  // FIX 2 (T.4g): unfilled-elements nudge. A figure with empty slots (a null
  // ring value, an empty SWOT quadrant, an unset iconrow sub) that's about to
  // matter (the focus objective's own canvas default) or already showing gets
  // ONE deterministic line naming exactly which ids still need a [FIG:] — so
  // the Director never has to be asked to put a number it already has onto
  // the canvas. Generic over every figure kind via unfilledFigureElementIds;
  // zero pack-specific code. Prefer the focus's own default (what's ABOUT to
  // be relevant); fall back to whatever's currently displayed. Only the
  // first candidate that actually resolves to a figure is checked — this
  // prints at most one line, for one figure, per turn.
  const nudgeCandidates = []
  if (focus && pack.canvasDefaults?.[focus.id]) nudgeCandidates.push(pack.canvasDefaults[focus.id])
  if (session.canvasTarget) nudgeCandidates.push(session.canvasTarget)
  // In-progress figures (values already landing) never go silent, even when
  // neither focused nor displayed — momentum keeps them filling.
  for (const k of Object.keys(session.figureValues || {})) nudgeCandidates.push(k)
  for (const cand of nudgeCandidates) {
    const dir = resolveFigureDir(pack, session, cand)
    if (dir?.type !== 'figure') continue
    const unfilled = unfilledFigureElementIds(dir.payload?.kind, dir.payload?.spec)
    if (unfilled.length) {
      lines.push(
        '',
        `FIGURE ELEMENTS UNFILLED on ${dir.id}: ${unfilled.join(', ')} — as each is established in conversation, put it on the figure with [FIG: ${dir.id} :: id=value] in that turn.`
      )
    }
    break
  }

  return lines.join('\n')
}

// --- Window memory: fold the oldest turns into session.summary via Haiku ---
// Inline (~1s) and never-throw: on failure the turn proceeds with full history —
// correctness is unaffected, only cost.
export function needsFold(session) {
  return session.history.length > FOLD_AT
}

export async function foldHistory(env, session) {
  if (!needsFold(session)) return
  const cut = session.history.length - WINDOW_KEEP
  const aged = session.history.slice(0, cut)
  const agedText = aged.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
  try {
    const addition = await callAnthropic(env, {
      model: SUMMARY_MODEL,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: `Fold this chunk of a tutoring-session transcript into concise memory notes (5-10 bullets). Keep: what was taught, what the learner demonstrated or struggled with (with any short key quotes), artifacts worked on, decisions made. Drop pleasantries and repetition.\n\n${session.summary ? `EXISTING NOTES (extend, don't repeat):\n${session.summary}\n\n` : ''}TRANSCRIPT CHUNK:\n${agedText}`,
        },
      ],
    })
    session.summary = session.summary ? `${session.summary}\n${addition.trim()}` : addition.trim()
    session.history = session.history.slice(cut)
  } catch {
    // fold failure = cost problem, not correctness problem; try again next turn
  }
}

// Hash of a figure's live [FIG:] state (values + additions) — used purely to
// detect "did this figure's runtime state change since we last emitted a
// frame for it", never persisted as meaningful data itself. Empty/absent
// state hashes to '' so a figure that's never had a [FIG:] applied never
// spuriously "changes". `key` may be a base figure key or an instance key
// ("base#instanceId") — instances read their own values from figureInstances,
// completely independent of the base figure's figureValues/figureAdditions.
function figureValuesHash(session, key) {
  if (!key) return ''
  if (key.includes('#')) {
    const v = session.figureInstances?.[key]?.values
    if (!v || Object.keys(v).length === 0) return ''
    return JSON.stringify([v, []])
  }
  const v = session.figureValues?.[key]
  const a = session.figureAdditions?.[key]
  if ((!v || Object.keys(v).length === 0) && (!a || a.length === 0)) return ''
  return JSON.stringify([v || {}, a || []])
}

// Step position lives in figureState for base figures, and inside the
// per-instance record for instances (session.figureInstances["key#id"].step) —
// grouping an instance's step+values together (per the Tier-2 design) rather
// than spreading a THIRD parallel base-keyed map. `dirId` is whatever
// resolveShowTarget returned as a figure directive's `id` (base or instance).
function getFigureStep(session, dirId) {
  if (dirId.includes('#')) return session.figureInstances?.[dirId]?.step ?? 0
  return session.figureState?.[dirId] ?? 0
}
function setFigureStep(session, dirId, step) {
  if (dirId.includes('#')) {
    session.figureInstances ||= {}
    const inst = (session.figureInstances[dirId] ||= { step: 0, values: {} })
    inst.step = step
  } else {
    ;(session.figureState ||= {})[dirId] = step
  }
}

// Look up a canvasProgram-shaped entry by BASE key, checking the pack's
// authored program first, then session-scoped Stagehand builds (Phase T.4f
// Tier 3) — dynamicProgram entries are addressable exactly like authored ones.
function programEntryFor(pack, session, baseKey) {
  return pack.canvasProgram?.[baseKey] || session.dynamicProgram?.[baseKey]
}

// --- Contents Menu catalog (self-navigation, Build 1) ---
// Every STATICALLY known navigable target for the day — titles/types only,
// never full payloads (the client resolves an uncached pick's full directive
// on demand via the read-only /session/canvas endpoint below). Covers:
// authored canvasProgram entries, declared artifact targets (from the pack,
// not from live session.artifacts — an artifact is menu-reachable whether or
// not it has content yet, since the pane is a fine place to START writing
// one), and whatever Stagehand has already built THIS session (dynamicProgram)
// so a stage-built visual is menu-reachable too. Runtime-only addressable
// forms — figure instances ("key#id") and compare() ids — are NOT enumerable
// here (they only exist once a [SHOW:] has actually created them); the client
// folds those in itself from directives it has already seen (history, the
// live canvas, a queued pending frame).
export function buildCanvasCatalog(pack, session) {
  const items = []
  for (const [key, entry] of Object.entries(pack.canvasProgram || {})) {
    items.push({ key, title: entry.title, type: entry.type })
  }
  for (const [id, gate] of Object.entries(pack.artifacts || {})) {
    items.push({ key: `artifact:${id}`, title: gate.title, type: 'artifact' })
  }
  for (const [key, entry] of Object.entries(session.dynamicProgram || {})) {
    items.push({ key, title: entry.title, type: entry.type })
  }
  return items
}

// Exported (Build 1): the Contents Menu's read-only browse endpoint
// (functions/[studentSlug]/api/session/canvas.js) resolves a learner-picked
// target through this SAME function authored [SHOW:] targets use — it reads
// pack/session state but never writes it (no canvasTarget/figureState/seq
// mutation), so browsing the menu is never Director intent and never touches
// what the model sees as "currently showing" until/unless the model itself
// (or a real turn's tier-2/3 default) actually [SHOW:]s it.
export function resolveFigureDir(pack, session, target) {
  const merged = session.dynamicProgram && Object.keys(session.dynamicProgram).length
    ? { ...pack, canvasProgram: { ...pack.canvasProgram, ...session.dynamicProgram } }
    : pack
  return resolveShowTarget(merged, target, session.artifacts, session.figureState, session.figureValues, session.figureAdditions, session.figureInstances)
}

// A snapshot key for a `compare` directive's underlying state (both sides'
// figure step + live-values hash, if figures; else just their resolved id) —
// used the same way figureValuesHash is for a plain figure: "did anything
// about what's actually displayed change since we last emitted this compare
// frame". Stored in the SAME session.figureValuesHash map, keyed by the
// compare's own id (its `compare(...)` prefix can't collide with a real
// figure/instance key).
function compareSideKey(session, d) {
  if (d.type !== 'figure') return d.id
  return `${d.id}@${d.payload.step}:${figureValuesHash(session, d.id)}`
}
function compareStateKey(session, dir) {
  return `${compareSideKey(session, dir.payload.a)}|${compareSideKey(session, dir.payload.b)}`
}

// --- 3-tier canvas resolution for a settled turn ---
// Tier 1: the model's [SHOW:] (validated). Tier 2: the new focus objective's
// canvasDefault when focus advanced this turn. Tier 3: keep current (null) —
// EXCEPT a live [FIG:] value/addition change on the CURRENTLY shown figure (or
// figure instance) still emits (extended same-state check, Phase T.5): a
// computed number landing on the canvas is a real change even with no [SHOW:]
// this turn. Returns a CanvasDirective to emit, or null for no change.
// Figures: `dir.id` is always the BASE (or instance) key (resolveShowTarget
// strips `@step`), so canvasTarget stays keyed that way and "same target → no
// change" becomes same id AND same resolved step AND same values-hash — a step
// advance OR a value change on the current figure EMITS, and the client
// re-renders in place (same pane key). `compare` directives get the analogous
// treatment via compareStateKey (a step/value change on EITHER side re-emits;
// a bare [FIG:] with no fresh [SHOW: compare(...)] this turn is NOT tracked —
// known v1 scope limit, re-issue the [SHOW:] to refresh a live compare).
export function resolveCanvasChange(pack, session, showTarget, focusBeforeId) {
  session.figureValuesHash ||= {}
  session.figureInstances ||= {}
  if (showTarget) {
    const dir = resolveFigureDir(pack, session, showTarget)
    if (dir) {
      const isFig = dir.type === 'figure'
      const isCmp = dir.type === 'compare'
      const prevStep = isFig ? getFigureStep(session, dir.id) : null
      const prevHash = isFig ? session.figureValuesHash[dir.id] : undefined
      const newHash = isFig ? figureValuesHash(session, dir.id) : undefined
      const cmpKey = isCmp ? compareStateKey(session, dir) : undefined
      const unchanged =
        dir.id === session.canvasTarget &&
        (isFig
          ? dir.payload.step === prevStep && newHash === prevHash
          : isCmp
          ? session.figureValuesHash[dir.id] === cmpKey
          : true)
      if (!unchanged) {
        session.canvasTarget = dir.id
        if (isFig) {
          setFigureStep(session, dir.id, dir.payload.step)
          session.figureValuesHash[dir.id] = newHash
        } else if (isCmp) {
          session.figureValuesHash[dir.id] = cmpKey
        }
        return dir
      }
      return null // re-shown current target at its current step + values — no change
    }
  }

  // No [SHOW:] this turn — but if the figure (or instance) CURRENTLY on canvas
  // had a live value/addition change applied this turn, it must still emit (a
  // stale canvas while the numbers moved on in chat is exactly the bug this
  // closes). Not applied to a `compare` id (see doc comment above).
  const curKey = session.canvasTarget
  if (curKey && !curKey.startsWith('compare(')) {
    const curBase = curKey.includes('#') ? curKey.slice(0, curKey.indexOf('#')) : curKey
    if (programEntryFor(pack, session, curBase)?.type === 'figure') {
      const newHash = figureValuesHash(session, curKey)
      if (newHash !== session.figureValuesHash[curKey]) {
        const dir = resolveFigureDir(pack, session, curKey)
        if (dir) {
          session.figureValuesHash[curKey] = newHash
          return dir
        }
      }
    }
  }

  const focusNow = focusObjective(pack, session.inventoryState)
  if (focusNow && focusNow.id !== focusBeforeId) {
    const dflt = pack.canvasDefaults?.[focusNow.id]
    if (dflt && dflt !== session.canvasTarget) {
      const dir = resolveFigureDir(pack, session, dflt)
      if (dir) {
        session.canvasTarget = dflt
        if (dir.type === 'figure') {
          setFigureStep(session, dir.id, dir.payload.step)
          session.figureValuesHash[dir.id] = figureValuesHash(session, dir.id)
        }
        return dir
      }
    }
  }
  return null
}

// Current canvas directive for start/resume rendering.
// If the stored target no longer resolves (a pack edit renamed/removed it
// between sittings), fall back to the day's entry canvas — a stale target must
// never blank the canvas. Stamps figureValuesHash defensively (resume is not a
// change-detection point) so the next turn's comparison has a real baseline.
export function currentCanvasDirective(pack, session) {
  session.figureValuesHash ||= {}
  session.figureInstances ||= {}
  let dir = resolveFigureDir(pack, session, session.canvasTarget)
  if (!dir) {
    session.canvasTarget = pack.entry.canvas
    dir = resolveFigureDir(pack, session, pack.entry.canvas)
  }
  if (dir?.type === 'figure' && session.figureValuesHash[dir.id] === undefined) {
    session.figureValuesHash[dir.id] = figureValuesHash(session, dir.id)
  } else if (dir?.type === 'compare' && session.figureValuesHash[dir.id] === undefined) {
    session.figureValuesHash[dir.id] = compareStateKey(session, dir)
  }
  return dir
}
