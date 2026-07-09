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
  MATRIX_ID_RE,
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

// Live-surface injection: the `workshop` (and live `terminal`) directives carry no
// URLs in the pack — the droplet's PTY wss endpoint, its token, and the app-viewer URL
// come from env at emit time (they're deployment config, not authored content). Applied
// at every endpoint that sends a directive to the client. Empty env → empty fields, and
// the client shows the "not running yet" placeholder + the Director uses the claude.ai
// fallback (per the Day-2 masterPrompt) — so a missing tunnel never strands the learner.
// The VM's public origin, hardcoded as a default so a failed Pages [vars] binding can
// never again silently emit '' and strand the viewer + Director (the original Day-2
// blocker). It's not a secret (see wrangler.toml). The default must ALWAYS be a URL
// that actually resolves — so it tracks the current working origin.
// INTERIM: the live cloudflared quick tunnel. FINAL STEP of the named-tunnel setup
// (Part B) is to flip this one constant + the wrangler [vars] to
// 'https://workshop.kitbord.com' once that DNS/tunnel resolves. The TOKEN is never
// defaulted — it gates real shell access and stays env-only.
export const DEFAULT_VM_URL = 'https://eye-recruiting-views-kingston.trycloudflare.com'

// Shipped games are served publicly here (a distinct host OUTSIDE Cloudflare Access, so
// share links work for anyone). One definition, used by the ship endpoint (writes R2)
// and _middleware.js (serves R2). shipKey maps student/course/day → the R2 object key;
// the public path play.kitbord.com/<student>/<course>/day-<id> mirrors it (minus .html).
export const PLAY_HOST = 'play.kitbord.com'
export const shipKey = (studentSlug, courseSlug, dayId) =>
  `ships/${studentSlug}/${courseSlug}/day-${dayId}.html`

// The droplet serves the app dir with `python -m http.server`, which returns a 200
// DIRECTORY LISTING (not a 404) when there's no index.html — an empty workspace. That
// listing must NOT read as "app is ready" (viewer auto-load) nor be shippable (it isn't
// the learner's game). One detector, used by the readiness probe and the ship endpoint.
export const isDirListing = (html) => /<title>\s*Directory listing for/i.test(html || '')

// Append the per-student workshop route (/u/<user>) to a base tunnel origin so the
// droplet's identity-aware proxy can route this student's traffic to their OWN
// isolated backend (bridge + viewer, running as their own unix user). No workshop
// user configured → the bare base (legacy single-tenant behavior, unchanged).
function withUserRoute(base, user, trailingSlash) {
  if (!base) return base
  const clean = base.replace(/\/+$/, '')
  if (!user) return trailingSlash ? `${clean}/` : clean
  return `${clean}/u/${user}${trailingSlash ? '/' : ''}`
}

export function injectLiveSurfaces(directive, env, student) {
  if (!directive) return directive
  const isLive = directive.type === 'workshop' || (directive.type === 'terminal' && directive.payload?.mode === 'live')
  if (!isLive) return directive
  const user = student?.workshop?.user || null
  const wsBase = env?.TERMINAL_WS_URL || directive.payload?.wsUrl || DEFAULT_VM_URL
  const viewerBase = env?.APP_VIEWER_URL || directive.payload?.viewerUrl || DEFAULT_VM_URL
  // The workshop token is now minted per-connect by the client (GET .../session/workshop-token,
  // HMAC-signed + short-lived, see functions/_workshopToken.js). We only inject the shared
  // TERMINAL_TOKEN here as a FALLBACK — for students not on a per-user bridge (legacy `default`
  // route) or if signing isn't configured yet.
  const token = env?.TERMINAL_TOKEN || directive.payload?.token || ''
  return {
    ...directive,
    payload: {
      ...directive.payload,
      wsUrl: withUserRoute(wsBase, user, false),
      token,
      viewerUrl: withUserRoute(viewerBase, user, true),
    },
  }
}

// Same model rationale as the interview: the per-turn reasoning pass is what
// works the board + canvas + evidence rules. Haiku proved it won't emit tags.
export const SESSION_MODEL = 'claude-sonnet-5'
export const SESSION_EFFORT = 'medium'
export const SUMMARY_MODEL = 'claude-haiku-4-5'

export const MAX_NEW_TICKS_PER_TURN = 3
export const DEFAULT_MAX_TURNS = 80 // engine fallback when a pack declares no budget
export const MIN_TURNS_BEFORE_COMPLETE = 8 // low sanity floor — objectives are the real gate

// Proactive (terminal-triggered) Director turns: a hard per-session cap (backstop to
// the client-side rate policy) and a smaller token ceiling — these turns are short,
// budget-exempt, tick-inert glances over the learner's shoulder, not full teaching turns.
export const PROACTIVE_MAX_PER_SESSION = 20
export const PROACTIVE_MAX_TOKENS = 700

// A live-workshop day (Day 2) is the only place proactive terminal turns fire — gate the
// proactive prompt/affordance machinery on the pack actually having a workshop surface.
export function hasLiveWorkshop(pack) {
  return Object.values(pack?.canvasProgram || {}).some((e) => e?.type === 'workshop')
}

// The terminal affordances the Director explains the FIRST time each appears (#2). Only
// event types the Sentinel actually emits belong here — the ledger must not promise moments
// that never fire. ("activity" — a chunk of work landing — is not a name-once affordance, so
// it's deliberately absent; it's handled by the WORK LANDED rule every time it fires.)
export const AFFORDANCE_LABELS = {
  'permission-prompt': 'a permission prompt (Claude asking before it acts)',
  'learner-prompt': 'the learner writing his own prompt to Claude Code',
  'trust-prompt': 'the folder-trust prompt',
  error: 'an error in the terminal',
}

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

