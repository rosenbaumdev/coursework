# Fable Review #3 — Collaborative Artifacts + Declarative Figure Engine (2026-07-05)

Context: Jonathan completed the first real Day-1 dry run (Steps 3–4 are live:
`functions/_session.js` engine + endpoints + `useSSESessionDriver`). His feedback
produced two design changes that revise ground you reviewed. Decisions are made
(direction locked by Jonathan); your job is to pressure-test the DESIGN before we
build, not relitigate whether. Both land in the session engine + pack grammar.

Engine naming now in use: **Director** = the primary lesson engine/prompt (works
the board, drives canvas, proposes ticks; server verifies). **Usher** = the
secondary per-turn reformer (chips + guaranteed end-of-turn ask; no authority
over objectives/canvas/completion). The Usher is being built now, independent of
this review.

---

## Change 1 — Collaborative artifacts (REVISES your review-#2 blocking rule §2)

Dry-run finding: "Sizing memo is dumb to start from scratch. We already did a
bunch of work in the chat… Then I asked the chat to populate the artifact and it
says it cannot. That's unacceptable. We need to be able to collab and whatever we
create should go in the coursework file system so user can access it after the
course." Also: "on the second and third arc, the general memo format should
already be populated. Then user can edit."

Old contract (§2, your blocking fix C): artifact content is LEARNER-authored
only; model scaffolds via canvasProgram; otherwise minChars is theater.

New intent (locked): the Director CAN write into artifacts — drafting a memo
FROM the chat work already done, prepopulating the template/structure for
subsequent arcs — and the learner edits/embellishes/owns it. Artifacts persist
beyond the session into a learner-accessible file area ("my work"), surviving
the course.

Design to pressure-test (my proposal):
- `session.artifacts[id]` gains provenance: `{ content, segments?: none, history: [{by: 'director'|'learner', at, chars}], learnerEditedChars, lastLearnerEditAt }`. Server tracks who wrote what at write-time (two write paths: artifact endpoint = learner; a new Director write path = model).
- Director writes via a new control tag `[ARTIFACT: id]\n<content>\n[/ARTIFACT]` (or a structured variant you prefer) parsed server-side like [TICK:]/[SHOW:] — server stores with `by:'director'`, emits an SSE `artifact` frame so the canvas updates live.
- **Gate redefinition** (the crux): artifact objective tick honored when (a) content ≥ minChars AND (b) the LEARNER has materially edited it after the last Director write — measured how? Options: min learner-delta chars; a Haiku "did the learner make substantive changes/decisions?" verdict; or an explicit learner confirm step ("this is mine now") + logged diff for instructor review. Jonathan reviews reports anyway (human on the loop). Which gate is honest without being a cage? Is a diff-based `learnerDelta ≥ N` gameable/brittle (learner types 50 junk chars)? Is the rubric-driven Haiku verifier (your v1.1 artifact verifier, pulled forward) now REQUIRED rather than optional, since self-tick theater risk returns with model-written content?
- **Persistence**: end-of-session (and on-write?) copy of artifacts to the learner-visible store. Options: (a) public STORAGE bucket under the course's existing per-day file layout (`<r2Prefix>day-<id>/artifact/<artifactId>.md`) so the existing AssetList/files UI serves it with zero new UI; (b) private bucket + new authenticated "my work" route. Note CF Access is still NOT deployed (Step 6 pending) — anything in STORAGE is world-readable today. Zachary's memos are low-sensitivity but not nothing. Call it.

## Change 2 — Declarative figure engine (visual instruction authoring)

Dry-run finding: the TAM/SAM/SOM deck was text-only — "might as well be in chat.
Canvas is for things best shown visually or interactive… decks must be super
complementary, not regurgitory." Plus: "maybe the example calcs superimpose as
they crystallize on the concentric circles" — progressive build-up synchronized
with the conversation.

Locked direction: figures authored as DATA (declarative spec), rendered by a
generic client renderer; generalizable across courses; supports staged reveal.

Design to pressure-test (my proposal):
- New canvas type `figure`, payload = `{ kind, data, steps }` where `kind ∈ {concentric, quadrant, funnel, bars, timeline, flow}` (start with concentric + quadrant — Day 1 needs exactly those two: TAM/SAM/SOM circles, SWOT matrix).
- Spec shape example (concentric): `{ rings: [{id:'tam', label, sublabel?, value?}, ...], callouts: [{ringId, text, step}], steps: ['base','tam','sam','som','values'] }`. Renderer = React+SVG, no deps.
- **Progressive reveal**: directive payload carries `step` (current step index); the Director advances it via `[SHOW: figure.tamsamsom@step2]` or a dedicated `[STEP: n]` tag — which? Steps re-render the SAME directive id (no remount/fade). Values (e.g. the boba numbers, then HIS translator numbers) can be filled at runtime: payload `data` merged with `[SHOW:]`-time params? Or Director writes values via a `[FIGURE: id :: {...json}]` tag? JSON-in-tags is fragile — what's the robust minimal mechanism for "model injects 3 numbers into an authored figure skeleton"?
- Authoring stays in the pack's canvasProgram (validated targets, same as today); validator checks kind-specific spec shape.
- Risk I want called: is runtime-value-injection (model → figure) a v1 need or scope creep? Jonathan flagged it as "would be cool" (#7) — the static-but-staged version may be 90% of the pedagogic value at 40% of the complexity.

## What to return
Write `tasks/fable-collab-figures-review.md`: verdict + concrete design for each
(the exact gate rule for collaborative artifacts; the exact tag/step mechanism +
spec grammar for figures), flagged risks, what to defer. Keep it buildable-first
— this gets implemented immediately after your review. Read for context:
`functions/_session.js`, `functions/_sessionPacks.js`, `functions/_turnCore.js`,
`functions/[studentSlug]/api/session/*.js`, `src/components/session/canvas/*`,
`tasks/fable-grammar-review.md` (your §2 rule being revised), `tasks/todo.md`
(Phase T.4 = the full 14-item feedback list).
