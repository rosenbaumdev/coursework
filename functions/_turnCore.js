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
const SHOW_RE = /\[SHOW:\s*([^\]]+?)\s*\]/gi
// TABLE ([TABLE: <objectiveId> :: <note>]) and FIG ([FIG: <baseKey> :: <pairs>])
// carry a `header :: payload` whose payload may contain arbitrarily NESTED bracket
// groups — a note or value that quotes the tag grammar, e.g. "[SHOW: figure.x [y]]".
// A regex CANNOT balance brackets to arbitrary depth: the old
// `(?:\[[^\]]*\]|[^\]])*` payload handled exactly ONE level and truncated at the
// inner `]` on a second, leaking the remainder as prose. So these two are parsed
// by extractBalancedTags (a hand scan tracking bracket depth), not a regex.
// (FIG's grammar is reserved in fable-collab-figures-review.md §2.4; its payload is
// a comma-separated id=value list — quoted-value tolerant, see parseFigValuePairs.)
// Stagehand request (Phase T.4f Tier 3): [STAGE: <one-line request>] — asks the
// engine to build a figure/deck spec that doesn't exist in the authored
// canvasProgram. Single-line by construction (no '\n' in the capture) so a
// runaway model can't smuggle a multi-paragraph "request" through it.
const STAGE_RE = /\[STAGE:\s*([^\]\n]+?)\s*\]/gi
// Director → artifact write (block form, REPLACE semantics). Unterminated blocks
// (max_tokens cutoff) are stripped from cleanText AND discarded — never apply a
// half-memo, never leak the raw block into the settle frame.
const ARTIFACT_RE = /\[ARTIFACT:\s*([^\]\n]+?)\s*\]\n?([\s\S]*?)\[\/ARTIFACT\]/g
const ARTIFACT_UNTERMINATED_RE = /\[ARTIFACT:[^\]\n]*\][\s\S]*$/

