// THE SCRIBE — the third cast member alongside the Director (_session.js) and
// the Usher (_usher.js). Files prefixed with _ are not exposed as routes.
//
// Problem this closes: the Director is supposed to emit [FIG: key :: id=value]
// the instant a number/fact is agreed in chat (system prompt, "THE CANVAS MUST
// TRACK THE CONVERSATION") — but a single-model instruction-following engine
// will occasionally talk through a value without tagging it. The Scribe is a
// cheap, per-turn Haiku SWEEP that reads the turn that just happened and lands
// any values the conversation CLEARLY established onto whichever figure(s) are
// in play, for elements the Director's own [FIG:] tags left empty.
//
// Design contract:
//   - NET, NOT CRUTCH. Director-authored [FIG:] values are applied FIRST
//     (message.js/start.js call order); the Scribe only ever considers
//     elements still unfilled AFTER that — it can fill gaps, never overwrite.
//   - NEVER INFER. The prompt explicitly forbids guessing; empty array is the
//     safe default and the expected common case.
//   - CHEAP BY CONSTRUCTION. A deterministic regex prefilter (does this turn's
//     reply even plausibly contain a number/$/%%) skips the network call
//     entirely on ordinary conversational turns — most turns never reach
//     Haiku. When there's nothing unfilled on any candidate figure, same
//     skip — a capped-out check, cost-free, mirroring how runStagehand's hard
//     cap in _session.js refuses before spending a call.
//   - VALIDATES LIKE [FIG:] APPLY. The model's output is checked against the
//     EXACT unfilled-id set per target computed just before the call — an
//     unknown target, an already-filled id, or an id that was never listed is
//     dropped silently (never guessed, never trusted back). `applyFigureValues`
//     (_session.js) re-validates independently on apply (defense in depth).
//   - FAIL-OPEN. Any error (network, parse, shape) returns `{ figValues: [] }`
//     and logs — a Scribe outage must never break or stall a turn.
//
// The exported pieces are split so every non-network step is independently
// unit-testable without mocking `fetch` (session-engine-test.mjs mirrors the
// same no-network-needed pattern already used for runStagehand's cap check):
//   mightContainValues  — pure regex prefilter
//   scribeCandidates    — pure: which figures are in play + their unfilled ids
//   buildScribePrompt   — pure: the exact prompt text sent to Haiku
//   validateScribeOutput— pure: model output → validated figValues
//   runScribeSweep      — the only piece that calls the network; orchestrates
//                         the above and is itself never-throwing (fail-open).

import { callAnthropic } from './_turnCore.js'
import { figureElementIds, unfilledFigureElementIds, mergeFigureValues, focusObjective } from './_sessionPacks.js'

export const SCRIBE_MODEL = 'claude-haiku-4-5'
export const SCRIBE_VALUE_MAX_LEN = 60

// Cheap, deliberately loose prefilter: does the turn's own reply plausibly
// contain a number, dollar amount, or percentage worth landing? A false
// positive costs one wasted (still cheap) Haiku call; a false negative would
// silently drop a real value, so this errs toward calling.
const VALUE_HINT_RE = /[\d$%]/
export function mightContainValues(text) {
  return VALUE_HINT_RE.test(text || '')
}

// Mirrors _session.js's private `programEntryFor` — deliberately duplicated
// (not imported) to avoid a circular import between _session.js (which
// re-exports this module's entry point) and this module.
function programEntryFor(pack, session, baseKey) {
  return pack.canvasProgram?.[baseKey] || session.dynamicProgram?.[baseKey]
}

// Same candidate priority as the envelope's unfilled-elements nudge (T.4g Fix
// 2, _session.js buildSessionEnvelope): the focus objective's own canvas
// default, whatever's currently displayed, and any figure already receiving
// live [FIG:] values (momentum — a figure mid-fill stays in play even if
// neither focused nor on screen). Unlike that single-line envelope nudge
// (which stops at the first candidate that resolves), the Scribe considers
// EVERY candidate — more than one figure can plausibly be "in play" the same
// turn (e.g. a scoreboard the Director is filling AND a SWOT grid just shown).
function candidateKeys(pack, session, focus) {
  const keys = []
  if (focus && pack.canvasDefaults?.[focus.id]) keys.push(pack.canvasDefaults[focus.id])
  if (session.canvasTarget) keys.push(session.canvasTarget)
  for (const k of Object.keys(session.figureValues || {})) keys.push(k)
  return [...new Set(keys)]
}

