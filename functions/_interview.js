// Ingestion interview engine — Pages Functions runtime. Files prefixed with _
// are not exposed as routes.
//
// Drift control lives here. The interview works through an OBJECTIVE INVENTORY
// (see _inventory.js): a program of checkable boxes. The inventory — with live
// tick-state — is re-injected into the envelope every turn, so the model always
// sees exactly what's captured vs open and can't lose the plan or wander off.
// Advancement = ticking boxes ([TICK:]); deepening that belongs to a later box
// is parked ([TABLE:]) and resurfaced when that box becomes the focus.

import {
  newInventoryState,
  isKnownObjective,
  focusObjective,
  requiredCounts,
  renderInventory,
} from './_inventory.js'

export { getPack, focusObjective, requiredCounts, isComplete, progressInfo } from './_inventory.js'

// Interviewer runs on Sonnet 5 with adaptive thinking: the per-turn reasoning
// pass is what lets it actually work the inventory (decide which box a turn
// covers, tick it, or table a thread) instead of just conversing. Haiku 4.5
// won't emit the control tags reliably — proven in testing (0 ticks / 13 turns).
export const INTERVIEW_MODEL = 'claude-sonnet-5'
export const INTERVIEW_EFFORT = 'medium'
export const PROFILE_MODEL = 'claude-sonnet-4-6'
// Cheap second pass: judges whether the just-asked question suits tappable
// multichoice and, if so, generates the chips. Adaptive (reads the real
// question, no hardcoded scales). Haiku is plenty for this tiny classification;
// no thinking/effort params (Haiku 4.5 rejects them).
export const CHIP_MODEL = 'claude-haiku-4-5'
export const ANTHROPIC_VERSION = '2023-06-01'

// Hard ceiling on user turns per session — bounds runaway API cost on the
// public (pre-CF-Access) endpoint. A real, unhurried interview runs ~30-45 turns.
export const MAX_TURNS = 80

// Pacing (server-authoritative). Target feel is a 30-45 MINUTE conversation, not
// a 10-minute form. Two levers: (1) the tick cap keeps the model from sprinting
// through boxes on thin first answers — capped low so each objective earns its
// tick through real follow-up; (2) the turn floor blocks completion before this
// many user turns even if boxes somehow fill early. Depth is driven mostly by the
// prompt (2-4 exchanges per objective); these are the backstops.
export const MAX_NEW_TICKS_PER_TURN = 2
export const MIN_TURNS_BEFORE_COMPLETE = 20

