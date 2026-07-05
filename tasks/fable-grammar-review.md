# Fable Review #2 — Session Pack Grammar (2026-07-04)

Scope: `functions/_sessionPacks.js` (grammar, parser, helpers, resolver, validator,
SHOWCASE_DAY), reviewed against `_inventory.js`, `_turnCore.js`, the client canvas
contract (`src/session/types.js`, `src/components/session/canvas/*`), and my own
arch review (findings #2 verification integrity, #3 validated `[SHOW:]`).
Harness re-run: **31/31 pass**, confirmed.

**Overall verdict: the grammar is the right shape — sibling-not-fork is correctly
executed, typed objectives land finding #2's design faithfully, and the resolver
emits exactly the `CanvasDirective` shape the client already renders (verified
against `types.js` and `ContentCanvas.jsx`). But it is NOT yet ready to receive
Day-1 content.** Four things must change first. All four are small; none is a
redesign. The pattern across them: the grammar is correct where it *enforces*
(parser, resolver, artifact gate) and soft where it *documents* (validator gaps,
showcase-as-template, undeclared engine needs). Since SHOWCASE_DAY is what every
authored day will be copied from, its flaws are the ones that multiply.

---

## Verdicts on the 10 design questions

### 1. Typed objectives inline on the checklist line → **KEEP**
Type is core semantics (it determines tick authority), not annotation — it belongs
where the author's eye is when writing the bar. A side map would drift from the
prose exactly the way `artifacts` gates *can't* drift (validator cross-checks
them). The parser enforces the enum via the regex alternation, so a typo'd type
fails loudly... except it doesn't — see Blocking A: a bad type makes the whole
line silently unparseable. Fix that in the validator and this factoring is right.

### 2. `check` = evidence-logged, verifier deferred → **CHANGE (one deterministic rule), then acceptable v1**
Evidence-logging-*if-present* is theater-adjacent: Sonnet under an agreeableness
gradient will emit `[TICK: concept.applied]` bare, and nothing stops it. The fix
needs no Haiku: **the engine must REJECT a `check` tick that carries no evidence
payload** — `[TICK: id]` without `:: <quote>` on a check-type objective is not
honored, the box stays open, and the next envelope says why. That's deterministic,
free, and converts "evidence logged when the model feels like it" into "no
evidence, no tick." With that rule + evidence surfaced per-objective in the exit
report (the schema already says "with evidence"), v1 without the verifier gets
the ~70% I claimed. Without that rule, a required `check` is still self-tick — the
exact hollow-tick failure the interview already demonstrated. Record the rule in
the grammar header now so it's part of the contract Day-1 is authored against.

Note for Step 3 (not a pack bug, but catch it now): `_turnCore.js` cannot carry
this yet. `TICK_RE` (`/\[TICK:([^\]]*)\]/gi`) splits `m[1]` on commas — an
evidence-bearing `[TICK: id :: quote]` parses as one garbage id containing `::`,
fails `isKnownObjective`, and is silently dropped. And `applyTurnEffects` line 62
*overwrites* the state object with `{ ticked, tickedAtTurn }`, discarding the
`evidence` field `newObjectiveState` declares. The session engine needs an
evidence-aware tick regex and an apply step that populates `evidence` — budget it.

### 3. Artifact objective id == artifact key → **KEEP**
The coupling makes `[TICK: memo]` unambiguous and lets the validator cross-check
both directions (it does, lines 351–353 and 368–372 — good). One-artifact-backing-
several-objectives is speculative; if a real day ever needs it, author a `check`
objective whose evidence quotes the artifact. Decouple only when a validator
error actually forces the question.

### 4. `canvasDefaults` per-objective, not per-phase → **KEEP**
The tier-2 fallback fires when *focus* advances, and `focusObjective` returns an
objective, not a phase — per-objective is the natural grain of the mechanism, not
over-fine. Phase-level defaults would need an objective→phase lookup anyway.
Sparse is fine: an objective without a default degrades to tier-3 keep-current,
which is the designed behavior. No phase tier needed.