// Resolve a candidate key (base or instance) to its kind + LIVE-MERGED spec
// (authored spec + whatever [FIG:] values/additions have already landed) —
// mirrors _session.js's resolveFigureDir for the figure-only case, without a
// canvasDefaults/artifact branch (the Scribe only ever targets figures).
function resolveMergedSpec(pack, session, key) {
  const hashIdx = key.indexOf('#')
  const base = hashIdx === -1 ? key : key.slice(0, hashIdx)
  const instanceId = hashIdx === -1 ? null : key.slice(hashIdx + 1)
  const entry = programEntryFor(pack, session, base)
  if (!entry || entry.type !== 'figure') return null
  const kind = entry.payload?.kind
  const authoredSpec = entry.payload?.spec || {}
  const values = instanceId ? session.figureInstances?.[key]?.values : session.figureValues?.[base]
  const added = instanceId ? null : session.figureAdditions?.[base]
  const spec = mergeFigureValues(kind, authoredSpec, values, added)
  return { kind, spec }
}

// Human label for a figure element id, by kind — what the model reads instead
// of a bare id (row/col/ring/band/bar/item labels). Matrix ids join
// "colId.rowId" (validator forbids dots inside either id, so the split is
// unambiguous); label = "<col label> / <row label>".
function elementLabel(kind, spec, id) {
  if (kind === 'concentric') return spec.rings?.find((r) => r.id === id)?.label || id
  if (kind === 'funnel') return spec.bands?.find((b) => b.id === id)?.label || id
  if (kind === 'bars') return spec.bars?.find((b) => b.id === id)?.label || id
  if (kind === 'quadrant') return spec.quadrants?.find((q) => q.id === id)?.label || id
  if (kind === 'iconrow') return spec.items?.find((i) => i.id === id)?.label || id
  if (kind === 'matrix') {
    const dot = id.indexOf('.')
    const colId = dot === -1 ? id : id.slice(0, dot)
    const rowId = dot === -1 ? '' : id.slice(dot + 1)
    const col = spec.cols?.find((c) => c.id === colId)
    const row = spec.rows?.find((r) => r.id === rowId)
    return `${col?.label || colId} / ${row?.label || rowId}`
  }
  return id
}

// Current value for an ALREADY-FILLED id, by kind — context for the model so
// it sees what's already captured (never asked to repeat or contradict it).
function valueOf(kind, spec, id) {
  if (kind === 'concentric') return spec.rings?.find((r) => r.id === id)?.value
  if (kind === 'funnel') return spec.bands?.find((b) => b.id === id)?.value
  if (kind === 'bars') return spec.bars?.find((b) => b.id === id)?.value
  if (kind === 'iconrow') return spec.items?.find((i) => i.id === id)?.sub
  if (kind === 'matrix') return spec.cells?.[id]
  if (kind === 'quadrant') return (spec.quadrants?.find((q) => q.id === id)?.items || []).map((it) => it.text).join('; ')
  return undefined
}

// Pure: which figures are in play this turn, and exactly which of their
// elements are still unfilled (post any Director [FIG:] already applied this
// turn — callers run this AFTER applyFigureValues for the Director's own
// figValues, so "unfilled" reflects the Director-first precedence). Returns
// `[]` when nothing is in play or everything is already filled — the caller's
// cheap skip.
export function scribeCandidates(pack, session) {
  const focus = focusObjective(pack, session.inventoryState)
  const keys = candidateKeys(pack, session, focus)
  const out = []
  for (const key of keys) {
    if (out.some((c) => c.target === key)) continue
    const resolved = resolveMergedSpec(pack, session, key)
    if (!resolved) continue
    const { kind, spec } = resolved
    const unfilledIds = unfilledFigureElementIds(kind, spec)
    if (!unfilledIds.length) continue
    const unfilledSet = new Set(unfilledIds)
    const unfilled = unfilledIds.map((id) => ({ id, label: elementLabel(kind, spec, id) }))
    const filled = figureElementIds(kind, spec)
      .filter((id) => !unfilledSet.has(id))
      .map((id) => `${id}=${valueOf(kind, spec, id)}`)
    out.push({ target: key, kind, unfilled, filled })
  }
  return out
}