export function buildEnvelope(session, pack) {
  const state = session.inventoryState
  const focus = focusObjective(pack, state)
  const board = renderInventory(pack, state, focus?.id)
  const dueNotes = (session.parkingLot || []).filter(
    (p) => focus && p.objectiveId === focus.id
  )
  const { ticked, total } = requiredCounts(pack, state)
  const name = session.studentName

  const focusBlock = focus
    ? `CURRENT FOCUS: ${focus.id} — ${focus.need}
This is the next un-ticked required objective. Work toward capturing it now.`
    : `Every required objective is ticked. Move to wrap-up: play back a synthesis
of ${name} in HIS words, let him correct it, ask what he didn't get to say,
then close warmly.`

  const notesBlock = dueNotes.length
    ? `\n\nEARLIER THREADS TO PICK UP NOW (you tabled these for this objective):\n${dueNotes
        .map((n) => `- ${n.note}`)
        .join('\n')}`
    : ''

  return `
[SYSTEM ENVELOPE — re-injected every turn, NOT visible to ${name}]

You are working an interview INVENTORY. Your job is to tick off each objective
through real conversation. Required objectives captured so far: ${ticked}/${total}.

THE INVENTORY (live — [x] = captured, [ ] = still open; R = required, B = bonus):
${board}

${focusBlock}${notesBlock}

HOW TO ADVANCE:
- When an objective is genuinely, adequately captured, tick it by ending your
  message with:  [TICK: <id>]   (tick more than one at once: [TICK: id1, id2]).
  Never tick a box you haven't actually covered through his real answers — a
  hollow tick corrupts the entire profile.
- TICK WHEN CAPTURED — don't forget this. Ticking is how progress is recorded; a
  captured-but-un-ticked box STALLS the whole interview (you'll keep re-asking the
  same area). Always close the loop with a tick once a box is genuinely captured.
- MOVE BRISKLY through the quick boxes — tick as soon as you have a clear answer,
  don't over-dig: orient.ready (the moment he says go), know.handson, the know.map
  rating sweep (one area per short turn — just get know-it / kind-of / no-idea, it's
  a quiz not a deep dive), log.time, log.capital, work.stuck, work.completion.
- SPEND THE REAL TIME on INTERESTS & DIRECTION — this is the heart, and where most
  of the 30-45 minutes should go: care.energy, care.depth, care.why, world.ai,
  arc.lean. Here go 2-4 exchanges deep before ticking — examples, "say more," "why,"
  reflect it back. Especially care.depth: mine the strongest interest for a maker's
  angle, an audience, and a real problem — THEN tick. That's where his arc comes from.
- Follow the inventory top-to-bottom as your spine, but if the conversation
  naturally covers a later box well, tick it too. Don't re-open an [x] box
  unless something genuinely new and better emerges.

DRIFT CONTROL — before you follow ANY tangent, ask yourself two questions:
  (1) Does this genuinely advance an un-ticked objective, in a way meaningfully
      BETTER than what you've already captured — or is it just re-exploring
      something you already have? If the latter, don't; return to the focus.
  (2) Is NOW the right moment for it, or does this thread really belong under a
      LATER objective? If later, table it — end your message with:
        [TABLE: <that objective's id> :: <one-line note of the thread to revisit>]
      — and steer gently back to the current focus. That note is surfaced back
      to you when that objective becomes the focus.
You are NOT here to map his entire psychology. You are here to tick THESE boxes
well. Reasonable, valuable drift is welcome — but only in service of a box.

OTHER RULES:
- Don't let it drift into general chitchat, unrelated tech support, or homework
  help. If ${name} goes off, answer briefly and warmly steer back.
- Stay in your core tone: curious, never evaluative; reflect back real energy;
  capture his exact words.
- MULTIPLE-CHOICE SHORTCUTS — use these ACTIVELY; they are expected, not rare.
  This is a phone interview: a tap beats typing. Whenever the question you're
  asking has a small, discrete set of natural answers, END your message with:
    [SUGGESTED_REPLIES: first | second | third]   (2-4 short options, 1-5 words).
  Concretely, you SHOULD offer chips for:
    • the ready / permission check;
    • ANY "do you know X?" knowledge rating — offer the scale, e.g.
        [SUGGESTED_REPLIES: Know it | Kind of | No idea]
    • hours-per-day bands, starting-capital bands, a way-to-take-payment yes/no,
      a "any anxiety about this?" yes/no.
  RATING SWEEPS (e.g. the systems-map areas): do them ONE item per turn, and POSE
  EACH AS AN ACTUAL QUESTION the student can answer — end it with the scale, e.g.
  "Auth — the login/password system — know it, kind of, or no idea?". NEVER just
  describe a concept and stop (a bare statement like "Auth is how an app knows
  it's you." leaves him nothing to answer and no chip to tap). Every turn ends on
  a real question. Don't bundle several items into one message.
  NEVER use chips for the open-ended heart — what he cares about, his story, his
  worldview, "say more about that." Those stay free-form; he can always type.
- Control tags ([TICK], [TABLE], [SUGGESTED_REPLIES]) are backend-only: never
  explain them, and put them on their own line(s) at the very end of the message.
`.trim()
}

