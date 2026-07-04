# Session Platform — Go-Forward Architecture (Fable review brief)

Purpose: crystallize the *target* architecture for turning the coached-session
prototype into a real course-delivery platform, so it can be pressure-tested at the
design level **before** we build. Reviewer: Fable (architecture / high-level, not
line-by-line). Outcome wanted: flaws found, design corrected, sequencing decided.

## Where we are now (prototype — validated, not the platform)
- Two-pane coached session works: chat + adaptive canvas (reading/deck/video/image/
  browser/terminal/artifact), auto-layout, marquee, JetBrains Mono, etc.
- Chat is a **generic canvas-aware tutor**: `functions/[studentSlug]/api/session/message.js`
  is **stateless** (client resends full transcript each turn), Haiku default, sees a
  `describeCanvas()` summary + marquee selection. It does NOT run a lesson toward
  objectives, cannot decide what to put on the canvas, and doesn't gate completion.
- Canvas is **scripted** (a canned tour), not curriculum-driven.
- Persistence is client localStorage. No server session state. No memory hierarchy.
- Endpoint is **open/unauthenticated/unrate-limited**.

## What already exists to build ON (the interview engine)
`functions/_interview.js` is a content-agnostic engine driven by **interview packs**
(`_inventory.js`): `inventoryMd` (objective checklist) + `framing` + `profileSchema`.
Per turn it builds a system prompt + an **envelope** (live inventory, FOCUS-NOW, drift
gate), streams Sonnet, parses `[TICK:id]`/`[TABLE:id::note]`/`[SUGGESTED_REPLIES:...]`,
is **server-authoritative** on ticks, and completes when required objectives are
ticked (past a turn floor). Session state persists to a private R2 bucket. This is
exactly the "objective-tracked, master-prompt-driven" machine — for *intake*.

## Proposed target architecture

### 1. Session engine = generalize the interview engine to "session packs"
- A course = an ordered list of **day session packs**. Each pack:
  - `masterPrompt` — the day's instructional persona, goals, method.
  - `objectives` — an inventory the model ticks. **But these are LEARNING/DOING
    objectives** ("sized his 3 arcs with TAM/SAM/SOM", "made a decision"), which are
    harder to verify than the interview's *capture* objectives.
  - `canvasProgram` — content the session can put on the canvas, addressable by the
    model via a NEW `[SHOW: <target>]` control tag → `resolveShowTarget(target)` →
    `CanvasDirective` (the shape the prototype already renders). Content = authored
    (reading/deck/video), model-generated (artifact), or live surface (terminal/browser).
  - `entryContext` — what to preload; what to read from the learner record.
- Per turn: envelope = live objective state + focus + **current canvas state** +
  **memory slice**. Model streams a reply, may emit `[SHOW:]` (drive canvas) and
  `[TICK:]` (advance objectives). Server stays authoritative on ticks + completion.
- **Reuses** the tick/envelope/streaming/parse/persistence machinery wholesale.
  **Adds**: `[SHOW:]` parse + registry, learning-objective verification, canvas
  state in the envelope, the session (vs interview) pack shape.

### 2. Memory hierarchy (cost + continuity = same mechanism: summarize + tier)
- **Envelope** (per-turn, tiny): objective ticks + focus + canvas state. Re-injected
  every turn. (Pattern exists.)
- **Working window** (bounded): last N turns sent to the model; older turns
  summarized on rollover into a running session summary. (NOT built — interview
  sends full history; a multi-day course would blow up cost.)
- **Durable learner record** (cross-day): the interview profile grown into a living
  doc — knows/doesn't-know, what he built, decisions, struggles. Each day loads a
  *slice*, writes updates at session end.
- **Cold store** (R2): full transcripts + artifacts, never auto-injected.
- Phase: working-window + end-of-session durable write first (enough for Day 1→2);
  cross-day retrieval discipline as days accumulate.

### 3. Persistence + observability
- Session state server-side in R2 (like interview sessions): transcript, objective
  state, canvas history, artifacts, memory record. (Move off client localStorage.)
- Instructor/dad view per session — objectives hit, transcript, artifacts, flags.
  Also the substrate for **human-on-the-loop** recursive improvement (telemetry →
  dad reviews → approved pack edits).

### 4. Authoring
- A day = a session pack (masterPrompt + objectives + canvasProgram). Zachary's
  Day 1 = the investing-decision module (curate arc slate → learn TAM/SAM/SOM,
  competitive landscape, SWOT, GTM → size 3 arcs → decide), 2–4 hrs.

### 5. Security / cost (before any real learner)
- Endpoint is public + calls a paid model → cost-abuse. Need: auth (CF Access or a
  session token), per-session turn cap / rate limit, key rotation, and keep the
  private interview bucket unreachable. (Also pending platform debt: Phase Q CF Access.)

## Questions for Fable to pressure-test
1. **Engine reuse vs fork:** is generalizing interview→session packs right, or does
   *teaching + verifying learning + driving a canvas* differ enough from *intake
   extraction* to warrant a separate engine? Where does the interview machinery stop
   fitting?
2. **Learning-objective verification:** how to gate "actually learned/did X" vs "we
   discussed X" — demonstrated application, a check question, a produced artifact —
   without turning the session into a cage?
3. **`[SHOW:]` model-driven canvas** vs author-scripted vs hybrid: is letting the
   model choose canvas content mid-lesson reliable enough? How to bound it?
4. **Memory:** is the 4-tier design right? Summarization strategy (when / which model
   / what to keep)? Rough per-session/day/course cost model?
5. **State ownership:** confirm the session must be server-authoritative + R2 (not
   stateless client-resend). Failure modes we've already hit: waitUntil budget cut a
   ~30s synth call mid-close; edge request budget limits.
6. **Security/cost gate:** minimal right gate for a public edge endpoint calling a
   paid model.
7. **Sequencing:** smallest real engine that makes Day 1 a genuine objective-tracked
   *lesson* (not a chat) — what's in the minimal build, what safely defers?
8. **Biggest risks:** where are we most likely to over-engineer, and where to
   under-build?

## Constraints (from CLAUDE.md / project reality)
- Stack: React + Tailwind + React Router + localStorage (client); CF Pages Functions
  + R2 (server); Anthropic via raw fetch at the edge (no SDK). Serverless — no
  long-lived process (rules out a real PTY terminal on the edge; that's a separate
  compute plane, deferred).
- Minimal surface area, no new deps without justification.
- Two private/public R2 buckets; the interview bucket must never be publicly reachable.
