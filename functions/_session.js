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

import {
  getSessionPack,
  newObjectiveState,
  focusObjective,
  isComplete,
  progressInfo,
  isArtifactSatisfied,
  resolveShowTarget,
  renderObjectiveBoard,
  TANGENT_TABLE_ID,
  DEFAULT_REPORT_SCHEMA,
} from './_sessionPacks.js'
import { callAnthropic, readJSON, writeJSON } from './_turnCore.js'
import { ensureAsk } from './_usher.js'

// Usher re-exports so the session endpoints import everything from here.
export { resolveChips, looksAnswerable } from './_usher.js'

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
  const targets = Object.entries(pack.canvasProgram).map(([key, entry]) =>
    entry.type === 'figure'
      ? `${key} (figure; steps: ${(entry.payload?.spec?.steps || []).join('|')})`
      : key
  )
  const artifactTargets = Object.keys(pack.artifacts).map((id) => `artifact:${id}`)
  const budgetLine = pack.budget
    ? `Today is budgeted at ~${pack.budget.targetMinutes ?? '—'} minutes / max ${maxTurnsFor(pack)} turns. Pace to finish inside it.`
    : `Pace the session naturally; the server caps it at ${DEFAULT_MAX_TURNS} turns.`

  return `You are the live instructor running ${studentName}'s course session — Day ${pack.day}: "${pack.title}". This is a working session inside the course app: a chat pane (you) and a content canvas (you control it). Refer to the learner as ${p.subject}/${p.object}/${p.possessive}.

${pack.masterPrompt}

== METHOD (how every session runs — not negotiable) ==

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

CANVAS. Change what's on the canvas with [SHOW: <target>] — one per turn, place it where the change should happen. Valid targets: ${targets.join(', ')}${artifactTargets.length ? `, ${artifactTargets.join(', ')}` : ''}. Unknown targets are ignored. Figures build in steps — advance with [SHOW: <key>@<step>]; steps for each figure are listed with its target above, and a plain [SHOW: <key>] resumes where the figure left off. The envelope tells you what's showing now; don't re-show it.

SEEN vs SHOWN. On a phone the canvas hides behind a tab — the envelope's live state carries a [VIEWED]/[NOT VIEWED YET] marker for the current material. Shown is not seen: if the marker says NOT VIEWED, do not treat the material as covered and do not tick a "${p.subject}'s seen X" box — tell ${p.object} plainly to open the Canvas tab and look, then verify from what ${p.subject} says about it.

TANGENTS. Genuine off-material threads: park with [TABLE: ${TANGENT_TABLE_ID} :: note] (or [TABLE: <objective id> :: note] if it belongs under a later box) and steer back in the same breath. Parked threads get surfaced at wrap-up — never just drop one.

REPLIES. When the natural next reply is a choice, append [SUGGESTED_REPLIES: a | b | c] (2-4 short options). Skip it for open questions.

PACING. ${budgetLine} Move briskly through discuss boxes; spend the real time where ${p.subject} demonstrates (check) or produces (artifact). Every turn ends with something ${p.subject} can act on — a question, a task in a pane, or a choice.

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

  // Figures report their build-up position: `key @ stepId (n/total)`.
  let canvasNow = session.canvasTarget || '(none)'
  const cnEntry = pack.canvasProgram?.[session.canvasTarget]
  if (cnEntry?.type === 'figure') {
    const steps = cnEntry.payload?.spec?.steps || []
    const idx = Math.min(Math.max(session.figureState?.[session.canvasTarget] ?? 0, 0), Math.max(steps.length - 1, 0))
    canvasNow = `${session.canvasTarget} @ ${steps[idx] ?? idx} (${idx + 1}/${steps.length || 1})`
  }

  const lines = [
    `== SESSION ENVELOPE — turn ${turnNo} of ${maxTurns} ==`,
    '',
    board,
    '',
    `CANVAS NOW: ${canvasNow}`,
  ]

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

// --- 3-tier canvas resolution for a settled turn ---
// Tier 1: the model's [SHOW:] (validated). Tier 2: the new focus objective's
// canvasDefault when focus advanced this turn. Tier 3: keep current (null).
// Returns a CanvasDirective to emit, or null for no change.
// Figures: `dir.id` is always the BASE key (resolveShowTarget strips `@step`),
// so canvasTarget stays base-keyed and "same target → no change" becomes same
// base AND same resolved step — a step advance on the current figure EMITS
// (it's the whole point) and the client re-renders in place (same pane key).
export function resolveCanvasChange(pack, session, showTarget, focusBeforeId) {
  if (showTarget) {
    const dir = resolveShowTarget(pack, showTarget, session.artifacts, session.figureState)
    if (dir) {
      const prevStep = dir.type === 'figure' ? session.figureState?.[dir.id] : null
      const unchanged = dir.id === session.canvasTarget && (dir.type !== 'figure' || dir.payload.step === prevStep)
      if (!unchanged) {
        session.canvasTarget = dir.id
        if (dir.type === 'figure') (session.figureState ||= {})[dir.id] = dir.payload.step
        return dir
      }
      return null // re-shown current target at its current step — no change
    }
  }
  const focusNow = focusObjective(pack, session.inventoryState)
  if (focusNow && focusNow.id !== focusBeforeId) {
    const dflt = pack.canvasDefaults?.[focusNow.id]
    if (dflt && dflt !== session.canvasTarget) {
      const dir = resolveShowTarget(pack, dflt, session.artifacts, session.figureState)
      if (dir) {
        session.canvasTarget = dflt
        if (dir.type === 'figure') (session.figureState ||= {})[dir.id] = dir.payload.step
        return dir
      }
    }
  }
  return null
}

// Current canvas directive for start/resume rendering.
export function currentCanvasDirective(pack, session) {
  return resolveShowTarget(pack, session.canvasTarget, session.artifacts, session.figureState)
}
