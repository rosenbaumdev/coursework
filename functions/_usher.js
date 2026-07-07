// The USHER — the secondary, per-turn "reformer" engine shared by both primary
// engines (the interview engine in _interview.js and the lesson Director in
// _session.js). Files prefixed with _ are not exposed as routes.
//
// The Usher's whole job is making a single turn LAND for the learner:
//   1. CHIPS — resolve tappable multiple-choice replies for the turn, cheapest
//      first: the primary engine's own [SUGGESTED_REPLIES] tag → an adaptive
//      Haiku pass on the question → deterministic extraction from an inline
//      "X or Y" disjunction.
//   2. NEXT ASK — when a turn trails off with no question/direction, generate
//      the single next ask from the still-open objectives, so the learner is
//      never left scratching their head about what to do.
//
// The Usher has NO authority over objectives, ticks, canvas, or completion —
// it can neither advance nor stall a session. Persona/framing is passed in by
// the primary engine (interview vs lesson), keeping this module content-free.

import { callAnthropic } from './_turnCore.js'

export const USHER_MODEL = 'claude-haiku-4-5'

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

// Cheap adaptive chip generator: Haiku reads the just-asked question and returns
// 2-4 tappable options ONLY when the question genuinely has a small closed answer
// set — otherwise []. No hardcoded scales; it judges the real question. Defensive
// JSON parse; any failure → [] (caller falls back to deriveChips).
export async function suggestChips(env, questionText, studentName, { strict = false } = {}) {
  const q = (questionText || '').trim()
  if (!q) return []

  const system = `You turn a question just asked in a learning chat into tappable multiple-choice chips for a phone chat UI.

RETURN CHIPS whenever the question contains a clear, closed set of natural answers — a yes/no, a permission or readiness check ("ready to go?"), a true/false, a this-or-that, a short rating/comprehension scale (a "do you know/get X?" → a scale like ["Know it","Kind of","No idea"]), or a small handful of discrete options. This holds EVEN IF the question also asks something open alongside it (e.g. "what kind of stuff, and was it A or B?") — chip the closed part; the student can still type a fuller answer. If the question bundles several parts, chip the clearest closed one (usually the final "X or Y").

RETURN [] only when there is NO closed choice — a purely open prompt whose honest answer is a story, feeling, opinion, number, or description: "say more", "tell me about…", "walk me through your numbers", "what lights you up", "how did that feel". Two open topics joined by "or" ("tell me about the game or the site") is NOT a closed choice → [].

${strict ? `STRICT MODE (lesson): a chip must be a COMPLETE answer to everything the message asks. If fully answering requires more than tapping one option — a number AND a reason, a choice AND an explanation, any "and" joining two asks, or several sub-questions — return []. Partial-answer chips let the learner skip work.

` : ''}RULES: 2-4 chips; each 1-4 words; compress long phrasing into a short tap ("take apart because it broke and you wanted to fix it" → "Fix what broke"); the student's casual first-person voice; never invent options the question didn't imply. Output ONLY a JSON array of strings — e.g. ["Know it","Kind of","No idea"] or [] — nothing else.`

  const user = `Question asked to ${studentName || 'the student'}:\n"""\n${q}\n"""\n\nChips as a JSON array (or [] if not multichoice-appropriate):`

  let raw
  try {
    raw = await callAnthropic(env, {
      model: USHER_MODEL,
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

// Does the turn leave the learner something to actually DO? True if it ends on a
// question (or has one near the end), or the last sentence is an imperative ask —
// conversational ("tell me…") or task-directed ("write the memo in the artifact
// pane", "open the deck", "hit Next"). Guards against turns that trail off into a
// bare statement ("…we're just getting a baseline.").
export function looksAnswerable(text) {
  const t = (text || '').trim()
  if (!t) return false
  if (/\?["'’)\]]*\s*$/.test(t)) return true // ends on a question
  if (t.slice(-200).includes('?')) return true // a question near the end
  const last = (t.split(/(?<=[.!?])\s+/).pop() || t).trim()
  return /^(tell me|walk me|describe|give me|share|say more|pick|choose|name|talk|what|which|how|why|who|when|where|do you|did you|have you|has |are you|is there|would you|could you|can you|got a|any |write|open|read|type|edit|fill|draft|watch|look|click|tap|hit|scroll|try|go ahead|head to|take a)/i.test(
    last
  )
}

// Backstop: when a turn trails off without asking anything, pick the most GERMANE
// still-open objective (smooth transition from what was just discussed, not rigid
// document order) and generate the SINGLE next ask that opens it. `persona` is one
// sentence from the primary engine framing who is speaking (interviewer vs lesson
// instructor). '' on any failure or when nothing is left open (caller skips).
export async function ensureAsk(env, { persona, openObjectives, lastUserText, prevText }) {
  if (!openObjectives?.length) return ''
  const list = openObjectives
    .map((o) => `- ${o.id} [${o.required ? 'required' : 'bonus'}]: ${o.need}`)
    .join('\n')
  const context = `${lastUserText ? `The learner just said: "${lastUserText}"\n\n` : ''}Your message that trailed off (no question or direction):\n"""\n${prevText || ''}\n"""`
  const system = `${persona} Your last message reached the end of a thread and trailed off WITHOUT asking or directing anything. Below is your TO-DO LIST of still-open objectives. Pick the ONE open objective that flows most naturally from what was JUST discussed — the most germane, smoothest transition (NOT necessarily the first on the list) — and write the single next ask that opens it: a question to answer OR a concrete action to take. ONE sentence, concrete, genuinely actionable. NO praise, NO preamble, NO restating what the message already covered. IMPORTANT: if the message actually already directs a clear action or asks for something specific (even without a question mark), output exactly NONE — appending a second ask would be redundant noise. Output ONLY the ask text or NONE — no quotes, no objective id.`
  const user = `OPEN OBJECTIVES (to-do list):\n${list}\n\n${context}\n\nThe single next ask, for whichever open objective is the most germane next step:`
  let raw
  try {
    raw = await callAnthropic(env, {
      model: USHER_MODEL,
      max_tokens: 150,
      system,
      messages: [{ role: 'user', content: user }],
    })
  } catch {
    return ''
  }
  const out = (raw || '').trim().replace(/^["'“]+|["'”]+$/g, '').slice(0, 400)
  return /^none[.!]?$/i.test(out) ? '' : out
}

// Resolve the chips for a turn, cheapest-first:
//   1. the primary engine's own [SUGGESTED_REPLIES] tag (free — already parsed),
//   2. else an adaptive Haiku pass on the question,
//   3. else deterministic extraction from an inline "X or Y" question (offline).
export async function resolveChips(env, { tagSuggestions, cleanText, studentName, suppressMultiQuestion = false }) {
  // Lesson-mode guard (deterministic): a turn asking several distinct questions
  // gets NO chips — chips are efficiency tools, not skip-the-work tools. Tapping
  // an option for the final question would silently drop the earlier threads.
  // (The interview keeps chip-the-closed-part behavior: capture ≠ teaching.)
  if (suppressMultiQuestion && ((cleanText || '').match(/\?/g) || []).length >= 2) return []
  if (tagSuggestions && tagSuggestions.length) return tagSuggestions
  const viaHaiku = await suggestChips(env, cleanText, studentName, { strict: suppressMultiQuestion })
  if (viaHaiku.length) return viaHaiku
  return deriveChips(cleanText)
}