### 5. `[SHOW:]` = validated canvasProgram keys + dynamic `artifact:<id>`, unknown → null → **KEEP; right bound, right layer**
Confirmed end-to-end: `resolveShowTarget` emits `{type, id, title, payload}` which
is exactly the `CanvasDirective` in `types.js`; `ContentCanvas` routes on `type`
and keys the fade on `id` (resolver injects `id = key`, so re-showing the same
target doesn't re-animate — correct). Null-for-unknown is the correct tier-3
trigger, and putting resolution in the pack module with the 3-tier *policy* in the
engine is the right split. Two notes: (a) `_turnCore` still lacks `SHOW_RE` in
`parseTurn` and `'[SHOW:'` in `CONTROL_STARTS` — Step 3, already on the arch
review's list, restated here so it isn't lost; (b) a canvasProgram key that
literally starts with `artifact:` would be shadowed by the dynamic branch —
validator should forbid the prefix (lint, non-blocking).

### 6. `masterPrompt` = day persona only, method in engine → **RIGHT SEAM, WRONG SHOWCASE**
The seam is correct — but SHOWCASE_DAY violates it. Its masterPrompt contains
"park genuine tangents to the notes list," "tick a box only when the bar in its
line is genuinely met," "drive the canvas," "move briskly through discuss / spend
real time on check/artifact" — that is *all* engine-universal method scaffolding,
verbatim the stuff `_session.js` will carry. Since the showcase is the template
every real pack gets copied from, this duplication gets baked into N days and
will later fight the engine's own scaffolding (two sources of tick discipline =
drift). Strip the showcase masterPrompt down to what a genuinely day-specific
persona looks like (register, subject-matter stance, day-specific emphasis) so
Day-1's author copies the right example. Blocking B.

### 7. `evidence` as a single string → **KEEP for v1**
One string per objective is enough for observability and for a future verifier's
input (`tickedAtTurn` already gives temporal context). Rejected tick attempts
belong in the transcript log, not objective state. Don't structure it until the
verifier exists and demands more. (The real evidence risk is Q2's — that the
field never gets populated at all.)

### 8. `exit.reportSchema` authored per-day → **CHANGE: engine default + optional pack override**
The showcase schema is already fully generic — seven sections, none day-specific —
which is the tell: 15 days would copy-paste it 15 times, and improving the report
shape later means editing 15 packs. Move this exact schema into `_session.js` as
the default; `exit.reportSchema` in a pack becomes an optional *override* (whole-
schema override is fine; per-section deltas are over-engineering). Do it now
because it changes what Day-1's author writes (nothing), not because Day 1 breaks
without it. Cheap, and it's the difference between a convention and a chore.

### 9. `entry.context` as prose → **KEEP**
Consistent with my #4 de-scope: one learner, whole record in the prompt, pack
highlights. Structured preload directives would be machinery for a retrieval tier
I already cut. One addition worth a comment, not a field: the prose as written
("Greet them by name... open on the brief") assumes a *fresh* start, but a
multi-hour day will be resumed across sittings — resume behavior is engine-generic
(re-render board, recap, continue) and must NOT be authored per day. Say so in
the grammar header so Day-1's author doesn't write resume choreography into
`entry.context`.

### 10. `[TABLE:]` parking reused as-is → **CHANGE: lesson tangents need a home that isn't an objective id**
This is the one place interview semantics genuinely don't cover lessons.
`applyTurnEffects` (line 67) drops any TABLE note whose `objectiveId` fails
`isKnownObjective`. Interview tangents always relate to some inventory box;
lesson tangents mostly don't ("can I use this to trade real stocks?" mid-SWOT
relates to no objective). Under current mechanics the model must either misfile
the tangent under an arbitrary objective (distorts the report) or invent an id
(silently dropped — worst case, the parked thread the wrap-up promises never
existed). Fix at the grammar level, decided now: **reserve the id `tangent` as an
always-valid TABLE target** — validator rejects any objective claiming it; engine
(Step 3) whitelists it in its apply step (an `opts.extraTableIds` on
`applyTurnEffects` is a two-line change). Non-blocking for authoring (no pack
field changes) but decide it now because the engine's method prose and the
board's parked-threads section depend on it.

---

## Blocking findings — must change before Day-1 authoring

**A. The parser silently drops malformed objective lines, and the validator
can't see it.** `LINE_RE` requires a literal em-dash (`—`) and an exact type
token. An author who writes a hyphen, an en-dash, `- [x]`, or `artefact` gets a
line that simply vanishes: 8 objectives authored, 7 parsed, and
`validateSessionPack` passes clean (its "no parseable objectives" check only
fires when *all* lines fail; a dropped `discuss`/`check` line trips nothing —
only a dropped `artifact` line gets caught, indirectly, by the orphaned-gate
check). This is precisely an authoring-time bug class, and content authoring is
the step we're gating. Fix: in `validateSessionPack`, flag any line matching
`/^- \[.\]/` that does not match `LINE_RE` — "objectivesMd line N looks like an
objective but doesn't parse." One loop, closes the whole class.

**B. SHOWCASE_DAY's masterPrompt is the wrong template** (Q6 above). Strip the
engine-universal method text before it becomes the copied-into-N-days example.