// Split a [FIG:] payload into id=value pairs. Comma-separated, but a value may
// be quoted (straight or curly quotes) to protect embedded commas — quote
// characters are stripped, never treated as part of the value. Values are
// always returned as STRINGS, verbatim (never parsed as numbers).
const FIG_QUOTES = '"“”'
function splitFigPairs(raw) {
  const parts = []
  let cur = ''
  let quoted = false
  for (const ch of raw) {
    if (FIG_QUOTES.includes(ch)) {
      quoted = !quoted
      continue
    }
    if (ch === ',' && !quoted) {
      parts.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) parts.push(cur)
  return parts
}
function parseFigValuePairs(raw) {
  const values = {}
  for (const part of splitFigPairs(raw)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const id = part.slice(0, eq).trim()
    const val = part.slice(eq + 1).trim()
    if (id && val) values[id] = val
  }
  return values
}

// Extract every `[<TAG>: header :: payload]` occurrence where the payload may
// contain NESTED bracket groups. A hand scan (regex can't balance brackets):
// from each opener, track bracket depth from the tag's own '[' until the matching
// ']' at depth 0, so a payload that quotes the tag grammar to ANY depth is
// captured whole — never truncated, never leaking its tail as prose (review #7).
// Case-insensitive opener (tags are conventionally uppercase but the old regex
// tolerated any case). Returns { header, payload, start, end } per match; `end`
// is exclusive so callers can splice the span out of cleanText by position.
function extractBalancedTags(text, tagName) {
  const out = []
  const open = `[${tagName}:`.toUpperCase()
  const hay = text.toUpperCase()
  let i = 0
  while ((i = hay.indexOf(open, i)) !== -1) {
    let depth = 0
    let end = -1
    for (let j = i; j < text.length; j++) {
      const ch = text[j]
      if (ch === '[') depth++
      else if (ch === ']') {
        depth--
        if (depth === 0) {
          end = j
          break
        }
      }
    }
    if (end === -1) {
      i += open.length // unterminated (max_tokens cutoff) — skip this opener
      continue
    }
    const inner = text.slice(i + open.length, end)
    const sep = inner.indexOf('::')
    if (sep !== -1) {
      out.push({
        header: inner.slice(0, sep).trim(),
        payload: inner.slice(sep + 2).trim(),
        start: i,
        end: end + 1,
      })
    }
    i = end + 1
  }
  return out
}

// Splice a set of {start, end} spans out of `text` (end exclusive). Removed
// right-to-left so earlier offsets stay valid as we cut.
function removeSpans(text, spans) {
  if (!spans.length) return text
  let t = text
  for (const s of [...spans].sort((a, b) => b.start - a.start)) {
    t = t.slice(0, s.start) + t.slice(s.end)
  }
  return t
}

// Tick forms:
//   [TICK: id]                — bare tick (comma-separated ids allowed)
//   [TICK: id :: evidence]    — evidence-carrying tick: ONE id + a learner quote /
//                               artifact ref. No comma-split on this form (the
//                               evidence may contain commas).
// parseTurn returns `ticks` (ordered ids — shape unchanged for existing callers)
// plus `evidence` ({ id: string }) and `show` (last [SHOW:] target or null).
export function parseTurn(text) {
  // Artifact writes are extracted from the RAW turn FIRST (the memo body IS the
  // content), then artifact blocks are stripped BEFORE any other extractor runs.
  // Everything below scans `stripped`, never `text`: a control tag the Director
  // drafts INSIDE a memo body — an illustrative [FIG:]/[SHOW:]/[TICK:] in its
  // methodology — must NOT fire as a live directive. Those bodies are removed
  // from cleanText too, so if we parsed the raw text the canvas/figures would
  // change with nothing visible in chat to explain it (silent desync). A real
  // [SHOW: artifact:x] that sits OUTSIDE the block still lands (it survives the
  // artifact strip). Last block wins per id, capped at 2 ids per turn.
  const writesById = new Map()
  for (const m of text.matchAll(ARTIFACT_RE)) {
    const id = m[1].trim()
    if (id) writesById.set(id, m[2])
  }
  const artifactWrites = [...writesById.entries()].slice(0, 2).map(([id, content]) => ({ id, content }))

  let stripped = text.replace(ARTIFACT_RE, '')
  const artifactTruncated = ARTIFACT_UNTERMINATED_RE.test(stripped)
  if (artifactTruncated) stripped = stripped.replace(ARTIFACT_UNTERMINATED_RE, '')

  // TABLE + FIG are the only free-form-payload tags — their notes/values can quote
  // the tag grammar. Extract them FIRST with the balanced scanner, then REMOVE
  // their spans so no OTHER extractor (TICK/SHOW/STAGE/SUGGESTED) sees a tag that
  // was merely quoted inside a note (review #7: a "[SHOW:]" in a TABLE note must
  // not fire a live canvas change). Order: strip TABLE spans → parse FIG on the
  // remainder → strip FIG spans → the rest run on `core`. (TABLE notes are the
  // free-text case; FIG payloads are structured id=value, so TABLE-first is the
  // right precedence.)
  const tableTags = extractBalancedTags(stripped, 'TABLE')
  const tables = []
  for (const { header, payload } of tableTags) {
    if (header && payload) tables.push({ objectiveId: header, note: payload })
  }
  const afterTable = removeSpans(stripped, tableTags)

  // Figure value injection: [FIG: <baseKey> :: id=value, ...]. Multiple tags
  // for the same key are kept as separate entries (applied in order — later
  // entries win on a repeated id); id validation against the figure spec
  // happens at apply time (engine), not here.
  const figTags = extractBalancedTags(afterTable, 'FIG')
  const figValues = []
  for (const { header, payload } of figTags) {
    const key = header.trim()
    const values = parseFigValuePairs(payload)
    if (key && Object.keys(values).length) figValues.push({ key, values })
  }
  const core = removeSpans(afterTable, figTags)

  const ticks = []
  const evidence = {}
  for (const m of core.matchAll(TICK_RE)) {
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

  let suggestions = []
  const sm = core.match(SUGGESTED_RE)
  if (sm) {
    suggestions = sm[1].split('|').map((s) => s.trim()).filter(Boolean).slice(0, 4)
  }

  // Canvas directive: the LAST [SHOW:] in the turn wins (most recent intent).
  let show = null
  for (const m of core.matchAll(SHOW_RE)) show = m[1].trim() || show

  // Stagehand: the LAST [STAGE:] in the turn wins (a model emitting more than
  // one in a turn is noise, not intent — same "last wins" rule as [SHOW:]).
  let stage = null
  for (const m of core.matchAll(STAGE_RE)) stage = m[1].trim() || stage

  // cleanText: `core` already has TABLE + FIG spans removed; strip the remaining
  // non-nesting tags with their regexes.
  const cleanText = core
    .replace(TICK_RE, '')
    .replace(SHOW_RE, '')
    .replace(STAGE_RE, '')
    .replace(SUGGESTED_RE, '')
    .trim()

  return { cleanText, ticks, evidence, tables, suggestions, show, stage, artifactWrites, artifactTruncated, figValues }
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
const CONTROL_STARTS = ['[TICK:', '[TABLE:', '[SHOW:', '[ARTIFACT:', '[FIG:', '[STAGE:', '[SUGGESTED_REPLIES:']

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
