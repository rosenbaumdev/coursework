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
  focusObjective,
  requiredCounts,
  renderInventory,
} from './_inventory.js'

import {
  callAnthropic,
  callAnthropicStream,
  consumeAnthropicSSE,
  parseTurn,
  safeEmitLen,
  applyTurnEffects,
  ANTHROPIC_VERSION,
  readJSON,
  writeJSON,
} from './_turnCore.js'

import { ensureAsk } from './_usher.js'

export { getPack, focusObjective, requiredCounts, isComplete, progressInfo } from './_inventory.js'

// Usher re-exports so the interview endpoints keep importing from here unchanged.
export { resolveChips, looksAnswerable, deriveChips, suggestChips } from './_usher.js'

// Re-export the shared mechanical core so the interview endpoints (and the session
// prototype) keep importing these names from _interview.js unchanged.
export {
  callAnthropic,
  callAnthropicStream,
  consumeAnthropicSSE,
  parseTurn,
  safeEmitLen,
  applyTurnEffects,
  ANTHROPIC_VERSION,
}

// Interviewer runs on Sonnet 5 with adaptive thinking: the per-turn reasoning
// pass is what lets it actually work the inventory (decide which box a turn
// covers, tick it, or table a thread) instead of just conversing. Haiku 4.5
// won't emit the control tags reliably — proven in testing (0 ticks / 13 turns).
export const INTERVIEW_MODEL = 'claude-sonnet-5'
export const INTERVIEW_EFFORT = 'medium'
export const PROFILE_MODEL = 'claude-sonnet-4-6'
// The cheap second-pass engine (chips + trailing-off backstop) is the shared
// USHER — see _usher.js (USHER_MODEL = Haiku 4.5).

// Hard ceiling on user turns per session — bounds runaway API cost on the
// public (pre-CF-Access) endpoint. A real, unhurried interview runs ~30-45 turns.
export const MAX_TURNS = 80

// Pacing (server-authoritative). Target feel is a 30-45 MINUTE conversation, not
// a 10-minute form. Two levers: (1) the tick cap keeps the model from sprinting
// through boxes on thin first answers — capped low so each objective earns its
// tick through real follow-up; (2) the turn floor blocks completion before this
// many user turns even if boxes somehow fill early. Depth is driven mostly by the
// prompt (2-4 exchanges per objective); these are the backstops.
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

// Chips + trailing-off backstop now live in the shared USHER (_usher.js) — the
// secondary per-turn engine both the interview and the lesson Director use.
// ensureQuestion stays here as the interview-persona wrapper around ensureAsk.
export async function ensureQuestion(env, session, pack, prevText) {
  const open = pack.objectives.filter((o) => !session.inventoryState[o.id]?.ticked)
  const lastUser = [...session.history].reverse().find((m) => m.role === 'user')
  return ensureAsk(env, {
    persona:
      'You are the interviewer in a warm, casual onboarding interview with a high-schooler.',
    openObjectives: open,
    lastUserText: lastUser?.content,
    prevText,
  })
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
  return readJSON(env.INTERVIEW, sessionKey(studentSlug, courseSlug))
}

export async function saveSession(env, session) {
  session.updatedAt = new Date().toISOString()
  await writeJSON(env.INTERVIEW, sessionKey(session.studentSlug, session.courseSlug), session)
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