// The Observer's rolling terminal situation lives in its OWN small R2 object — NOT on the
// session — so a glance write (which can land at any moment while the learner works) can
// never clobber a concurrent Director turn's read-modify-write of the session (ticks,
// history, canvas state). The turn handlers read it and fold it into the envelope; the
// glance endpoint is the only writer. Loss of a glance is harmless (best-effort awareness).
export function glanceKey(studentSlug, courseSlug, dayId) {
  return `glances/${studentSlug}/${courseSlug}/day-${dayId}.json`
}
export async function loadGlance(env, studentSlug, courseSlug, dayId) {
  return readJSON(env.INTERVIEW, glanceKey(studentSlug, courseSlug, dayId))
}
export async function saveGlance(env, studentSlug, courseSlug, dayId, situation) {
  await writeJSON(env.INTERVIEW, glanceKey(studentSlug, courseSlug, dayId), {
    situation,
    updatedAt: new Date().toISOString(),
  })
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
    figureRowAdditions: {}, // { [baseKey]: [{ id, label }] } — live-appended matrix ROWS ([FIG: key :: addrow="id|Label"]) for growRows matrices (values scorecard); learner-defined rows, capped at 8 total
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
    // Proactive terminal turns (#2/#4/#5): count is a budget-exempt tally (separate from
    // totalUserTurns so it can't burn the day). explainedAffordances[type] = the proactive
    // turn number an affordance was first explained on — drives "name it once" (#2) and the
    // client's repeat-decay throttle. Additive v2 fields; old sessions default via ||= at read.
    proactiveTurns: 0,
    explainedAffordances: {},
    completed: false,
    // Ship gate (packs with requiresShip, e.g. Day 2): the session can't complete until
    // the learner ships the built artifact and signs off. `shipped` set by /ship (with
    // the public URL), `signedOff` by /signoff — both required to finalize a ship day.
    shipped: false,
    shippedUrl: null,
    signedOff: false,
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
    persona: `You are the instructor running a hands-on course session with a learner (${p.subject}/${p.object}). Asks may be questions OR concrete next steps ("write your first pass in the memo", "size the gym idea next"). Name the work, never the interface — no "tap", "open the tab", "hit Next": you can't see ${p.possessive} screen layout.`,
    openObjectives: open,
    lastUserText: lastUser?.content,
    prevText,
  })
}