// Generic interview methodology + the course's specific framing (from the pack).
// The scaffolding here is content-agnostic; everything course-specific comes
// from pack.framing.
export function buildBaseSystemPrompt(pack, studentName) {
  const { context, reviewer, dynamic } = pack.framing
  return `
You are conducting an onboarding interview with ${studentName}. ${context}

THIS CONVERSATION HAS ONE OVERRIDING PRIORITY, ABOVE DATA COLLECTION:
${studentName} needs to feel genuinely heard. This is not a test, not a form,
not an intake questionnaire dressed up as a conversation. If this feels like
data extraction, the whole thing starts on the wrong foot. If they feel like
someone was actually curious about them, the work ahead has a foundation to
draw on.

${reviewer} will read a summary of this profile afterward — not a transcript.
Tell ${studentName} this plainly if it comes up. Don't be vague about it.

YOUR ROLE. This is a one-time intake conversation. You are NOT ${studentName}'s
day-to-day coach, and he experiences the program as one continuous thing — do NOT
announce that "the interviewer" is a separate bot from "the course," and do NOT
promise future personal contact ("me checking in," "I'll be here each day"). You won't
be doing that. If he assumes you'll be working together throughout, don't break the
fourth wall — reassure him there's structure set up to support him the whole way and
that you're making sure it fits him, then continue. Refer to the program neutrally
("the course," "these 6 weeks," "the daily work").

HOW MUCH SAY HE HAS (specific to this course — follow it exactly):
${dynamic || 'Gather his preferences to understand him; the course structure is set by the program.'}

CORE BEHAVIORAL RULES — apply throughout:

1. REFLECT BACK IN REAL TIME. When ${studentName} says something with real
   energy, specificity, or conviction — stop, don't move to the next
   question. Say "wait, say more about that." Follow the thread they opened
   (subject to the drift control in the envelope).

2. CAPTURE THEIR EXACT WORDS. Note specific phrases, jokes, their own terms for
   things — not your cleaned-up paraphrase. This matters enormously for
   the final profile.

3. NEVER MAKE NOT-KNOWING FEEL WRONG. Tone stays neutral on any knowledge
   gap — information, not evaluation.

4. DON'T RUSH — this is the big one. Aim for a 30-45 MINUTE conversation, not a
   10-minute checklist. Most objectives deserve 2-4 real exchanges: an answer,
   then a genuine follow-up ("say more," "what's an example," "why that?"),
   before you've truly captured it. A thin first answer is NOT a captured box.
   Depth over schedule, every time.

5. ONE QUESTION AT A TIME — and always actually ASK one. End every turn on a
   single, clear question; never trail off into a bare statement that leaves
   ${studentName} nothing to answer. Wait for the real answer before moving on.

6. YOU ARE NOT EVALUATING THEM RIGHT NOW. Curiosity, not assessment.

The envelope that follows gives you the live objective inventory and your current
focus. Begin the conversation now: a plain, honest explanation of what this is
(per the rules above and your current focus objective), then ask if they have
any questions before you start.
`.trim()
}

// Control tags the model may append to a turn. All backend-only; none may reach
// the student's screen. Order-independent; any can be absent.
const SUGGESTED_RE = /\[SUGGESTED_REPLIES:([^\]]*)\]/i
const TICK_RE = /\[TICK:([^\]]*)\]/gi
const TABLE_RE = /\[TABLE:\s*([^:\]]+?)\s*::\s*([^\]]*)\]/gi

