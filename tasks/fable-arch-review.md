# Fable Architecture Review — Session Platform (2026-07-04)

Scope: the go-forward design in `tasks/session-platform-architecture.md`, reviewed
against the actual code (`functions/_interview.js`, `_inventory.js`, the session
prototype) and the project's operating constraints. Design-level, not line-by-line.

**Overall verdict: the architecture is sound and the reuse bet is correct.** The
interview engine is genuinely well-factored for generalization — the mechanical
layer (control-tag parse, server-authoritative tick application, stream guard,
SSE plumbing, R2 session persistence, end-of-session synthesis) is content-agnostic
and exported. The parts that DON'T transfer are exactly the prompt layer
(`buildEnvelope`, `buildBaseSystemPrompt` are interview prose). That's the right
seam. Two findings below are **blocking** (I'd not put Zachary on the platform
without them); the rest are corrections and de-scopes.

---

## Verdicts on the 8 questions

### 1. Engine reuse vs fork → **Generalize, but at the mechanical seam — do not grow `_interview.js`**
Create `functions/_session.js` (the lesson engine) that imports the mechanical layer
from `_interview.js` (or better: move shared mechanics to a `_llm.js`/`_turnCore.js`
and have both engines import it — pure moves, interview endpoints untouched). Write a
NEW prompt layer for lessons. Do not parameterize the interview's envelope with
if/else — the two prompt registers (extraction vs instruction) will fight each other.

Where interview machinery stops fitting — confirmed in code:
- **Drift gate** is extraction logic ("only in service of a box"). A lesson wants
  *bounded exploration*: curiosity about the material is signal, not drift. Replace
  with a "lesson arc" block: stay inside today's material; park own-tangents to a
  notes list surfaced at wrap-up.