// Does the learner's message signal they want to STOP / END the session for now
// (not just finish one sub-task)? A deterministic safety valve added after the
// day-1 pilot trap: the never-orphan backstop kept appending "Let's keep going:
// <objective>" against a learner who said "we're done"/"please stop" four times,
// because required artifact gates were unmet so the session could never end. This
// gate SUPPRESSES that append and lets the day close gracefully. Biased toward
// catching a stop — a false positive merely skips ONE nag (the learner can keep
// talking), which is always safer than trapping an exhausted learner.
const STOP_INTENT_RE =
  /\b(we'?re done|we are done|i'?m done|i am done|im done|are we done|that'?s (it|enough|all)( for (today|now))?|done (for (today|now|the day)|already)|finished (for )?(today|now|the day)|call it( a day)?|see (you|ya) (tomorrow|later|next time)|back tomorrow|start(ing)? tomorrow|(i'?ll|ill) be back|please stop|just stop|stop (saying|it|pushing|asking)|you keep (doing|saying|pushing)|(i'?m|im) (out|leaving|done)|good ?night)\b/i
export function detectStopIntent(text) {
  return STOP_INTENT_RE.test(String(text || ''))
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
      // (b) ownership action: a pane edit after the draft OR his words carried
      // as tick evidence (the verifier then checks the content traces to his
      // chat — retyping his own spoken words into the pane is ritual, not
      // ownership; owner finding, pilot walk 2).
      const edited = !art?.lastDirectorWriteAt || art.lastLearnerEditAt > art.lastDirectorWriteAt
      if (!edited && !evidence) return false
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
  session.figureRowAdditions ||= {}
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

    let cur, addedList, rowAddList
    if (instanceId) {
      const instKey = `${base}#${instanceId}`
      const inst = (session.figureInstances[instKey] ||= { step: 0, values: {} })
      inst.values ||= {}
      cur = inst.values
      addedList = null // add= (iconrow item append) not supported per-instance in v1
      rowAddList = null // addrow= (matrix row append) not supported per-instance
    } else {
      cur = (session.figureValues[base] ||= {})
      addedList = (session.figureAdditions[base] ||= [])
      // Growable matrix (values scorecard): learner-defined rows appended at
      // runtime via addrow=. Seed validIds with any rows already added in prior
      // turns so this turn's cell writes onto them are accepted (not dropped as
      // unknown ids). New rows added THIS turn extend validIds live, below.
      if (kind === 'matrix' && spec.growRows) {
        rowAddList = (session.figureRowAdditions[base] ||= [])
        for (const r of rowAddList) {
          for (const c of spec.cols || []) validIds.add(`${c.id}.${r.id}`)
        }
      } else {
        rowAddList = null
      }
    }

    for (const [id, val] of Object.entries(values || {})) {
      if (id === 'addrow') {
        // Reserved add-ROW command (growRows matrix only): "rowid|Row label".
        // A learner-named value becomes a row on the values scorecard. Capped
        // at the matrix 8-row shape budget; the new col.row cell ids register
        // into validIds so scores landed the SAME turn aren't dropped.
        if (!rowAddList) continue
        const total = (spec.rows?.length || 0) + rowAddList.length
        if (total >= 8) continue
        const s = String(val)
        const bar = s.indexOf('|')
        const rid = (bar === -1 ? s : s.slice(0, bar)).trim()
        const label = (bar === -1 ? '' : s.slice(bar + 1)).trim().slice(0, 40)
        if (!MATRIX_ID_RE.test(rid) || !label) continue
        if (rowAddList.some((r) => r.id === rid) || (spec.rows || []).some((r) => r.id === rid)) continue
        rowAddList.push({ id: rid, label })
        for (const c of spec.cols || []) validIds.add(`${c.id}.${rid}`)
        continue
      }
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
      // STICKY RENAMES: a stored pipe value ("Label|sub[|glyph]") means this id
      // was RENAMED — a later plain (sub-only) value must not silently revert
      // the label; keep the rename head, swap only the sub.
      const prevVal = cur[id]
      const incoming = String(val)
      if (prevVal != null && String(prevVal).includes('|') && !incoming.includes('|')) {
        const head = String(prevVal).split('|')
        cur[id] = [head[0], incoming, ...(head[2] ? [head[2]] : [])].join('|')
      } else {
        cur[id] = incoming
      }
      // IDENTITY PROPAGATION: a pipe-rename on element id X mirrors to every
      // other figure whose spec has a col/item with the same id (slate rename →
      // scoreboard column) — deterministic, no model round trip.
      if (!instanceId && incoming.includes('|')) {
        for (const [otherKey, otherEntry] of Object.entries(pack.canvasProgram || {})) {
          if (otherKey === base || otherEntry.type !== 'figure') continue
          const otherSpec = otherEntry.payload?.spec || {}
          const shared = (otherSpec.cols || otherSpec.items || []).some((x) => x.id === id)
          if (shared) (session.figureValues[otherKey] ||= {})[id] = incoming
        }
      }
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
      if (id !== 'add' && id !== 'addrow') valuedIds.add(id)
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
// it is "does this document genuinely belong to the learner". SOFTENED after the
// day-1 pilot trap (2026-07-07): the memos CONSOLIDATE work the learner already
// did live (numbers/picks agreed on the boards + in chat), so the bar is
// ownership-of-substance + engagement, NOT a heavy in-document rewrite — lean
// PASS on close calls, FAIL only for genuine theater (see the prompt). Cached by
// content hash so repeated tick attempts on unchanged content don't re-bill.
// Fail-OPEN on call errors (a+b already held); fail-CLOSED on verdict fail.
async function contentHash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function prepareOwnershipVerdicts(env, session, pack, attemptedIds, evidence = {}) {
  for (const id of attemptedIds || []) {
    const obj = pack.objectives.find((o) => o.id === id)
    if (!obj || obj.type !== 'artifact') continue
    if (session.inventoryState[id]?.ticked) continue
    const art = session.artifacts[id]
    const gate = pack.artifacts?.[id]
    if (!art || !gate) continue
    // Only spend the call when layer (a) holds and an ownership action exists
    // (pane edit after draft, or his words as tick evidence).
    if (!isArtifactSatisfied(pack, session.artifacts, id)) continue
    const edited = !art.lastDirectorWriteAt || art.lastLearnerEditAt > art.lastDirectorWriteAt
    if (!edited && !evidence?.[id]) continue
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
            content: `You are checking that a session document genuinely BELONGS TO THE LEARNER — not that it is polished or complete. Crucial context: the learner did the underlying work LIVE this session — the numbers, picks, and reasoning were established WITH them in the chat and on the shared boards, and this memo CONSOLIDATES that live work. So it does NOT need heavy rewriting to be theirs; the substance is already theirs if it traces to what they actually said and decided.\n\nPASS if the document reflects the learner's OWN established figures, picks, and reasoning from the chat/boards AND they have engaged with it (edited, corrected, personalized, or confirmed it as theirs). Light edits are fine when the substance already traces to the learner's live work. This is a supportive learning context — when it is a genuine close call, lean PASS.\n\nFAIL only for real theater: a generic or instructor-invented document whose substance does NOT trace to anything the learner actually said or decided; numbers/picks that CONTRADICT what the learner established in chat; or a memo about an option the learner EXPLICITLY REJECTED. An unfilled optional section or imperfect prose is NOT a fail on its own.\n\nRUBRIC (what a strong doc contains — for context, NOT a pass requirement): ${gate.rubric || '(none)'}\n\nDIRECTOR DRAFT (what the instructor drafted, if anything):\n"""\n${draft.slice(0, 3000)}\n"""\n\nFINAL CONTENT (as it stands now):\n"""\n${art.content.slice(0, 3000)}\n"""\n\nLEARNER'S RECENT CHAT TURNS (their live work — treat as the source of ownership):\n${learnerTurns || '(none)'}\n\nAnswer as STRICT JSON only: {"pass": true|false, "reason": "<=140 chars"}`,
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
  // Cost + drift guardrail: count this ATTEMPT up front, BEFORE spending any model
  // call, so failed builds count toward the cap too (review #3). Each failed build
  // spends up to two calls — a Haiku attempt then a Sonnet-5+thinking retry — and
  // the Director is told to "try a different approach", inviting another [STAGE:]
  // next turn; counting only successes let the cap never trip, bounding cost only
  // by the ~80-turn budget. The counter also names the dynamicProgram key, so a
  // failed attempt legitimately consumes a (non-contiguous) key slot.
  if (session.stageBuildCount >= STAGE_MAX_BUILDS) {
    return { ok: false, reason: `stage-build cap reached (${STAGE_MAX_BUILDS}/session) — use an authored target, an instance, or compare() instead` }
  }
  session.stageBuildCount += 1
  const buildNo = session.stageBuildCount

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

  const key = `stage.${buildNo}`
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
      else if (art?.lastDirectorWriteAt && !(art.lastLearnerEditAt > art.lastDirectorWriteAt) && !evidence[id]) reason = 'unedited'
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

  // Proactive terminal turns only exist on live-workshop days — include the method block
  // for them there, and nowhere else (keeps other days' prompts unchanged).
  const proactiveBlock = hasLiveWorkshop(pack)
    ? `
PROACTIVE TURNS (live-workshop days only). Some turns are triggered by ${p.possessive} TERMINAL, not by a message from ${p.object} — the envelope will say "PROACTIVE TURN" and name the event. ${p.subject.charAt(0).toUpperCase() + p.subject.slice(1)} has NOT sent you anything; you are glancing over ${p.possessive} shoulder at the right moment. Act like it:
- SHORT. Two to four sentences, unless it's the FIRST time an affordance appears. ${p.subject.charAt(0).toUpperCase() + p.subject.slice(1)} is mid-task — you're a voice at ${p.possessive} shoulder, not a lecture. Never narrate what ${p.subject} can obviously see and already gets.
- If the moment genuinely needs no words — ${p.subject} clearly has it, or you'd only repeat yourself — reply with exactly [PASS] and nothing else. Silence at the right moment is coaching too. But NEVER [PASS] a first-time permission prompt or a first-time affordance.
- PERMISSION PROMPT (before ${p.subject} approves): translate what Claude is asking into OUTCOME language — not "it wants to run npm install" but "it's asking permission to download the building blocks your game needs — that's normal and safe here." Name the mechanic once (↑/↓ move the highlight, Enter picks), say what approving does. The choice is ${p.possessive.toUpperCase()} — never reflexively say "just hit yes"; say why THIS one is fine to approve. This checkpoint is the safety model of the whole tool: Claude proposes, ${p.subject} disposes. Teach that, once, plainly.
- FIRST-TIME AFFORDANCE: name the element on screen in plain terms ("that ❯ arrow is a cursor in a menu — ↑/↓ move it, Enter chooses"), say what it's for in one line, then get out of the way. The envelope lists which affordances you've already explained — for those, one clause at most, usually nothing.
- ${p.possessive.toUpperCase()} OWN PROMPT (the event carries the EXACT words ${p.subject} typed to Claude Code): this is the core skill of the whole course surfacing live — treat it as the most valuable moment of the day. Work from ${p.possessive} EXACT words. First, quote the strongest specific thing in it and say what that specificity buys ${p.object} in the result. Then name what's vague and the ONE missing detail that would most change the outcome — "'make it better' leaves Claude guessing; better how? pick the thing: the ball's speed, the bounce, the win screen." Offer sharper phrasing as something ${p.subject} can STEAL, never a replacement — it's ${p.possessive} prompt, it should still sound like ${p.object}. If it's already sharp, say precisely WHAT makes it sharp and let it run. VOICE rules apply doubly: no "great prompt!" — show ${p.object} it's good by showing what it will produce.
- WORK LANDED (event "activity" — Claude Code just finished a chunk of work and the terminal went quiet): glance at what the excerpt shows it produced. Speak ONLY if there's a genuine teachable beat — it built or changed something worth naming, made a choice ${p.subject} should notice, or ${p.subject} is now at a natural fork ("it's got the ball moving — the next lever is the cup"). One or two sentences, in plain outcome language, then let ${p.object} keep going. If it's routine and ${p.subject} is clearly following, reply [PASS] — do NOT narrate every step; a shoulder-voice that comments on everything becomes noise.
- ERROR (event "error" — something appears to have failed): FIRST confirm the excerpt is a real failure, not the word "error" in ordinary output — if it isn't, [PASS]. If it is, don't let ${p.object} stare at a red wall: in one or two plain sentences say what the error actually means and the single most likely next step or fix, then hand it back for ${p.object} to try. Calm and concrete — no jargon dump, no pasting the stack trace back at ${p.object}.
- The inside of ${p.possessive} terminal is COURSE MATERIAL — name its elements freely (❯, ↑/↓, Enter, the permission list). The NO UI COACHING rule is about the app AROUND the terminal, not the terminal's own contents.
`
    : ''

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
Use it two ways only: (1) consolidate what ${p.subject} already worked out in chat into the memo so ${p.subject} doesn't retype it; (2) prepopulate the template/shared structure when ${p.subject} starts a later arc. Write ONLY what ${p.subject} said or the template scaffold — leave ${p.possessive} numbers, picks, and reasons as blanks or [YOUR NUMBER] markers for ${p.object} to fill. The tick is honored once ownership is real: EITHER ${p.subject} edits the draft, OR the substance already came from ${p.possessive} own words in chat — then tick with ${p.possessive} words as evidence ([TICK: id :: "..."]) and the ownership check verifies it traces to what ${p.subject} said. NEVER leave [YOUR WORDS] placeholders and demand ${p.subject} retype things ${p.subject} already told you — fill them from ${p.possessive} chat words yourself and invite edits only if ${p.subject} wants changes. Retyping is not ownership; ${p.possessive} words are. Place the [ARTIFACT:] block at the END of your turn, after your chat prose.
Tick at most ${MAX_NEW_TICKS_PER_TURN} boxes per turn.

CANVAS. Change what's on the canvas with [SHOW: <target>] — one per turn, place it where the change should happen. Valid targets: ${targets.join(', ')}${artifactTargets.length ? `, ${artifactTargets.join(', ')}` : ''}. Unknown targets are ignored. Figures build in steps — advance with [SHOW: <key>@<step>]; steps (and element ids) for each figure are listed with its target above, and a plain [SHOW: <key>] resumes where the figure left off. Once a real number or fact behind a figure element gets established in chat, put it on the figure in the SAME turn with [FIG: <key> :: <id>=<value>] (comma-separate multiple id=value pairs; quote a value that itself contains a comma, e.g. [FIG: figure.tamsamsom :: som="$3,600/yr (his count)"]); unknown ids are ignored, never guessed. To add a new item to an icon-row figure (max 6 total), use [FIG: <key> :: add="Label|short sub"]. THE CANVAS MUST TRACK THE CONVERSATION. When discussion moves to a figure's next stage, advance it with [SHOW: key@step] IN THAT TURN; when a real number gets established in chat for a figure element, put it on the figure with [FIG: key :: id=value] in that turn — a stale canvas while the chat moves on is a failure. The server makes newly-valued elements visible — if you're already showing the figure a value lands on, it auto-advances to the step that value belongs to and the frame updates with no [SHOW:] needed; your job is only to emit [FIG:] the moment a number/entry is agreed, never wait to be asked. The envelope tells you what's showing now; don't pointlessly re-show unchanged material — but if ${p.subject} says ${p.subject} can't see it or asks where it is, re-emit [SHOW:] for it anyway (see NO UI COACHING). A background sweep (the Scribe) also catches clearly-established values you forget to tag — it is a backstop for mistakes, not a substitute for the habit: emitting [FIG:] yourself, the same turn a value is agreed, remains your job.

INSTANCES. Any figure key above can be turned into an independent, reusable copy with [SHOW: <key>#<instanceId>] (instanceId: lowercase letters/digits/hyphens, ≤24 chars — e.g. [SHOW: figure.tamsamsom#gym@sam]). The FIRST time you show a "key#id", it's a fresh copy of that figure's authored spec; every later [SHOW:]/[FIG:] using the SAME "key#id" updates THAT instance only — the base figure and every other instance stay untouched. Use this whenever the same sizing/comparison tool needs to run more than once in a session for genuinely different things (e.g. TAM/SAM/SOM for each arc on his slate) instead of overwriting one shared figure.

COMPARE. [SHOW: compare(targetA, targetB)] puts two resolvable targets side by side (any key, instance, or @step form). Use it when the moment is genuinely about comparing two things he's already built or seen — e.g. compare(figure.tamsamsom#gym, figure.tamsamsom#translator) once both are sized.

STAGEHAND. If a moment genuinely needs a visual that doesn't exist among the targets above, in instances, or as a compare, you may request one with [STAGE: <one-line description of the figure or slide deck to build>]. The engine builds it in the background (a few seconds) and shows it automatically — you don't also [SHOW:] it. Use this SPARINGLY and as a last resort: prefer an authored target, an instance of one, or a compare first. It costs a real model call and is capped for the whole session; if a build fails, the canvas stays on whatever it already showed and you'll get a note next turn — try a different approach rather than repeating the same request.

WHO EDITS WHAT. Figures (scoreboard, circles, grids) are DISPLAY-ONLY for ${p.object} — ${p.subject} cannot type on them. Never instruct ${p.object} to "add/edit/fill in" anything ON a figure; instead ask for the substance in chat ("what's your gut score?") and YOU land it with [FIG:]. The ONLY canvas surface ${p.subject} edits directly is an artifact pane (the memos).

RENAMES. Swapping/renaming a slate item or scoreboard column: [FIG: <key> :: itemId="New Label|new sub|glyph"] — pipes split title|subtitle|icon (icon optional). Swap the icon too when the identity changes: ball, trophy, dice, circle-dollar, phone, cart, people, chart, clock, video, wrench, mask, tag, spark, grid. A plain value edits only the subtitle; never cram a new title into a sub.

SEEN vs SHOWN. The envelope's live state carries a [VIEWED]/[NOT VIEWED YET] marker for the current material. Shown is not seen: if the marker says NOT VIEWED, do not treat the material as covered and do not tick a "${p.subject}'s seen X" box — invite ${p.object} to look at what you've put on the canvas, then verify from what ${p.subject} says about it. Invite by NAMING the material ("take a look at the scoreboard"), NEVER by describing where it is or how to reach it — see NO UI COACHING.

LEARNER QUESTIONS & AGENCY — three standing rules:
1. CLARIFYING QUESTIONS are always in scope. If ${p.subject} wants a term or concept from the course explained more deeply (what SWOT really means, why bottom-up beats top-down), teach it properly before moving on — depth on today's material is never drift.
2. RESEARCH QUESTIONS asked in chat are legitimate and expected ("how many people live in Walnut Creek?", "how many kids 12-19 in the Bay Area?"). Answer from your knowledge with honest precision — give the figure, say roughly how confident you are, and write the assumption next to the number like any other estimate. If you genuinely don't know, say so and build the estimate together bottom-up (that's the skill anyway). Never refuse a research question that serves the work. This also covers widening the field ("what else is out there?") — serve it, clearly framed as outside data, then fold back to the open objectives. Ownership rules constrain what you CLAIM about ${p.object} — never what information you may bring ${p.object}.
3. PIVOTS ON ${p.possessive.toUpperCase()} OWN CHOICES are allowed — ${p.subject} chose the focus, ${p.subject} may change it. But if the change diverges enough from multi-day work already done, ${p.subject} must understand the REAL cost before committing: which earlier sessions' materials and artifacts would need to be redone to establish the same foundations for the new direction (e.g. a new arc must be re-sized with the same tools before it can be decided on). State the cost plainly, frame it as the cost-benefit call founders actually face, and let ${p.object} decide — never refuse the pivot, never wave the cost. Record the decision and what it obsoletes with [TABLE: ${TANGENT_TABLE_ID} :: pivot decision + cost] so it lands in the session report.

FEEDBACK CAPTURE. When ${p.subject} critiques or suggests anything about the COURSE or PLATFORM itself ("this is confusing", "why can't I…", "it would be better if…"), that is signal for the course architect: (1) acknowledge it genuinely, (2) park it verbatim with [TABLE: ${TANGENT_TABLE_ID} :: FEEDBACK: "${p.possessive} words"], (3) the FIRST time it happens in a session, tell ${p.object} plainly that ${p.possessive} suggestions get routed to the person who builds the course — learners who know they're heard give better signal.

TANGENTS. Genuine off-material threads: park with [TABLE: ${TANGENT_TABLE_ID} :: note] (or [TABLE: <objective id> :: note] if it belongs under a later box) and steer back in the same breath. Parked threads get surfaced at wrap-up — never just drop one.

REPLIES. When the natural next reply is a choice, append [SUGGESTED_REPLIES: a | b | c] (2-4 short options). A chip must be a COMPLETE answer to everything you asked — if your ask needs a number AND a reason, or any two things, offer NO chips. Skip it for open questions.

PACING. ${budgetLine} Move briskly through discuss boxes; spend the real time where ${p.subject} demonstrates (check) or produces (artifact). Every turn ends with something ${p.subject} can act on — a question, a task in a pane, or a choice.

EMPHASIS. When the working subject changes — a new arc, tool, or concept becomes the focal point — BOLD its name (**like this**) at the moment of the shift, and keep bolding key established numbers. Typographic reinforcement of "this is what we're working on now." Bold the pivots, not everything.

VOICE. Talk like a sharp mentor who respects ${p.object} — not a chatbot performing warmth. Do NOT validate with empty affirmations: no "that's real", "that's honest", "great point", "love that", "so true", "I hear you", "totally valid". They read as fake and cheapen everything else you say. When ${p.subject} says something good, show it by BUILDING on it — ask the sharper next question, push it further, put it to work — never by labeling it. Praise only when it is specific and earned, and then name the exact thing. Default to substance over reassurance; your warmth comes through attention, directness, and taking ${p.object} seriously, not through compliments.

COPY-PASTE FORMATTING. Anything ${p.subject} is meant to paste or type verbatim into the terminal — a shell command, or a build/starter prompt for Claude Code — MUST be wrapped in a fenced code block (a line of \`\`\` above and below it), never a blockquote, never italics, never plain prose. The interface renders a fenced block as a monospace box with a one-tap copy button; that is how the text gets into the terminal cleanly. Give each paste-once block its own fence, on its own, with nothing else inside the fence but the exact text to paste. Short commands you only reference mid-sentence (like \`cd ~/app\`) stay inline with single backticks; a multi-line prompt or anything meant to be copied whole gets its own fenced block.

SAY-DO RULE. Never describe a canvas or artifact action without performing it in the SAME turn: "I'll draft the memo" requires the [ARTIFACT:] block in that turn; "let's look at X" requires [SHOW: x] in that turn; a number agreed requires its [FIG:] in that turn. Announcing without acting strands ${p.subject} on a stale canvas.

MATCH CANVAS TO QUESTION SCOPE. The canvas must show the same scope you're asking about, in the same turn: a cross-cutting question (compare arcs, which surprised ${p.object}, decide between) requires the ALL-items surface ([SHOW: figure.scoreboard] or compare(...)); single-item work shows that item's surface. Asking a comparison question over a single-item canvas orients ${p.object} wrong.

NO UI COACHING (you navigate the canvas — ${p.subject} never navigates it for you). You control the canvas ONLY through [SHOW:] — that is the whole of your power over it AND your responsibility for it. You CANNOT see ${p.possessive} screen and you do NOT know its layout (side-by-side, stacked, and a phone with the canvas on its own tab all coexist — you can't tell which ${p.subject} is on). Three hard rules:
1. TAKE-ME-THERE IS ALWAYS A [SHOW:]. When ${p.subject} asks to see, compare, line up, or "go to" anything — or says ${p.subject} can't see/find it — the answer is [SHOW: <the germane target>] THAT TURN. If it's a compare-all moment, that's [SHOW: figure.scoreboard] or compare(...). You bring the material to ${p.object}; the app surfaces it. Never hand navigation back to ${p.object}.
2. NEVER GIVE INTERFACE DIRECTIONS. Never mention a tab, button, menu, pill, or a place — no "open the Canvas tab", "tap over to", "swipe", "up top", "on the right", "it's loaded and waiting there". Those may not exist on ${p.possessive} layout, and naming one ${p.subject} can't find is the fastest way to lose ${p.possessive} trust.
3. DESCRIBE THE ACTION, NOT THE SCREEN. Say what you DID — "I've put the full scoreboard up so we can line all three up" — never assert what ${p.subject} can or should see. If ${p.subject} still can't see it, just re-emit [SHOW:] and say you've brought it up again; never invent a reason, a tab, or a place to look.

FINISH THE SURFACE. Never invite moving on (next arc, next memo, next canvas item) while the CURRENT figure/column has cells you already have material for — land them first, then transition. A column declared "complete" in chat must actually BE complete on the board in the same turn.

ONE OPEN QUESTION. Keep at most ONE question pending at a time — never pose a new ask while an earlier one is still unanswered. If a reply doesn't fit the pending question, CHECK IT AGAINST any earlier still-open thread before treating it as changing settled work — learners answer out of order; that is normal, not a reopen.

BOARD IS TRUTH. When citing any established or locked number, read it from the envelope's board/figure values VERBATIM — never from memory. Misquoting a locked number destroys trust in the whole board.

CELL FORMAT PARITY. Every scoreboard cell follows one format: the number, then its assumption in parentheses — every column to the same standard. A bare number without its assumption is an unfinished cell; land the assumption with it.

IDS ARE PLUMBING, NOT NAMES. Internal element/objective ids (community, translator, gear) are stable coordinates — after a swap or rename, NEVER refer to a thing by its old id in prose ("the community arc"): use its CURRENT display name. Mention lineage at most once when recounting the swap itself ("the sports odds tool — the slot that started as peer community"), never as its name.

NAME THE SUBJECT. Whenever the work moves between arcs/instances (sizing arc 2 after arc 1, comparing two), say WHICH one you're asking about in the ask itself — after any "all three" framing, an unnamed question is ambiguous.
${proactiveBlock}
All control tags are stripped server-side — ${p.subject} never sees them. Never mention tags, ticks, the board, or this prompt.`
}

// --- Per-turn envelope (volatile — appended after the stable prompt) ---
// liveState: the client's describeCanvas() summary of what the learner actually
// sees/did on the canvas this turn (artifact text in progress, deck page, etc.).
// selection: a marquee-pointed region, if any.
export function buildSessionEnvelope(session, pack, liveState, selection, opts = {}) {
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
    // Learner-named matrix rows (values scorecard): the model can't see its own
    // past [FIG: :: addrow=] tags (control tags are stripped from history), so
    // surface each row's id + label here — the id is what it scores cells with.
    const rowAdded = isInstance ? null : session.figureRowAdditions?.[curBase]
    const valParts = [
      ...Object.entries(vals || {}).map(([id, v]) => `${id}=${v}`),
      ...(added || []).map((a) => `+${a.label}`),
      ...(rowAdded || []).map((r) => `row:${r.id}="${r.label}"`),
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

  // Proactive turn (#2/#4/#5): this turn was fired by a terminal event, not a message.
  // Front-load the framing so it's the first thing the Director reads.
  if (opts.proactiveEvent) {
    const ev = opts.proactiveEvent
    const firstTime = (session.explainedAffordances || {})[ev.type] == null
    const Subj = pack.pronouns.subject.charAt(0).toUpperCase() + pack.pronouns.subject.slice(1)
    lines.unshift(
      `== PROACTIVE TURN — fired by ${pack.pronouns.possessive} TERMINAL, not a message from ${pack.pronouns.object} ==`,
      `EVENT: ${ev.type}   FIRST TIME: ${firstTime ? 'yes' : 'no (already explained — one clause at most, or [PASS])'}`,
      'TERMINAL EXCERPT (the salient region ' + pack.pronouns.subject + ' is looking at):',
      '"""',
      String(ev.excerpt || '').slice(0, 800),
      '"""',
      `${Subj} has NOT sent a message — do not answer a question ${pack.pronouns.subject} did not ask. Speak to THIS event per the PROACTIVE TURNS rules, or reply with exactly [PASS].`,
      '',
    )
  }

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
  // The Observer's rolling read of the terminal — present on workshop days so the Director
  // stays oriented to the build even between the learner's chat messages (fixes the "only
  // sees the terminal when he types in chat" gap). Plain-English, already summarized.
  if (opts.terminalSituation) {
    lines.push(
      '',
      `TERMINAL SITUATION (live read from the Observer watching ${pack.pronouns.possessive} terminal — stay oriented to it even between ${pack.pronouns.possessive} messages; do NOT re-narrate it unprompted):`,
      String(opts.terminalSituation).slice(0, 900)
    )
  }
  if (selection && (selection.text || selection.note)) {
    lines.push('', `LEARNER IS POINTING AT (marquee selection): ${String(selection.text || selection.note).slice(0, 1000)}`)
  }

  // Terminal-affordance ledger (#2) — present on every workshop-day turn (a learner
  // "what is that?" benefits too, not just proactive turns). Server-authoritative:
  // explainedAffordances is written when a proactive turn actually explains one.
  if (hasLiveWorkshop(pack)) {
    const explained = session.explainedAffordances || {}
    const known = Object.keys(AFFORDANCE_LABELS)
    const done = known.filter((k) => explained[k] != null)
    const todo = known.filter((k) => explained[k] == null)
    lines.push(
      '',
      'TERMINAL AFFORDANCES — first appearance of an unexplained one → name the on-screen element + what it is for; already explained → one clause at most, or nothing.',
      `  already explained: ${done.length ? done.map((k) => AFFORDANCE_LABELS[k]).join('; ') : '(none yet)'}`,
      `  not yet explained: ${todo.length ? todo.map((k) => AFFORDANCE_LABELS[k]).join('; ') : '(all covered)'}`,
    )
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
  const ra = session.figureRowAdditions?.[key]
  if ((!v || Object.keys(v).length === 0) && (!a || a.length === 0) && (!ra || ra.length === 0)) return ''
  return JSON.stringify([v || {}, a || [], ra || []])
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
  return resolveShowTarget(merged, target, session.artifacts, session.figureState, session.figureValues, session.figureAdditions, session.figureInstances, session.figureRowAdditions)
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

// --- SAY-DO repair backstop (deterministic; no model call) ---
// The failure this closes (live pilot, turn ~88): the Director NARRATES a canvas
// move ("I've put the full scoreboard up", "let me bring it up again") but emits
// NO [SHOW:] tag — control-tag emission degrades in a very long context. The
// canvas can't change on a tag that was never sent, so the learner is stranded
// on stale material no matter how many times they ask. Per the project doctrine
// (model compliance is a single point of failure — back it with a deterministic
// server rule), when the Director's own prose CLAIMS a canvas show and it emitted
// no [SHOW:], the server performs the show itself.
//
// Two tightly-scoped patterns, deliberately biased AGAINST false positives (an
// over-eager repair yanks the canvas mid-conversation, which is worse than a
// missed one):
//   VISUAL — an inherently show-ish verb (re-show/re-load/shown/showing/show
//     you|the|us/display) + a canvas noun close after: "re-shown the scoreboard",
//     "display the board". Referencing prose ("the scoreboard shows 30M") has the
//     noun BEFORE the verb, so it does not match.
//   DIRECTIONAL — put/bring/pull ... but ONLY with the particle "up" AND either a
//     canvas noun or an it/that object: "put the scoreboard up", "bring it up
//     again", "pulling it back up". This is what excludes "pulled the numbers from
//     your memo" (no "up") and "bring up a good point" (no noun / no it-that).
const CLAIM_VISUAL_RE =
  /\b(re-?shown|re-?showing|re-?show|re-?loaded|re-?loading|re-?load|shown|showing|show (?:you|the|us)|display(?:ed|ing)?)\b[\s\S]{0,45}?\b(canvas|scoreboard|score-?board|board|figure|chart|deck|slide|memo|comparison|side by side)\b/i
const CLAIM_DIRECTIONAL_RE =
  /\b(put|putting|bring|bringing|brought|pull|pulling|pulled)\b\s+(?:(?:it|that|them|these|those)\b[\s\S]{0,20}?\bup\b|[\s\S]{0,40}?\b(?:canvas|scoreboard|score-?board|board|figure|chart|deck|slide)\b[\s\S]{0,20}?\bup\b|\bup\b[\s\S]{0,25}?\b(?:canvas|scoreboard|score-?board|board|figure|chart|deck|slide)\b)/i
//   LOOK/DEIXIS — the instructor pointing the learner at a canvas thing ("take a
//   look at the gear memo", "here's the scoreboard", "open the deck"). Requires a
//   canvas noun close after the pointer word, so plain deixis ("that's a good
//   point", "here's the thing") does NOT fire.
const CLAIM_LOOK_RE =
  /\b(take a look at|have a look at|look at|check out|here'?s|here is|that'?s|that is|this is|open)\b[\s\S]{0,30}?\b(canvas|scoreboard|score-?board|scorecard|board|figure|chart|deck|slide|memo|comparison)\b/i

export function detectClaimedShow(text) {
  const t = (text || '').trim()
  if (!t) return false
  return CLAIM_VISUAL_RE.test(t) || CLAIM_DIRECTIONAL_RE.test(t) || CLAIM_LOOK_RE.test(t)
}

// Resolve WHICH target a claimed-but-untagged show refers to, deterministically.
// Priority (an EXPLICITLY-named target must beat the focus default — the pilot
// bug: the Director said "here's the decision memo" but the backstop showed the
// scoreboard because that was the focus objective's default):
//   0. a target the Director STAGED this turn (e.g. an artifact it just drafted)
//      that the claim also names — the strongest signal ("I drafted X, here's X");
//   1. the focus objective's OWN canvasDefault, when the claim names it (the usual
//      "I've re-shown the scoreboard" — focus canvas AND named);
//   2. any explicitly named target — the EARLIEST mentioned (a claim names its
//      subject first: "here's the memo … then discuss translator/gear");
//   3. a target staged this turn even if not named in prose;
//   4. else the focus objective's canvasDefault (where the work is);
//   5. else whatever's already the target (a forced re-deliver still helps — the
//      client may not be showing it). null only when nothing resolves.
// `prefer` = keys staged this turn (drafted-artifact ids as "artifact:<id>").
export function resolveClaimedTarget(pack, session, text, prefer = []) {
  const t = (text || '').toLowerCase()
  const hits = [] // { key, pos } — position of the noun in the claim
  for (const item of buildCanvasCatalog(pack, session)) {
    const tail = String(item.key).split(/[.:]/).pop()?.toLowerCase()
    if (tail && tail.length >= 4) {
      const pos = t.indexOf(tail)
      if (pos !== -1) hits.push({ key: item.key, pos })
    }
  }
  const named = new Set(hits.map((h) => h.key))
  for (const k of prefer) if (named.has(k)) return k // 0
  const focusId = focusIdOf(pack, session)
  const focusDefault = focusId ? pack.canvasDefaults?.[focusId] : null
  if (focusDefault && named.has(focusDefault)) return focusDefault // 1
  if (hits.length) return hits.sort((a, b) => a.pos - b.pos)[0].key // 2 (earliest)
  if (prefer.length) return prefer[0] // 3
  if (focusDefault) return focusDefault // 4
  return session.canvasTarget || null // 5
}

// Constrained LLM resolver — the ROBUST primary for the miss-path (deterministic
// prose→target matching kept missing edge phrasings: "take a look at the gear
// memo", "line them up side by side"). Given the Director's message + the actual
// catalog, a cheap Haiku call returns the ONE key the instructor is pointing the
// learner at, or NONE. Output is validated against the catalog (a hallucinated
// key is dropped), so it can never invent a target.
//
// TRI-STATE return (review P1) — the caller MUST distinguish these:
//   <key>          — resolved target.
//   RESOLVER_NONE  — the resolver RAN and judged there is no target (a purely
//                    referential mention). The caller must SKIP repair — falling
//                    through to the always-returns-something deterministic
//                    resolver here would force a canvas yank on a false-positive
//                    claim (the exact bug: "that's a sharp read on the scoreboard"
//                    with no intent to navigate).
//   null           — the resolver COULDN'T run (empty catalog / network / parse /
//                    unmappable answer). The caller falls back to the deterministic
//                    resolveClaimedTarget. Fail-open: an outage never blocks a turn.
export const RESOLVER_NONE = 'NONE'
export const RESOLVER_MODEL = SUMMARY_MODEL // claude-haiku-4-5 — cheap, single-shot
export async function resolveClaimedTargetLLM(env, pack, session, text) {
  const catalog = buildCanvasCatalog(pack, session)
  if (!catalog.length) return null
  const list = catalog.map((c) => `- ${c.key} — ${c.title} (${c.type})`).join('\n')
  const system = `In a live tutoring session the instructor just referred to something on the shared canvas — or told the learner to look at it — but did NOT emit the tag that actually changes what's displayed. Decide WHICH ONE canvas target the instructor is pointing the learner at in THIS message.

AVAILABLE TARGETS (reply with the exact key from the left column):
${list}

Guidance:
- "the gear memo" → the sizing memo key for the gear arc; "the translator memo" → the translator arc's; "the decision memo" → the decision memo.
- "the scoreboard" / "the board" / "the scorecard" / comparing arcs / "side by side" / "all three" → the scoreboard figure.
- If the message compares or reviews multiple arcs together, choose the scoreboard.
- If no target genuinely applies, answer NONE.

Reply with ONLY the exact key, or NONE. Nothing else.`
  let raw
  try {
    raw = await callAnthropic(env, {
      model: RESOLVER_MODEL,
      max_tokens: 40,
      system,
      messages: [{ role: 'user', content: `Instructor's message:\n"""\n${String(text).slice(0, 1500)}\n"""` }],
    })
  } catch {
    return null
  }
  const ans = (raw || '').trim().replace(/[`"'.\s]+$/g, '').split(/\s+/).pop() || ''
  if (!ans) return null // garbage/empty → let the deterministic heuristic try
  if (/^none$/i.test(ans)) return RESOLVER_NONE // ran, judged no target → skip repair
  const keys = new Set(catalog.map((c) => c.key))
  if (keys.has(ans)) return ans
  // Tolerate a near-miss (model echoed a key fragment) — exact tail match only.
  const hit = catalog.find((c) => c.key.endsWith(ans) || `artifact:${ans}` === c.key)
  return hit ? hit.key : null // unmappable → fall back to deterministic
}

// --- The Observer (cheap Haiku "over-the-shoulder" watcher) --------------------------
// Reads the live terminal on a work-landed / heartbeat glance and does TWO jobs in one
// call: (1) rewrites a rolling, plain-English SITUATION summary of the build so the
// Director stays oriented on EVERY turn (reactive too), and (2) judges whether THIS moment
// is worth the Director speaking to (salient) and what kind. This replaces the brittle
// client-side regex classification for activity/errors with something that actually
// understands the terminal — regexes still handle the latency-critical permission/trust
// prompts and the learner's own typed prompt (those need no interpretation). Never throws.
export const OBSERVER_MODEL = SUMMARY_MODEL // claude-haiku-4-5 — cheap, single-shot JSON
export async function runObserver(env, { priorSituation, tail, studentName }) {
  const clean = String(tail || '').trim()
  if (!clean) return { situation: priorSituation || '', salient: false, kind: 'none', oneLine: '' }
  const system = `You are the Observer: you watch ${studentName || 'a beginner'}'s coding terminal over their shoulder during a live build session and keep the INSTRUCTOR briefed. ${studentName || 'The learner'} is using Claude Code (an AI coding agent) in a real terminal to build a small web game for the first time. You never talk to the learner — you brief the instructor, who decides whether to speak.

You are given the PREVIOUS situation summary and the LATEST terminal output. Reply with ONLY a JSON object, no prose:
{
  "situation": "<=55 words, plain English: the CURRENT state of the build — what exists now, what the agent just did, what the learner seems to be doing. Rewrite it fresh from prior+latest; do NOT just append.",
  "salient": true|false,
  "kind": "activity"|"error"|"none",
  "oneLine": "<=25 words: the single most useful thing that just happened for the instructor to react to (empty string if not salient)"
}

Rules:
- salient=true ONLY for a genuine teachable/needed beat: a chunk of work just LANDED (a feature built, the game now runs or visibly changed), a real ERROR the learner appears stuck on, or a natural fork worth a nudge.
- salient=false for routine progress the learner is clearly following, mid-work churn, spinners, or nothing meaningfully changed since the prior situation. When unsure, false — an instructor who interrupts too often is worse than one who waits.
- kind="error" ONLY when the output shows a real failure; otherwise "activity" (salient) or "none" (not).
- Judge "changed since prior" against the PREVIOUS situation — do not re-flag something already reflected there.`
  let raw
  try {
    raw = await callAnthropic(env, {
      model: OBSERVER_MODEL,
      max_tokens: 320,
      system,
      messages: [
        {
          role: 'user',
          content: `PREVIOUS situation:\n"""\n${(priorSituation || '(none yet — first glance)').slice(0, 600)}\n"""\n\nLATEST terminal output (ANSI already stripped):\n"""\n${clean.slice(-3500)}\n"""`,
        },
      ],
    })
  } catch {
    return { situation: priorSituation || '', salient: false, kind: 'none', oneLine: '' }
  }
  // Defensive parse — pull the first {...} block; fall back to prior situation on garbage.
  let obj = null
  try {
    const m = (raw || '').match(/\{[\s\S]*\}/)
    if (m) obj = JSON.parse(m[0])
  } catch {
    obj = null
  }
  if (!obj || typeof obj !== 'object') {
    return { situation: priorSituation || '', salient: false, kind: 'none', oneLine: '' }
  }
  const kind = obj.kind === 'error' ? 'error' : obj.kind === 'activity' ? 'activity' : 'none'
  const salient = obj.salient === true && kind !== 'none'
  return {
    situation: (typeof obj.situation === 'string' && obj.situation.trim()) || priorSituation || '',
    salient,
    kind,
    oneLine: salient ? String(obj.oneLine || '').slice(0, 300) : '',
  }
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
export function resolveCanvasChange(pack, session, showTarget, focusBeforeId, opts = {}) {
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
      // opts.requested = a SAY-DO repair (the Director narrated a canvas show but
      // emitted no [SHOW:]) or any other force-deliver case. It ALWAYS emits —
      // even when the server thinks the target is unchanged — because the learner
      // demonstrably cannot see it (the client may be parked on a different pane,
      // browsing, or holding an unaccepted pending frame). The `requested` flag
      // rides the directive so the client DISPLAYS it immediately instead of
      // queuing it politely behind a "Continue" pill.
      if (!unchanged || opts.requested) {
        session.canvasTarget = dir.id
        if (isFig) {
          setFigureStep(session, dir.id, dir.payload.step)
          session.figureValuesHash[dir.id] = newHash
        } else if (isCmp) {
          session.figureValuesHash[dir.id] = cmpKey
        }
        if (opts.requested) dir.requested = true
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