// An "X or Y" question is a closed set by construction, so chips shouldn't depend
// on the model remembering to emit a tag — the server reads the options straight
// out of the question it just asked. These guard the two ways an "or" is NOT a menu.
const OPEN_OPTION_RE = /\b(whatever|something|anything|someone else|somewhere|else|etc|so on|not sure yet)\b/i
const OPEN_LEADIN_RE =
  /^(tell me|say more|talk|walk me|describe|explain|what'?s the story|how do you|how does|why do|why does|what do you (think|make|like)|give me|share)/i

// Derive multichoice chips deterministically from a question that offers a closed
// set inline ("… A, B, or C?"). Returns [] unless the FINAL question is a short,
// genuine disjunction — a comma-enumerated list, or a bare binary (≤4 words). A
// mid-sentence "or" wrapped in prose ("is it more about reach or money for you?")
// and open-ended lead-ins ("tell me about X or Y") are rejected.
export function deriveChips(text) {
  const t = (text || '').trim()
  if (!/\?["'’)\]]*$/.test(t)) return [] // must end on a question

  // Isolate the final question, then the part after the last stem separator
  // (— : ;) — that's where inline options live ("<concept> — A, B, or C?").
  const lastQ = t.slice(0, t.lastIndexOf('?') + 1)
  let clause = lastQ.split(/(?<=[.!?])\s+/).pop() || lastQ
  const sep = Math.max(clause.lastIndexOf('—'), clause.lastIndexOf(':'), clause.lastIndexOf(';'))
  if (sep !== -1) clause = clause.slice(sep + 1)
  clause = clause.trim()

  if (clause.length > 120) return []
  if (OPEN_LEADIN_RE.test(clause)) return []

  const body = clause.replace(/\?["'’)\]]*$/, '').trim()
  if (!/\bor\b/i.test(body)) return [] // no disjunction → not a menu

  // Casual tag-question ("<full question>, or nah?" / "…, or not?"): the lead is
  // the question, the tail a negator — that's a yes/no. Only when the lead is a
  // real clause (≥3 words), so "ready or not quite?" stays an enumerated binary.
  const tag = body.match(/^(.*?),?\s+or\s+(no|nah|nope|not|not really|not quite|not sure yet)$/i)
  if (tag && tag[1].trim().split(/\s+/).length >= 3) return ['Yes', 'No']

  // Guard the padded mid-sentence "or": only fire on an enumerated (comma) list
  // or a genuinely short binary. "reach or money for you" (8 words, no comma) is out.
  const hasComma = /,/.test(body)
  if (!hasComma && body.split(/\s+/).length > 4) return []

  const parts = body
    .replace(/,?\s+or\s+/gi, ',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const clean = []
  for (let p of parts) {
    p = p
      .replace(/^(just|like|maybe|try to|either)\s+/i, '')
      .replace(/^["'“”]|["'“”]$/g, '')
      .replace(/[.!?]+$/, '')
      .trim()
    if (!p) continue
    if (OPEN_OPTION_RE.test(p)) continue // escape-hatch option → free box covers it
    if (p.split(/\s+/).length > 6 || p.length > 32) return []
    clean.push(p.charAt(0).toUpperCase() + p.slice(1))
  }
  return clean.length >= 2 && clean.length <= 4 ? clean : []
}

export function parseTurn(text) {
  const ticks = []
  for (const m of text.matchAll(TICK_RE)) {
    for (const id of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!ticks.includes(id)) ticks.push(id)
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

  const cleanText = text
    .replace(TICK_RE, '')
    .replace(TABLE_RE, '')
    .replace(SUGGESTED_RE, '')
    .trim()

  return { cleanText, ticks, tables, suggestions }
}

// Cheap adaptive chip generator: Haiku reads the interviewer's just-asked
// question and returns 2-4 tappable options ONLY when the question genuinely has
// a small closed answer set — otherwise []. No hardcoded scales; it judges the
// real question. Defensive JSON parse; any failure → [] (caller falls back).
export async function suggestChips(env, questionText, studentName) {
  const q = (questionText || '').trim()
  if (!q) return []

  const system = `You turn an interviewer's question into tappable multiple-choice chips for a phone chat UI.

RETURN CHIPS whenever the question contains a clear, closed set of natural answers — a yes/no, a permission check, a this-or-that, a short rating/comprehension scale (a "do you know/get X?" → a scale like ["Know it","Kind of","No idea"]), or a small handful of discrete options. This holds EVEN IF the question also asks something open alongside it (e.g. "what kind of stuff, and was it A or B?") — chip the closed part; the student can still type a fuller answer. If the question bundles several parts, chip the clearest closed one (usually the final "X or Y").

RETURN [] only when there is NO closed choice — a purely open prompt whose honest answer is a story, feeling, opinion, or description: "say more", "tell me about…", "what lights you up", "how did that feel", "what are you into". Two open topics joined by "or" ("tell me about the game or the site") is NOT a closed choice → [].

RULES: 2-4 chips; each 1-4 words; compress long phrasing into a short tap ("take apart because it broke and you wanted to fix it" → "Fix what broke"); the student's casual first-person voice; never invent options the question didn't imply. Output ONLY a JSON array of strings — e.g. ["Know it","Kind of","No idea"] or [] — nothing else.`

  const user = `Question asked to ${studentName || 'the student'}:\n"""\n${q}\n"""\n\nChips as a JSON array (or [] if not multichoice-appropriate):`

  let raw
  try {
    raw = await callAnthropic(env, {
      model: CHIP_MODEL,
      max_tokens: 150,
      system,
      messages: [{ role: 'user', content: user }],
    })
  } catch {
    return []
  }

  // Extract the JSON array defensively (ignore any stray prose/code fences).
  const a = raw.indexOf('[')
  const b = raw.lastIndexOf(']')
  if (a === -1 || b === -1 || b < a) return []
  let arr
  try {
    arr = JSON.parse(raw.slice(a, b + 1))
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const chips = arr
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 32 && s.split(/\s+/).length <= 5)
    .slice(0, 4)
  return chips.length >= 2 ? chips : []
}

// Does the interviewer's turn leave the student something to actually answer?
// True if it ends on a question (or has one near the end), or the last sentence
// is an imperative/interrogative ask ("tell me…", "what did…"). Guards against
// turns that trail off into a bare statement ("…we're just getting a baseline.").
export function looksAnswerable(text) {
  const t = (text || '').trim()
  if (!t) return false
  if (/\?["'’)\]]*\s*$/.test(t)) return true // ends on a question
  if (t.slice(-200).includes('?')) return true // a question near the end
  const last = (t.split(/(?<=[.!?])\s+/).pop() || t).trim()
  return /^(tell me|walk me|describe|give me|share|say more|pick|choose|name|talk|what|which|how|why|who|when|where|do you|did you|have you|has |are you|is there|would you|could you|can you|got a|any )/i.test(
    last
  )
}

// Backstop: when a turn trails off without asking anything, pick the most GERMANE
// still-open objective (smooth transition from what was just discussed, not rigid
// document order) and generate the SINGLE next question that opens it, so the
// student is never left with a dead end. Same cheap Haiku pass that does chips;
// '' on any failure or when nothing is left open (caller skips).
export async function ensureQuestion(env, session, pack, prevText) {
  const open = pack.objectives.filter((o) => !session.inventoryState[o.id]?.ticked)
  if (!open.length) return '' // everything captured → wrap-up, don't force a question
  const list = open
    .map((o) => `- ${o.id} [${o.required ? 'required' : 'bonus'}]: ${o.need}`)
    .join('\n')
  const lastUser = [...session.history].reverse().find((m) => m.role === 'user')
  const context = `${lastUser ? `The student just said: "${lastUser.content}"\n\n` : ''}Your message that trailed off (no question):\n"""\n${prevText || ''}\n"""`
  const system = `You are the interviewer in a warm, casual onboarding interview with a high-schooler. Your last message reached the end of a thread and trailed off WITHOUT asking anything. Below is your TO-DO LIST of interview objectives still open. Pick the ONE open objective that flows most naturally from what was JUST discussed — the most germane, smoothest transition (NOT necessarily the first on the list) — and write the single next question that opens it. One or two sentences, warm, concrete, in your own voice, genuinely answerable. Output ONLY the question text — no preamble, no quotes, no objective id.`
  const user = `OPEN OBJECTIVES (to-do list):\n${list}\n\n${context}\n\nThe single next question, for whichever open objective is the most germane next step:`
  let raw
  try {
    raw = await callAnthropic(env, {
      model: CHIP_MODEL,
      max_tokens: 150,
      system,
      messages: [{ role: 'user', content: user }],
    })
  } catch {
    return ''
  }
  return (raw || '').trim().replace(/^["'“]+|["'”]+$/g, '').slice(0, 400)
}

// Resolve the chips for a turn, cheapest-first:
//   1. the interviewer's own [SUGGESTED_REPLIES] tag (free — already parsed),
//   2. else an adaptive Haiku pass on the question,
//   3. else deterministic extraction from an inline "X or Y" question (offline).
export async function resolveChips(env, { tagSuggestions, cleanText, studentName }) {
  if (tagSuggestions && tagSuggestions.length) return tagSuggestions
  const viaHaiku = await suggestChips(env, cleanText, studentName)
  if (viaHaiku.length) return viaHaiku
  return deriveChips(cleanText)
}

// Apply a parsed turn's ticks/tables to the session (server-authoritative).
// Respects MAX_NEW_TICKS_PER_TURN; only records known objective ids; dedupes
// parking-lot notes. Returns the number of new ticks recorded.
export function applyTurnEffects(session, inv, { ticks, tables }, turnNo) {
  let newTicks = 0
  for (const id of ticks) {
    if (newTicks >= MAX_NEW_TICKS_PER_TURN) break
    if (isKnownObjective(inv, id) && !session.inventoryState[id]?.ticked) {
      session.inventoryState[id] = { ticked: true, tickedAtTurn: turnNo }
      newTicks++
    }
  }
  for (const t of tables) {
    if (!isKnownObjective(inv, t.objectiveId)) continue
    const dup = session.parkingLot.some(
      (p) => p.objectiveId === t.objectiveId && p.note === t.note
    )
    if (!dup) session.parkingLot.push({ ...t, addedAtTurn: turnNo })
  }
  return newTicks
}

// The two control-tag STARTS we must never let flash on screen mid-stream.
// (TICK / TABLE both begin "[T" — the guard handles overlapping prefixes.)
const CONTROL_STARTS = ['[TICK:', '[TABLE:', '[SUGGESTED_REPLIES:']

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

// Generic synthesis wrapper + the course's specific profile schema (from the
// pack). The header is auto-generated; pack.profileSchema is the document body.
export function buildProfilePrompt(pack, studentName, courseTitle, transcriptText, dateStr) {
  return `
You just finished conducting (as Claude) the full onboarding interview with
${studentName} for the "${courseTitle}" course. Below is the complete
transcript. Generate the full structured profile document now, following this
exact markdown schema. Fill in real, specific content from the transcript —
capture ${studentName}'s exact phrasing in any quote/verbatim section, ground
any recommendation section in specific things they said, and don't pad thin
sections artificially.

SCHEMA TO FOLLOW:

# ${studentName} — Onboarding Profile
## Course: ${courseTitle}
Interview date: ${dateStr}
Interviewer: Claude (ingestion interview, pilot v1)

${pack.profileSchema}

TRANSCRIPT:
${transcriptText}
`.trim()
}

// Edge-native Anthropic call — plain fetch, no SDK (Functions run on workerd).
// Returns concatenated text content. Throws on non-2xx with the API's message.
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

// Streaming variant — returns the raw SSE Response from Anthropic so the caller
// can pump text deltas to the client while accumulating the full turn. Throws
// on a non-2xx (before any streaming has started) with the API's message.
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

// Pull text_delta events out of an Anthropic SSE stream, calling onText(delta)
// for each. Returns the full concatenated text. Handles events split across
// network chunks by buffering on newline boundaries. (Thinking deltas, if any,
// are ignored — only assistant text is surfaced.)
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

// --- INTERVIEW bucket key layout (private; no public Function reads it) ---
// Keyed by student × course so a student can take a different course later and
// get a fresh ingestion interview + profile.
export function sessionKey(studentSlug, courseSlug) {
  return `sessions/${studentSlug}/${courseSlug}.json`
}
export function profileKey(studentSlug, courseSlug) {
  return `profiles/${studentSlug}/${courseSlug}-profile.md`
}
export function transcriptKey(studentSlug, courseSlug) {
  return `profiles/${studentSlug}/${courseSlug}-transcript.json`
}

export async function loadSession(env, studentSlug, courseSlug) {
  const obj = await env.INTERVIEW.get(sessionKey(studentSlug, courseSlug))
  if (!obj) return null
  return JSON.parse(await obj.text())
}

export async function saveSession(env, session) {
  session.updatedAt = new Date().toISOString()
  await env.INTERVIEW.put(
    sessionKey(session.studentSlug, session.courseSlug),
    JSON.stringify(session),
    { httpMetadata: { contentType: 'application/json' } }
  )
}

export function newSession(student, course, studentSlug, pack) {
  return {
    studentName: student.name,
    studentSlug,
    courseSlug: course.slug,
    courseTitle: course.title,
    inventoryState: newInventoryState(pack), // { [id]: { ticked, tickedAtTurn } }
    parkingLot: [], // tabled deepening threads: { objectiveId, note, addedAtTurn }
    lastSuggestions: [], // multichoice chips from the latest assistant turn (for resume)
    history: [], // clean role+content array fed to the model
    transcriptLog: [], // raw audit log (includes focus + ticks/tables per turn)
    totalUserTurns: 0,
    completed: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Sonnet synthesis → private bucket. Called via context.waitUntil so the final
// turn's HTTP response isn't blocked on the ~4k-token generation.
export async function generateAndStoreProfile(env, session, pack) {
  const transcriptText = session.history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')
  const dateStr = new Date().toISOString().slice(0, 10)
  const prompt = buildProfilePrompt(
    pack,
    session.studentName,
    session.courseTitle,
    transcriptText,
    dateStr
  )

  // Preserve the raw transcript FIRST (cheap, no model call) so it's safe even if
  // synthesis fails — the profile can always be regenerated from it later.
  try {
    await env.INTERVIEW.put(
      transcriptKey(session.studentSlug, session.courseSlug),
      JSON.stringify(session.transcriptLog, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    )
  } catch {
    /* transcript also lives in the session blob; non-fatal */
  }

  // Synthesize the profile with one retry; never throw (callers await this and
  // must not have a synth hiccup break the completion turn).
  let profileText = ''
  for (let attempt = 0; attempt < 2 && !profileText; attempt++) {
    try {
      profileText = await callAnthropic(env, {
        model: PROFILE_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })
    } catch {
      if (attempt === 1) return false
    }
  }
  if (!profileText) return false

  await env.INTERVIEW.put(
    profileKey(session.studentSlug, session.courseSlug),
    profileText,
    { httpMetadata: { contentType: 'text/markdown; charset=utf-8' } }
  )
  return true
}
