# Fable Review #2 — Session Pack Grammar (Step 2, pre-content)

Scope: the **session pack grammar** just built in `functions/_sessionPacks.js`, reviewed
against `functions/_inventory.js` (the interview pack it's modeled on), `functions/_turnCore.js`
(the shared mechanics both engines call), and your own arch review `tasks/fable-arch-review.md`
(findings #2 verification-integrity and #3 `[SHOW:]` canvas especially). Design-level.

**Why now (the checkpoint the user asked for):** this grammar is the durable authoring
surface. Every real day pack — starting with Zachary's Day 1 — gets authored *into* it. We
want it hardened **before** pouring real content in, so a grammar flaw is fixed once, not
retrofitted across N authored days. Build order per your review: Step 1 (mechanics
extraction) is DONE + regression-verified; this is the framework half of Step 2. Zachary's
Day-1 content is deliberately NOT written yet — it waits on this review.

## What's built (and proven)
- `functions/_sessionPacks.js` — pack shape, parser, helpers, `[SHOW:]` resolver, validator,
  and ONE generic `SHOWCASE_DAY` skeleton (not course content) that exercises every construct.
- 31/31 unit assertions pass (`scratchpad/session-pack-test.mjs`): typed parse, focus/counts/
  complete, artifact gate at the minChars boundary, target resolution incl. live `artifact:<id>`,
  board render, valid-pack validation, and 5 distinct authoring-mistake catches.

## Design decisions made (please pressure-test each)

1. **Typed objectives on the checklist line.** Grammar is
   `- [ ] <R|B> <discuss|check|artifact> <id> — <need>` (interview was `- [ ] <R|B> <id> — <need>`).
   Type sits inline so authoring stays single-source. Right factoring, or should type live in a
   side map away from the prose?
2. **Tick authority by type** (your finding #2): `discuss` = model tick OK; `check` = tick must
   carry evidence (`[TICK: id :: quote]`), Haiku verifier deferred to Step 3/v1.1; `artifact` =
   tick honored ONLY IF `session.artifacts[id]` meets a declared `minChars` gate
   (`isArtifactSatisfied`, server-checkable). Is evidence-logging-without-the-verifier an
   acceptable v1 for `check` (you said it gets ~70% of the value), or is a required `check`
   without the verifier still theater?
3. **Artifact objective id == artifact key** (convention, enforced by the validator). Couples the
   tick id to the artifact key. Clean, or should an artifact objective reference its gate
   explicitly (`artifact:memo`) so one artifact can back several objectives / ids stay decoupled?
4. **`canvasDefaults` keyed per-objective** (not per-phase). Your review said "objective/phase";
   I chose the finer grain. Server tier-2 fallback shows `canvasDefaults[focusId]` when the model
   emits no `[SHOW:]`. Over-fine? Should phase-level defaults exist too (fewer keys to author)?
5. **`[SHOW:]` targets are validated keys.** `resolveShowTarget` maps canvasProgram keys +
   dynamic `artifact:<id>` → a `CanvasDirective` (client already renders this shape); unknown →
   null (tier-3 keep-current). Model sequences authored content, cannot invent it. Confirm this
   is the right bound and the 3-tier fallback lives at the right layer.
6. **`masterPrompt` = day-specific persona only**; the shared method scaffolding (canvas-control
   rules, tick discipline, evidence format, drift/parking) lives in the engine `_session.js`
   (Step 3), not the pack. Is that the right pack↔engine seam? What, if anything, currently in
   `masterPrompt` is actually engine-universal (or vice-versa)?
7. **`evidence` is a single string** per objective in `objectiveState[id]`. Enough for
   observability + a future verifier, or should it be a list / structured (turn no, kind)?
8. **`exit.reportSchema` authored per-day.** Mirrors the interview's `profileSchema`. Over-
   authoring for a 15-day course (most days want the same report shape)? Should the report shape
   be engine-shared with only per-day *deltas* in the pack?
9. **`entry.context` is prose**, not structured preload directives. The durable learner record is
   loaded by the engine (Step 5); the pack just says what to highlight. Right, or does entry need
   structure the engine can act on deterministically?
10. **`[TABLE:]` parking reused as-is** for lesson tangents (your "lesson arc — park own-tangents,
    surface at wrap-up"). Anything about lesson tangents that the interview's parking semantics
    don't cover?

## The one question that gates the next step
**Is this grammar complete and correct enough to author Zachary's Day 1 into right now** — the
investing-decision module (curate arc slate → TAM/SAM/SOM + competitive landscape + SWOT + GTM →
size 3 arcs → decide)? If not, what must change first? Anything the engine (Step 3) will need
from the pack that the grammar doesn't yet declare is the thing to catch here, not later.

## Files
- `functions/_sessionPacks.js` — the grammar (read this first)
- `functions/_inventory.js` — the interview pack it's a sibling of
- `functions/_turnCore.js` — shared mechanics both engines call
- `tasks/fable-arch-review.md` — your prior review (findings #2/#3 relevant)
- unit harness (session scratchpad): `/private/tmp/claude-501/-Users-jonathanrosenbaum-projects-coursework/60f7d2ae-4106-4690-a42c-1f7318bc44a6/scratchpad/session-pack-test.mjs` — run with `node`
