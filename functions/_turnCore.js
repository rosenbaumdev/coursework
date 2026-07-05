// Shared turn mechanics for objective-tracked LLM sessions — content-agnostic.
// Both the ingestion-interview engine (_interview.js) and the coming lesson engine
// (_session.js) import from here. This module holds NO prompt prose and NO course
// specifics: just the LLM plumbing, control-tag parsing, the server-authoritative
// tick/table application, the mid-stream control-tag guard, and R2 JSON helpers.
//
// Prompt registers (extraction vs instruction) diverge and belong in each engine;
// the mechanics below are identical for both. Files prefixed with _ are not routes.

import { isKnownObjective } from './_inventory.js'

export const ANTHROPIC_VERSION = '2023-06-01'

// Default per-turn tick cap (server-authoritative pacing backstop). Overridable
// per engine via applyTurnEffects(..., { maxNewTicks }).
export const MAX_NEW_TICKS_PER_TURN = 2

// --- Control tags a model may append to a turn (all backend-only, never shown) ---
const SUGGESTED_RE = /\[SUGGESTED_REPLIES:([^\]]*)\]/i
const TICK_RE = /\[TICK:([^\]]*)\]/gi
const TABLE_RE = /\[TABLE:\s*([^:\]]+?)\s*::\s*([^\]]*)\]/gi
const SHOW_RE = /\[SHOW:\s*([^\]]+?)\s*\]/gi
// Director → artifact write (block form, REPLACE semantics). Unterminated blocks
// (max_tokens cutoff) are stripped from cleanText AND discarded — never apply a
// half-memo, never leak the raw block into the settle frame.
const ARTIFACT_RE = /\[ARTIFACT:\s*([^\]\n]+?)\s*\]\n?([\s\S]*?)\[\/ARTIFACT\]/g
const ARTIFACT_UNTERMINATED_RE = /\[ARTIFACT:[^\]\n]*\][\s\S]*$/

// Tick forms:
//   [TICK: id]                — bare tick (comma-separated ids allowed)
//   [TICK: id :: evidence]    — evidence-carrying tick: ONE id + a learner quote /
//                               artifact ref. No comma-split on this form (the
//                               evidence may contain commas).
// parseTurn returns `ticks` (ordered ids — shape unchanged for existing callers)
// plus `evidence` ({ id: string }) and `show` (last [SHOW:] target or null).
export function parseTurn(text) {
  const ticks = []
  const evidence = {}
  for (const m of text.matchAll(TICK_RE)) {
    const inner = m[1]
    const sep = inner.indexOf('::')
    if (sep !== -1) {
      const id = inner.slice(0, sep).trim()
      const ev = inner.slice(sep + 2).trim()
      if (id && !ticks.includes(id)) ticks.push(id)
      if (id && ev && !evidence[id]) evidence[id] = ev
    } else {
      for (const id of inner.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (!ticks.includes(id)) ticks.push(id)
      }
    }
  }

  const tables = []
  for (const m of text.matchAll(TABLE_RE)) {
    const objectiveId = m[1].trim()
    const note = m[2].trim()
    if (objectiveId && note) tables.push({ objectiveId, note })
  }

  let suggestions = []
  const sm = text.match(SUGGESTED_RE)
  if (sm) {
    suggestions = sm[1].split('|').map((s) => s.trim()).filter(Boolean).slice(0, 4)
  }

  // Canvas directive: the LAST [SHOW:] in the turn wins (most recent intent).
  let show = null
  for (const m of text.matchAll(SHOW_RE)) show = m[1].trim() || show

  // Artifact writes: last block wins per id, capped at 2 ids per turn.
  const writesById = new Map()
  for (const m of text.matchAll(ARTIFACT_RE)) {
    const id = m[1].trim()
    if (id) writesById.set(id, m[2])
  }
  const artifactWrites = [...writesById.entries()].slice(0, 2).map(([id, content]) => ({ id, content }))

  let stripped = text.replace(ARTIFACT_RE, '')
  const artifactTruncated = ARTIFACT_UNTERMINATED_RE.test(stripped)
  if (artifactTruncated) stripped = stripped.replace(ARTIFACT_UNTERMINATED_RE, '')

  const cleanText = stripped
    .replace(TICK_RE, '')
    .replace(TABLE_RE, '')
    .replace(SHOW_RE, '')
    .replace(SUGGESTED_RE, '')
    .trim()

  return { cleanText, ticks, evidence, tables, suggestions, show, artifactWrites, artifactTruncated }
}