// Pure: the exact prompt text sent to Haiku. Separated out so its shape is
// unit-testable without a network call.
export function buildScribePrompt(candidates, cleanText, lastUserText) {
  const sections = candidates
    .map((c) => {
      const lines = c.unfilled.map((u) => `  - ${u.id}: ${u.label}`).join('\n')
      const filledLine = c.filled.length ? `\n  already filled (do not repeat or contradict): ${c.filled.join(', ')}` : ''
      return `TARGET "${c.target}" (${c.kind}) — empty elements:\n${lines}${filledLine}`
    })
    .join('\n\n')

  return `A live tutoring conversation just produced one turn. Below are the figure(s) currently in play and their EMPTY elements. Find any values the conversation CLEARLY and SPECIFICALLY established THIS TURN for those exact empty elements — real numbers, facts, or short answers the learner and instructor actually agreed on. Never infer, guess, estimate, or invent a value that wasn't actually said. If nothing qualifies, return an empty array.

${sections}

LEARNER'S MESSAGE THIS TURN:
"""
${(lastUserText || '(none — this is the session opener, before any learner reply)').slice(0, 1000)}
"""

INSTRUCTOR'S REPLY THIS TURN:
"""
${(cleanText || '').slice(0, 2000)}
"""

Respond with STRICT JSON ONLY — no prose, no markdown fences — an array of {"target": "<exact target string from above>", "id": "<exact element id listed as empty under that target>", "value": "<short value, <=${SCRIBE_VALUE_MAX_LEN} chars, may include a parenthetical assumption like \\"(his estimate)\\">"}. Only include an element if the conversation clearly and specifically established its value THIS TURN. Never invent a target or id not listed above. Return [] if nothing qualifies.`
}

// Pure: validate the model's raw parsed output against the candidates' exact
// unfilled-id sets — unknown target, unknown/already-filled id, or a missing
// value is dropped silently (same "typo never guessed" discipline as [FIG:]
// apply). Returns figValues in the SAME shape parseTurn produces
// (`[{ key, values }]`) so callers can feed it straight into
// `applyFigureValues` — one apply path, one validation discipline, regardless
// of whether the value came from the Director's own tag or the Scribe's sweep.
export function validateScribeOutput(candidates, rawArr) {
  if (!Array.isArray(rawArr)) return []
  const byTarget = new Map(candidates.map((c) => [c.target, new Set(c.unfilled.map((u) => u.id))]))
  const grouped = new Map()
  for (const item of rawArr) {
    if (!item || typeof item !== 'object') continue
    const target = String(item.target ?? '').trim()
    const id = String(item.id ?? '').trim()
    if (item.value == null) continue
    const value = String(item.value).slice(0, SCRIBE_VALUE_MAX_LEN).trim()
    if (!value) continue
    const validIds = byTarget.get(target)
    if (!validIds || !validIds.has(id)) continue
    if (!grouped.has(target)) grouped.set(target, {})
    grouped.get(target)[id] = value
  }
  return [...grouped.entries()].map(([key, values]) => ({ key, values }))
}

// The orchestrator — the only exported piece that touches the network. Never
// throws: any failure (prefilter miss, no candidates, network, parse) resolves
// to `{ figValues: [] }`, logging on a genuine error so an outage is visible
// without ever blocking or corrupting a turn.
export async function runScribeSweep(env, pack, session, { cleanText, lastUserText } = {}) {
  try {
    if (!mightContainValues(cleanText)) return { figValues: [] }
    const candidates = scribeCandidates(pack, session)
    if (!candidates.length) return { figValues: [] }

    const prompt = buildScribePrompt(candidates, cleanText, lastUserText)
    const raw = await callAnthropic(env, { model: SCRIBE_MODEL, max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
    const a = raw.indexOf('[')
    const b = raw.lastIndexOf(']')
    if (a === -1 || b === -1 || b < a) return { figValues: [] }
    let arr
    try {
      arr = JSON.parse(raw.slice(a, b + 1))
    } catch {
      return { figValues: [] }
    }
    return { figValues: validateScribeOutput(candidates, arr) }
  } catch (err) {
    try {
      console.error('[scribe] sweep failed (fail-open, turn unaffected):', err?.message || err)
    } catch {
      /* logging must never itself throw */
    }
    return { figValues: [] }
  }
}