**C. Artifact provenance is undeclared, and it decides whether `minChars` is a
gate or theater.** `isArtifactSatisfied` measures `session.artifacts[id].content`
length — but the grammar nowhere says *who writes that content*. `ArtifactCanvas`
is learner-editable AND accepts driver pushes (`payload.content` flows in via
effect); if the engine ever lets the model seed a memo template into the artifact
(a natural, useful move), the template alone can clear `minChars` and the
"strongest, nearly-free gate" gates nothing. Decide now and write it into the
grammar header: **v1 rule — artifact content is learner-authored only; the model
scaffolds via canvasProgram (show a template as a `reading` target for the
learner to work from), never by writing into `session.artifacts`.** If a model-
write channel is ever added, the gate must measure learner delta over the seed —
but don't build that; just close the door. Zero code today; it's a contract line
that determines how Day-1's memo artifacts get specified.

**D. Per-day budget is a construct the engine needs that the pack doesn't
declare.** The interview hardcodes `MAX_TURNS` as an engine constant — right for
one instrument, wrong for a 15-day course where Day 1 is a 2–4 hr / 80–150-turn
outlier and other days are an hour. The cost ceiling and pacing envelope are
day-shaped facts, so they belong in the pack: add an optional
`budget: { maxTurns, targetMinutes }` (engine default when absent; validator
sanity-checks positive numbers). Day 1 is exactly the day that needs the
non-default value, so adding the field later means retrofitting the first pack
authored — the failure mode this checkpoint exists to prevent.

## Non-blocking (recommended, roughly in order)

1. **Validator lints** (cheap, one pass): (a) canvasProgram entry `type` must be
   in the known renderer set (`reading|deck|video|image|browser|terminal|artifact`)
   — the client shows "Unknown canvas type" rather than crashing, but a typo'd
   type is still a dead pane the validator could catch; (b) objective id charset
   `/^[a-z0-9][a-z0-9.\-]*$/i` — an id containing `,` breaks TICK's comma-split
   and `:` will collide with the coming `::` evidence delimiter; (c) forbid
   canvasProgram keys starting with `artifact:` (shadowed by the dynamic branch);
   (d) require `entry.canvas` (every day opens on something).
2. **`exit.reportSchema` → engine default + optional override** (Q8).
3. **Reserved `tangent` TABLE target** (Q10) — grammar-header note now, engine
   whitelist in Step 3.
4. **Optional `rubric` string on artifact gates** — one sentence of "what a good
   one contains." Not enforced in v1, but the engine can inject it into the
   envelope when focus reaches the artifact (raises quality for free) and it is
   the future Haiku artifact-verifier's input. Authoring Day 1 with rubrics costs
   minutes; retrofitting them is exactly the N-day tax.
5. **Optional per-check probe guidance** (side map, e.g.
   `checkGuidance: { 'concept.applied': 'have them size a coffee cart' }`) —
   feeds both the model's fresh-example generation and the v1.1 verifier. Fine to
   skip for Day 1; the ids make it additive later.
6. **Grammar-header note on resume** (Q9) — resume choreography is engine-generic,
   keep it out of `entry.context`.
7. `validateSessionPack` should tolerate string `day` values matching
   `/^\d+(\.\d+)?$/` or the numeric requirement should be documented against the
   course app's string day-id convention (sub-days like `"0.1"` happen to survive
   as the number `0.1`, but that's luck, not design).
8. Minor: `isArtifactSatisfied` returns `true` for an unknown id — safe today only
   because `applyTurnEffects` filters unknown ids first; a defensive `false` (or a
   comment stating the invariant) would cost nothing. `renderObjectiveBoard`
   interpolates evidence into quotes unescaped — a quote containing `"` or a
   newline mildly garbles the board; trivial sanitize.

## Step-3 engine needs surfaced by this review (so they don't get lost)

- Evidence-aware `TICK_RE` (`[TICK: id :: evidence]`) + `applyTurnEffects` that
  populates `evidence` instead of overwriting the state object (Q2 note).
- Deterministic reject of evidence-less `check` ticks (Q2).
- `isArtifactSatisfied` called before honoring artifact ticks (already designed).
- `SHOW_RE` in `parseTurn` + `'[SHOW:'` in `CONTROL_STARTS`.
- `tangent` whitelisted as a TABLE target (Q10).
- Per-day `budget.maxTurns` read from the pack, engine default fallback (D).

---

## The gating question

**Can Zachary's Day 1 be authored into this grammar right now? Not yet — but the
gap is one short session, not a redesign.** Blocking: **A** (validator must catch
silently-dropped objective lines — the em-dash/type-typo class), **B** (purge
engine-method text from the showcase masterPrompt before it becomes the
template), **C** (declare artifact provenance: learner-authored only, or
`minChars` is theater), **D** (add optional per-day `budget` — Day 1 is the
outlier day that needs it). All four are hours, not days, and none touches the
parser, resolver, or helper contracts — the 31 assertions should pass unchanged
except for new validator cases. Everything else on the list is additive and can
land with Step 3. Fix A–D, extend the harness to cover the new validator checks,
and author Day 1 immediately after — the underlying grammar is sound and I do not
expect a second grammar review to be necessary.