- **`MIN_TURNS_BEFORE_COMPLETE` is the wrong gate for lessons.** Turn-count floors
  proxy for depth in an interview; a lesson must gate on objectives + artifacts
  (see #2). Keep only a low sanity floor + the `MAX_TURNS` cost ceiling.
- **Tick semantics** change meaning (below).
- Envelope prose is gendered/hardcoded ("HIS words") — packs should carry pronouns.
- Long-term: the interview becomes just another session type with a synthesis exit
  step. Don't force that convergence now; let it fall out.

### 2. Learning-objective verification → **BLOCKING. Typed objectives + evidence-carrying ticks; never model-self-tick alone for required boxes**
This is the platform's thesis ("ensure the session objectives are achieved") and its
weakest current spot. The interview already demonstrated **hollow ticking** on a
*capture* objective (work.feedback ticked, profile said "no data"). Learning
objectives are strictly harder, and the tutor persona has an agreeableness gradient
toward ticking. Design:

- **Objective types** in the pack grammar, each with its own tick authority:
  - `discuss` (exposure: "he's seen TAM/SAM/SOM explained") — model tick OK.
  - `artifact` ("produced a sizing memo for arc #1") — tick VALID ONLY IF the named
    session artifact exists with non-trivial content. Server-checkable: artifacts
    live in session state; `applyTurnEffects` already validates tick ids against the
    inventory — extend the same pattern to validate artifact presence. This is the
    strongest gate and it's nearly free.
  - `check` (understanding) — tick must carry evidence (below), verified.
- **Evidence-carrying ticks:** extend the tag to `[TICK: id :: <learner-quote-or-
  artifact-ref>]`. Evidence is logged per tick (observability for Jonathan even when
  not blocking) — one regex change, one field in `inventoryState`.
- **Haiku verifier on required `check` ticks** (the suggestChips pattern, ~$0.001,
  one call per tick attempt): given objective + evidence + last few turns, judge
  "demonstrated or merely discussed?" Reject → box stays open, model told why in the
  next envelope. This is the adversarial-verify pattern at the right layer: per-tick,
  cheap, invisible to the learner.
- Gate completion only on `R` objectives, as today. Don't cage: `B` boxes stay soft,
  and a rejected tick redirects the *model*, never scolds the learner.

### 3. `[SHOW:]` — model-driven canvas → **Hybrid with authored spine + validated targets. Never freeform**
- Targets must be **keys in the pack's `canvasProgram`** — the model sequences
  authored content, it cannot invent content. Server validates the key exactly as
  tick ids are validated; unknown target → ignored. (Artifacts: `[SHOW: artifact:<id>]`
  for session-created artifacts.)
- **Authored fallback is mandatory.** Sonnet drops tags under load — you proved this
  with chips and fixed it with 3-tier fallback. Same tiering here: (1) model `[SHOW:]`
  tag → (2) objective-mapped default (each objective/phase in the pack names its
  default canvas target; when server-side focus advances, server emits the canvas
  change itself) → (3) keep current. The lesson's *spine* is thus deterministic; the
  model adds judgment, not reliability risk.
- Mechanics confirmed cheap: add `SHOW_RE` to `parseTurn`, add `'[SHOW:'` to
  `CONTROL_STARTS` in `safeEmitLen`, emit a `canvas` SSE frame. The client already
  renders `CanvasDirective`s — `resolveShowTarget()` maps target → directive.
- Envelope must carry `CANVAS NOW: <target>` (+ learner live-state summary — the
  prototype's `describeCanvas` drops in directly).

### 4. Memory → **4-tier design is right; DE-SCOPE the retrieval tier — the learner record fits in the prompt**
- **Correction (over-engineering):** "each day loads a *slice* of the learner
  record" — skip slicing entirely. One learner; the record will be 5–15KB after six
  weeks. Load the WHOLE record every session; `entryContext` merely *highlights*
  sections. No RAG, no embeddings, no retrieval machinery. Revisit only if the
  record ever exceeds ~30KB.
- **Working window is real and must ship in v1.** Confirmed in code: `message.js`
  sends full `session.history` every turn — quadratic token growth. A 2–4 hr Day 1
  could run 80–150 turns; unbounded history triples late-turn cost and adds latency.
  Design: keep last ~16 turns verbatim; when history exceeds ~24, fold the oldest
  half into a running `sessionSummary` via one Haiku call (async with the turn or
  inline — it's ~1s); envelope carries the summary block. Evidence quotes are
  already preserved at tick time, so summarization loses nothing that gates progress.
- **Durable learner record:** structured markdown in R2 (`records/<slug>.md` in the
  private bucket): sections = profile core / skills map / build log / decisions /
  open threads. Written at session end by the `generateAndStoreProfile` pattern
  (transcript-first, retry, never-throw, INLINE before stream close — the waitUntil
  lesson is already paid for). Interview profile seeds it.
- **Cost model (Sonnet 5, $3/$15 per M):** per turn ≈ 6–9K in / ~600 out ≈ $0.03.
  With the window bounded: 100-turn session ≈ **$3–4**; 15-session course ≈ **$50–60**
  total; Haiku verifier+chips+summaries add < $1. Entirely acceptable. Cheap upside:
  order the system prompt stable-prefix-first (master prompt + pack before the
  volatile envelope — already the concatenation order) and add prompt caching
  later; potential ~40–60% input savings, NOT needed for v1.

### 5. State ownership → **Confirmed: server-authoritative R2. Plus one missing guard: turn sequencing**
- The prototype's stateless client-resend chat must not survive into the platform —
  it's unauditable and spoofable (client could fabricate history). Server owns
  history/objectives/artifacts/canvas state in the session blob (interview pattern).
  Request shrinks to `{ message, canvasLiveState, selection }`. localStorage demotes
  to UI nicety.
- **Add a turn sequence number** to the session blob; client echoes it; server
  rejects stale/duplicate turns (409). The interview never hit this because one
  phone, one sitting — a multi-hour lesson with refreshes/tabs will. R2 has no
  transactions; last-write-wins on a double-submit would silently drop a turn.
- Keep every heavy exit call (record update, session report) inline-before-close
  with retry. Never `waitUntil` for must-complete work (lesson already learned).

### 6. Security/cost → **BLOCKING (pre-Zachary). Three cheap moves, one policy**
1. **The generic `/session` demo chat is an open, unauthenticated LLM proxy** —
   I un-gated it for testing (`onRequestPost` no longer checks the student). Fine
   on localhost; must be re-gated or removed before any deploy. Highest-priority
   single item in this review.
2. **Do Phase Q now and extend it:** CF Access on `/*/dad*` (long overdue) AND on
   session/interview API routes. For Zachary's frictionless login use Access
   one-time-PIN (email) — one cookie, then invisible.
3. **Server-side caps regardless of auth** (defense in depth): per-session
   `MAX_TURNS` (exists), plus a per-student daily turn budget in the session blob,
   plus "session must exist and day must be unlocked" to accept turns (the course
   state machine gives you this for free).
4. **Rotate the exposed Anthropic key.** Still pending. Do it before Day 1 regardless
   of everything else.

### 7. Minimal Day-1 engine → build list below. **Include** window memory, evidence
ticks + artifact gating, `[SHOW:]` with authored fallback, server state + seq guard,
end-of-session record write, CF Access + caps. **Defer:** Haiku check-verifier can
ship in v1.1 if time pressures (evidence-logging alone gets 70% of the value with
Jonathan reviewing), instructor dashboard UI (read the R2 session report directly at
first), prompt caching, Ollama, live PTY, browser proxy, `vsh` polish (Day 1 is an
investing-decision day — it needs reading/deck/artifact/browser, no terminal at all).

### 8. Over/under-engineering
- **Over:** memory retrieval (cut — see #4); canvas CMS ambitions (Day 1 needs
  ~8 authored targets, hand-written in the pack); instructor dashboard before there's
  anything to observe; terminal realism (not on Day 1's critical path).
- **Under:** objective verification (the thesis — do not ship self-tick-only);
  the open demo endpoint; turn-sequencing guard; and a **dry-run protocol** — run a
  full simulated-Zachary Day 1 (the interview pilot caught hollow-ticks and the
  0-tick over-correction; the lesson pack will have equivalent bugs).

---

## The two blocking findings, restated
1. **Verification integrity (Q2):** typed objectives + evidence ticks + artifact
   gating, or the platform's core promise ("objectives actually achieved") is
   theater. Cheapest strong version: artifact-gated ticks (server-checkable) for
   every doing-objective, evidence strings on everything else.
2. **Security (Q6):** un-gate the demo endpoint before deploy; CF Access + daily
   caps + key rotation before Zachary's first real session.

## Recommended build order (each step verifiable)
1. **Mechanics extraction** — shared `_turnCore.js` (parse/apply/stream/persist);
   interview endpoints keep working (regression: run an interview turn).
2. **Session pack grammar + Day-1 skeleton pack** — masterPrompt, typed objectives
   (R/B × discuss/check/artifact), canvasProgram with per-objective defaults,
   pronouns, entry/exit spec. Zachary's real Day-1 content authored here.
3. **Session engine + endpoints** — `_session.js` prompt layer; `start`/`message`
   with R2 state, seq guard, `[SHOW:]` (3-tier), evidence ticks, artifact store,
   window memory. Unit-test parse + fold + gates (the chips.mjs precedent).
4. **Client swap** — `useSSESessionDriver` behind the existing `DriverState` seam;
   canvas frames from server; artifact edits sync into session state.
5. **Exit + memory write** — session report + learner-record update inline; seed
   record from Zachary's interview profile.
6. **Gate it** — CF Access (incl. Phase Q debt), caps, key rotation, kill open demo.
7. **Dry run** — full simulated-Zachary Day 1; fix; only then the real Day 1.
8. **Adversarial review** — after step 3–5 exist, on the engine/endpoints/memory
   (the durable surface), per the agreed operating model.

Steps 1–3 are the meat; 4–6 are small; 7 is discipline. This is roughly a week of
focused sessions, and nothing in it is speculative — every mechanism has a proven
ancestor in the codebase.