// Apply a parsed turn's ticks/tables to the session (server-authoritative).
// Respects the per-turn tick cap; only records known objective ids; dedupes
// parking-lot notes. Returns the number of new ticks recorded.
//
// opts:
//   maxNewTicks   — per-turn tick cap override (default MAX_NEW_TICKS_PER_TURN)
//   tickGuard     — (id, evidence|null) → bool. Engine-supplied gate run BEFORE a
//                   tick is honored; false = box stays open (e.g. the session
//                   engine rejects evidence-less `check` ticks and artifact ticks
//                   whose artifact gate isn't satisfied). Default: allow.
//   extraTableIds — TABLE targets accepted beyond known objective ids (e.g. the
//                   lesson engine's reserved `tangent` bucket).
export function applyTurnEffects(session, inv, { ticks, tables, evidence = {} }, turnNo, opts = {}) {
  const maxNew = opts.maxNewTicks ?? MAX_NEW_TICKS_PER_TURN
  const tickGuard = opts.tickGuard ?? (() => true)
  const extraTableIds = opts.extraTableIds ?? []
  let newTicks = 0
  for (const id of ticks) {
    if (newTicks >= maxNew) break
    if (!isKnownObjective(inv, id)) continue
    if (session.inventoryState[id]?.ticked) continue
    const ev = evidence[id] ?? null
    if (!tickGuard(id, ev)) continue
    // Merge, don't overwrite: preserves fields the state was seeded with
    // (e.g. the session engine's `evidence`) and records the tick's evidence.
    session.inventoryState[id] = {
      ...session.inventoryState[id],
      ticked: true,
      tickedAtTurn: turnNo,
      ...(ev ? { evidence: ev } : {}),
    }
    newTicks++
  }
  for (const t of tables) {
    if (!isKnownObjective(inv, t.objectiveId) && !extraTableIds.includes(t.objectiveId)) continue
    const dup = session.parkingLot.some(
      (p) => p.objectiveId === t.objectiveId && p.note === t.note
    )
    if (!dup) session.parkingLot.push({ ...t, addedAtTurn: turnNo })
  }
  return newTicks
}

// --- Mid-stream control-tag guard ---
// The control-tag STARTS we must never let flash on screen mid-stream.
const CONTROL_STARTS = ['[TICK:', '[TABLE:', '[SHOW:', '[ARTIFACT:', '[SUGGESTED_REPLIES:']

// Given the full accumulated model text so far, return the length prefix that
// is SAFE to have emitted — i.e. everything up to the first byte that begins a
// (possibly partial) control tag. Callers emit accumulated.slice(emitted, cut).
export function safeEmitLen(acc) {
  let cut = acc.length
  for (const tag of CONTROL_STARTS) {
    const i = acc.indexOf(tag) // a fully-present tag start anywhere
    if (i !== -1) cut = Math.min(cut, i)
  }
  // A partial tag prefix at the very end (e.g. acc ends with "[SUGG").
  let partial = 0
  for (const tag of CONTROL_STARTS) {
    const max = Math.min(tag.length - 1, acc.length)
    for (let k = max; k > 0; k--) {
      if (acc.slice(acc.length - k) === tag.slice(0, k)) {
        partial = Math.max(partial, k)
        break
      }
    }
  }
  return Math.min(cut, acc.length - partial)
}

// --- Edge-native Anthropic calls (plain fetch, no SDK; Functions run on workerd) ---

// Non-streaming: returns concatenated text content. Throws on non-2xx.
export async function callAnthropic(env, { model, system, messages, max_tokens, thinking, effort }) {
  const body = { model, max_tokens, messages }
  if (system) body.system = system
  if (thinking) body.thinking = thinking
  if (effort) body.output_config = { effort }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 500)}`)
  }

  const data = await res.json()
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

// Streaming: returns the raw SSE Response so the caller can pump text deltas while
// accumulating the full turn. Throws on a non-2xx (before any streaming starts).
export async function callAnthropicStream(env, { model, system, messages, max_tokens, thinking, effort }) {
  const body = { model, max_tokens, messages, stream: true }
  if (system) body.system = system
  if (thinking) body.thinking = thinking
  if (effort) body.output_config = { effort }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 500)}`)
  }
  return res
}

// Pull text_delta events out of an Anthropic SSE stream, calling onText(delta, full)
// for each. Returns the full concatenated text. Buffers on newline boundaries so
// events split across network chunks are handled. (Thinking deltas are ignored.)
export async function consumeAnthropicSSE(res, onText) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    let nl
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let evt
      try {
        evt = JSON.parse(payload)
      } catch {
        continue
      }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        full += evt.delta.text
        onText(evt.delta.text, full)
      }
    }
  }
  return full
}

// --- R2 JSON helpers (generic; each engine composes its own key layout) ---
export async function readJSON(bucket, key) {
  const obj = await bucket.get(key)
  if (!obj) return null
  return JSON.parse(await obj.text())
}
export async function writeJSON(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: 'application/json' },
  })
}
