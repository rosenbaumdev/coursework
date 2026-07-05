# Fable Review #3 — Collaborative Artifacts + Declarative Figure Engine (2026-07-05)

Scope: pressure-test and concretize two locked design changes against the live
Steps-3/4 code (`_session.js`, `_sessionPacks.js`, `_turnCore.js`, the three
session endpoints, `useSSESessionDriver`, the canvas layer). Direction is not in
question; correctness and buildability are. This review REVISES my review-#2
blocking rule §2 (artifact provenance) — the revision is sound *if and only if*
the gate below ships with it, verifier included. It also flags one pre-existing
lost-update bug (F1) that Change 1 turns from latent into likely — fix it in the
same PR.

**Verdicts up front:**
- **Change 1 (collaborative artifacts): APPROVE with a three-layer gate.** The
  Haiku artifact-verifier (my v1.1 suggestion) is now **REQUIRED in v1** — with a
  model-writable artifact, every deterministic gate alone is theater. Min-learner-
  delta as a gate is REJECTED (gameable both directions); it survives only as
  report telemetry. No explicit "this is mine" confirm button — it's a one-click
  ritual, and the ownership check already lives in the conversation + verifier +
  Jonathan's report review.
- **Change 1 persistence: private bucket now, learner-visible surface at Step 6.**
  Do NOT copy artifacts into public STORAGE today — it is world-readable via the
  unauthenticated `/files` proxy and CF Access is not deployed. Called explicitly
  in §1.6.
- **Change 2 (figure engine): APPROVE as specced, with `[SHOW: <key>@<step>]` as
  the step mechanism** (no `[STEP: n]` tag — ambient state, relative counting,
  two grammars for one concept). Runtime value-injection is **DEFERRED to v1.1**
  with the tag grammar reserved now so the spec doesn't reshape later. Static-
  staged covers Jonathan's actual quote (the *example* calcs crystallizing);
  injecting HIS numbers is the "would be cool" tail.

---

## Change 1 — Collaborative artifacts

### 1.1 The revised contract (replaces grammar contract §2)

> **§2 (v2). ARTIFACT CONTENT IS CO-AUTHORED; OWNERSHIP IS VERIFIED.** The
> Director MAY write artifact content via `[ARTIFACT: id]…[/ARTIFACT]` — to
> consolidate work already done in chat, or to prepopulate structure for a later
> arc. It may only write what the learner has already said or the pack's
> template structure — never the learner's decisions, numbers, or reasons for
> them. The artifact tick is honored ONLY when (a) the gate's `minChars` is met,
> (b) the learner has saved a real edit AFTER the last Director write, and
> (c) the ownership verifier passes. Provenance (who wrote what, when) is logged
> and surfaced in the session report for instructor review.

The masterPrompt-level instruction that pairs with it (engine METHOD section,
replacing the current "You NEVER write his artifact" paragraph):

```
ARTIFACT objectives. You may draft INTO the artifact pane with:
[ARTIFACT: id]
<full replacement content, markdown>
[/ARTIFACT]
Use it two ways only: (1) consolidate what {subject} already worked out in chat
into the memo so {subject} doesn't retype it; (2) prepopulate the template/shared
structure when {subject} starts a later arc. Write ONLY what {subject} said or
the template scaffold — leave {possessive} numbers, picks, and reasons as
blanks or [YOUR NUMBER] markers for {object} to fill. The tick is honored only
after {subject} has edited the draft and made it {possessivePronoun}: the server
rejects a tick until {subject} has saved real changes after your draft AND an
ownership check passes. Draft, hand the pen back, then verify what {subject}
changed and why before ticking. Place the [ARTIFACT:] block at the END of your
turn, after your chat prose.
```

("Blanks for the learner's numbers" is what makes gate layer (b)+(c) a natural
workflow instead of a cage: the Director's honest draft is *structurally
incomplete*, so the learner's edit is the point, not a tax.)

### 1.2 State shape (server, `session.artifacts[id]`)

```js
session.artifacts[id] = {
  content: string,
  title, format,                    // unchanged, from the gate
  updatedAt: ISO,                   // unchanged (last write, either author)
  by: 'learner' | 'director',       // author of the LAST write
  lastDirectorWriteAt: ISO | null,
  lastLearnerEditAt: ISO | null,
  directorDraft: string | null,     // full content AS OF the last director write
                                    //   (the diff base for the verifier + report;
                                    //   overwritten on each director write)
  history: [{ by, at, chars }],     // capped at 30 entries, chars = content.trim().length
  verifier: { hash, pass, reason, at } | null,  // last ownership verdict (cached by hash)
}
```

No `learnerEditedChars` counter — compute the delta at report time from
`directorDraft` vs final `content`. No `segments` — whole-document replace only
(memos are <2KB; segment tracking is machinery with no consumer).

Session bump: `v: 2`. Old v1 sessions are throwaway test data (Jonathan already
decided restart-fresh); `start.js`/`message.js`/`artifact.js` check `v !== 2` →
404 "start one first". Do NOT write a migration.

### 1.3 The Director write path (tag → parse → apply → SSE)

**Tag grammar.** Block form, one artifact per block, REPLACE semantics:

```
[ARTIFACT: <id>]
<content — markdown, may contain anything except the literal closing tag>
[/ARTIFACT]
```

- Regex: `/\[ARTIFACT:\s*([^\]\n]+?)\s*\]\n?([\s\S]*?)\[\/ARTIFACT\]/g` in
  `_turnCore.parseTurn` → `parsed.artifactWrites: [{ id, content }]`.
  Last block wins per id; cap **2 blocks per turn** (drop extras, log to
  transcriptLog).
- **Unterminated block** (max_tokens cutoff): also strip
  `/\[ARTIFACT:[^\]\n]*\][\s\S]*$/` from `cleanText`, DISCARD the partial
  content (never apply a half-memo), and set a flag the envelope surfaces next
  turn: `ARTIFACT WRITE TRUNCATED last turn — redraft, shorter.` Without this
  strip, the raw block lands in `done.message` and the learner sees it (the
  stream guard only protects mid-stream, not the settle frame).
- `CONTROL_STARTS` gains `'[ARTIFACT:'` — `safeEmitLen`'s existing
  partial-suffix guard then covers it with zero other changes. Consequence:
  once the tag starts, chat streaming freezes until settle (~10–20s for a
  1500-char draft). Accepted for v1 (prose streams first, block is last, per
  the prompt). To kill the dead-air feel cheaply: in `message.js`'s pump, when
  `acc` first contains a complete `[ARTIFACT: <id>]` header, emit one
  `{ type: 'artifactPending', id }` frame; client shows a shimmer/"drafting…"
  state on that artifact pane. Do NOT build live token streaming into the pane
  in v1 (incremental block parsing + a second emit channel; defer).

**Apply (in `message.js`, settle sequence — order matters):**

```
1. parsed = parseTurn(full)
2. FOR each parsed.artifactWrites {id, content}:
     - id must be in pack.artifacts, else drop (transcriptLog only)
     - conflict rule (see 1.5): if a learner write for this id landed after
       turn-start snapshot → DROP the director write, envelope-note it
     - else: set content/by:'director'/lastDirectorWriteAt/directorDraft,
       push history, content.length cap = MAX_ARTIFACT_CHARS
3. applyTurnEffects(...)          // tickGuard reads the JUST-updated artifacts —
                                  // gate (b) makes same-turn draft-and-tick
                                  // structurally impossible (see 1.4)
4. resolveCanvasChange(...)       // AFTER writes, so [SHOW: artifact:id] in the
                                  // same turn resolves with the new content
5. emit { type:'artifact', id, content, by:'director', satisfied, chars, minChars }
   per applied write   — BEFORE the canvas frame and the done frame
6. history/transcript/seq/fold/save as today  (cleanText has blocks stripped —
   critical: a 1.5KB memo must not enter the fold window N times)
```

**SSE frame** (new, distinct from `canvas` because the artifact may not be on
canvas): `{ type: 'artifact', id, content, by, satisfied, chars, minChars }`.
Client (`useSSESessionDriver`): keep an `artifactsRef` map; on frame → update
map; if the pane for that id is mounted and NOT dirty → push content in; if
dirty → **learner wins** (see 1.5).

**Envelope additions** (`buildSessionEnvelope`, ARTIFACTS section): per artifact
add provenance + content visibility so the Director can draft sensibly:

```
- sizing.gear: 620/400 chars — GATE met... | last write: director (turn 41);
  learner has NOT edited since — tick would be REJECTED (ownership).
```

Full current content is included ONLY for (a) the artifact currently on canvas
(already arrives via canvasLiveState) or (b) the focus objective's artifact —
inject `content` fenced, clipped to 2500 chars. Others stay length-only. Without
this the Director redrafts blind and clobbers learner work with stale text.

### 1.4 The tick gate — exact rule

`makeTickGuard` for `obj.type === 'artifact'` becomes (replacing the bare
`isArtifactSatisfied` call):

```
GATE(id):
  a. content.trim().length >= gate.minChars                       (unchanged)
  b. IF art.lastDirectorWriteAt is set:
       art.lastLearnerEditAt > art.lastDirectorWriteAt            (ordering, not delta)
  c. ownership verifier verdict === pass                          (Haiku, REQUIRED v1)
All three → honor. Any fail → reject; rejection REASON goes into
session.rejectedTicks entries as { id, reason: 'gate'|'ownership'|'unedited' }
and the envelope's REJECTED line says which (the current string join becomes
"id (reason)").
```

Layer rationale, answering the brief's questions directly:

- **Is `learnerDelta ≥ N` chars the gate?** No — rejected. It fails in both
  directions: 50 junk chars pass it (gameable), and a learner who genuinely
  reviews a faithful consolidation and fixes only two numbers fails it
  (brittle, and punishes exactly the collaboration we just built). Character
  deltas measure typing, not decisions. The delta survives ONLY as report
  telemetry (`directorDraft` vs final, computed at exit).
- **Layer (b) — the deterministic floor.** A pure ordering check
  (`lastLearnerEditAt > lastDirectorWriteAt`) is free, ungameable *by the
  model* (which is the primary adversary — the interview's hollow-tick failure
  was Sonnet under agreeableness pressure, not the learner), and it makes
  "Director drafts and ticks in the same turn" structurally impossible: the
  write in step 2 just refreshed `lastDirectorWriteAt`, so (b) is false until a
  learner save lands. `artifact.js` must set `lastLearnerEditAt` ONLY when
  `content !== existing.content` (a no-op save must not count).
- **Layer (c) — the Haiku ownership verifier, now REQUIRED in v1.** Yes:
  pulled forward from my v1.1 list, and the reasoning is exactly the brief's —
  self-tick theater returns the moment the model can write content, because a
  rubric-satisfying, minChars-clearing memo can now be 100% Director-written
  plus one learner keystroke to clear (b). Note the verifier's question changes
  from my v1.1 framing: it is NOT "does the content meet the rubric" (the
  Director can write rubric-passing content) — it is **"did the learner make
  the substantive decisions?"** Spec:

  ```
  Model: claude-haiku-4-5, max_tokens 300, one call at tick-attempt time.
  Trigger: gate layers (a)+(b) passed AND cached verdict hash mismatch.
  Cache: session.artifacts[id].verifier keyed by sha-256 of content — repeated
    attempts on unchanged content don't re-bill (expect ≤ ~8 calls/session).
  Input: gate.rubric; directorDraft (or '(none — learner-authored from scratch)');
    final content; the learner's last 8 chat turns (verbatim window slice).
  Output (strict JSON, parse-or-fail): { "pass": bool, "reason": "<≤140 chars>" }
  Prompt core: "Did the learner make the substantive changes and decisions in
    this document — their own numbers, picks, and reasons, consistent with what
    they said in chat — rather than cosmetically accepting the draft? Trivial or
    junk edits over a director draft = fail. Judge the diff and the chat, not
    prose quality."
  Failure policy: verdict pass=false → REJECT tick, reason into rejectedTicks →
    envelope (the Director's natural recovery is to make the learner walk
    through their numbers — which is the pedagogy anyway). Haiku CALL ERROR
    (network/5xx) → fail-OPEN: (a)+(b) already held, log
    verifier:{pass:true, reason:'verifier-unavailable'} for the report. Fail-
    closed on errors would let a transient outage brick the day's core loop.
  Pure learner-authored artifacts (no director write ever): run (a) + (c) with
    directorDraft='(none)' — (c) degrades to a light rubric/junk check. Keeps
    one code path and still catches keyboard-mash past minChars.
  ```
- **Explicit confirm step ("this is mine") — rejected.** One click is exactly
  as gameable as 50 junk chars, and it adds UI for a guarantee the transcript
  already gives: the Director is instructed (masterPrompt above) to verify what
  the learner changed and why *in conversation* before ticking — which
  produces evidence in the transcript, feeds the verifier's chat window, and is
  the thing Jonathan actually reads. Human-on-the-loop is the diff in the
  report (§1.7), not a checkbox.

### 1.5 The race with learner edits — three writers, one JSON blob

**F1 — pre-existing lost-update bug, now likely instead of latent.** Today:
`message.js` loads the session at turn start, holds it in memory for the whole
stream (10–30s), and `saveLesson` writes the WHOLE object at settle. The
client's debounced `syncArtifact` timers keep firing while a turn streams
(nothing checks `sendingRef`), so a mid-turn `artifact.js` write is silently
clobbered by the settle save. Collaborative artifacts raise both the write
frequency and the stakes. Fix both ends, same PR:

1. **Client:** `flushArtifact` defers while a turn is in flight — if
   `sendingRef.current`, leave the pending entry and re-arm; flush all pending
   on `done`/`error`. (Edits made during streaming stay local until the turn
   settles — also what makes the conflict rule below almost never fire.)
2. **Server (belt-and-braces):** at turn start, snapshot
   `artifactsAtTurnStart = { [id]: updatedAt }`. At settle, ONE extra R2 read
   of the lesson; for any artifact whose stored `updatedAt` is newer than the
   snapshot, adopt the stored version into the in-memory session before
   applying director writes and saving. A director write for an id with such a
   newer learner write is **DROPPED** (learner wins), with an envelope note
   next turn: `Your draft for <id> was not applied — {subject} edited it while
   you wrote. Current content is above; redraft only if still needed.`

**Client-side conflict (pane dirty when a director frame arrives):** the rule
is **learner wins, deterministically**. If the ArtifactCanvas for that id has
unsaved local edits, do NOT overwrite the textarea with the frame's content;
keep the learner's text, flush it after settle (server then holds learner
content; the Director sees it in the next envelope and can re-offer). The
director's dropped draft is not lost to the instructor — it's in
`transcriptLog` (raw turn) either way. No "Apply / Keep mine" dialog in v1:
it's UI for a window that rules 1+2 shrink to near-zero.

Client dirty-tracking is the one real client change: `ArtifactCanvas` needs to
report dirty state (content !== last-synced content) up through the existing
`onLiveState`/`syncArtifactRef` plumbing in `SessionView` — a `dirtyRef` map in
the driver keyed by artifact id, cleared on flush.

**Seq guard: unchanged.** `artifact.js` writes don't bump `seq` today and must
not start — learner artifact saves are not turns. Director writes happen inside
the message turn under the existing guard. No new 409 paths.

### 1.6 Persistence — the call

**Canonical store stays the PRIVATE bucket (`INTERVIEW`), now with per-artifact
keys; the learner-visible "my work" surface waits for Step 6 (CF Access). Do
not write artifacts into public STORAGE today.**

- STORAGE is world-readable right now: `/{slug}/files/*` proxies any key under
  the course prefix with zero auth, and CF Access is not deployed. "Zachary's
  memos are low-sensitivity but not nothing" — they're a minor's named work
  product with his school/team/social details baked into the GTM sections (the
  pack literally instructs grounding in "his school, his team, the friends who
  ask him"). That's not something to make world-readable to save a route.
  Whitelist-over-allow-all is also the standing preference. Called.
- Mechanics: on every settle that changed an artifact (and at session
  completion), mirror each artifact to
  `lessons/<slug>/<course>/artifacts/day-<dayId>/<artifactId>.md` in INTERVIEW
  (idempotent put, content + a small front-matter block: title, day, updatedAt,
  by, verifier verdict). This survives the course regardless of what happens to
  the session JSON, and gives Step 6's "my work" view a clean listing prefix to
  serve through whatever auth ships then.
- Interim learner access is NOT blocked: `start.js` resume already returns
  `artifacts` even for completed sessions, so revisiting the day shows the
  memos. The file-manager surface is deferred days, not capability.
- At Step 6, the decision is a copy job + one authenticated route — nothing
  about today's layout forecloses either option (a) or (b) from the brief.

### 1.7 Report additions (exit, Step 5 — record now so it's built in)

Per artifact in the day report: `by`-timeline summary, director-draft vs final
char delta, verifier verdict + reason, and the final content itself. This is
the human-on-the-loop layer: Jonathan sees at a glance "director drafted 900
chars turn 41, learner changed 210 turn 44, verifier: pass — 'replaced all
three SOM numbers with his own school counts'."

---

## Change 2 — Declarative figure engine

### 2.1 Canvas type and spec grammar

New canvas type `figure` (add to `CANVAS_TYPES`, `RENDERERS`,
`describeCanvas`). Directive payload: `{ kind, spec, step }` where `step` is the
resolved current step INDEX (renderer input is always resolved — the renderer
never sees step names it must look up).

**The reveal mechanic is generic, not per-kind** — this is the load-bearing
authoring decision. A spec declares `steps: [<stepId>...]` (ordered, unique
strings), and any revealable element carries `step: <stepId>` = "visible from
this step onward". Elements without `step` are always visible. The renderer
filters by `stepIndexOf(el.step) <= currentStep` and applies a CSS fade/scale-in
when an element first appears. Every future kind (funnel, bars, timeline, flow)
inherits staged reveal for free.

**Concentric** (TAM/SAM/SOM):

```js
'figure.tamsamsom': {
  type: 'figure',
  title: 'TAM / SAM / SOM — sizing the translator',
  payload: {
    kind: 'concentric',
    spec: {
      rings: [                       // ordered OUTERMOST → INNERMOST
        { id: 'tam', label: 'TAM',  sublabel: 'everyone who could use it', value: null, step: 'tam' },
        { id: 'sam', label: 'SAM',  sublabel: 'the slice you can reach',   value: null, step: 'sam' },
        { id: 'som', label: 'SOM',  sublabel: 'year-one winnable',         value: null, step: 'som' },
      ],
      callouts: [                    // leader-lined annotations
        { id: 'c1', ringId: 'sam', text: '~2,000 kids within 10 min (boba example)', step: 'values' },
        { id: 'c2', ringId: 'som', text: '200 pass daily × 1-in-4 × $6', step: 'values' },
      ],
      steps: ['base', 'tam', 'sam', 'som', 'values'],
    },
  },
}
```

`value` on a ring renders inside/under the label when non-null (authored
worked-example numbers — the boba calcs — arrive as callouts/values at their
step; that IS Jonathan's "superimpose as they crystallize", statically staged).
Ring sizing: equal radial spacing outermost→innermost, not value-proportional
(values differ by 10³ — proportional circles are unreadable; this is a concept
diagram, not a chart).

**Quadrant** (SWOT):

```js
{
  kind: 'quadrant',
  spec: {
    rows: ['Internal', 'External'],       // optional axis labels
    cols: ['Helps', 'Hurts'],
    quadrants: [                          // exactly 4, order TL,TR,BL,BR
      { id: 's', label: 'Strengths',     items: [{ id: 's1', text: 'You ARE the customer', step: 'fill' }], step: 'grid' },
      { id: 'w', label: 'Weaknesses',    items: [...], step: 'grid' },
      { id: 'o', label: 'Opportunities', items: [...], step: 'grid' },
      { id: 't', label: 'Threats',       items: [...], step: 'grid' },
    ],
    callouts: [{ id, quadrantId, text, step }],
    steps: ['grid', 'fill'],
  },
}
```

Renderer: `FigureCanvas.jsx` routing `kind` → `ConcentricFigure` /
`QuadrantFigure`, React+SVG, zero deps, `viewBox`-scaled to the pane. Unknown
`kind` → the existing "Unknown canvas type"-style dead-pane message (validator
catches it at author time anyway).

### 2.2 Step advance: `[SHOW: <key>@<step>]` — and why not `[STEP: n]`

**Mechanism: extend the existing `[SHOW:]` grammar.** `[SHOW:
figure.tamsamsom@som]` (step id, preferred) or `@3` (index — accepted, but
author guidance says use names; ids survive step-list edits, indices don't).
Plain `[SHOW: key]` on a figure = keep that figure's last-shown step if any,
else step 0 (so tier-2 defaults and re-shows resume rather than reset).

`[STEP: n]` rejected on three counts: (1) it's ambient — meaningful only
relative to "the current figure", and the model provably loses ambient state
(that's why every other control is absolute/idempotent); (2) relative or
absolute-n counting drifts off-by-one over a 150-turn day, and a wrong `n` has
no self-evident target to validate against; (3) it's a second grammar for what
`[SHOW:]` already means — "put the canvas in this state." `@step` is absolute,
idempotent, backward-navigable ("let's go back to SAM"), validator-checkable,
and one grammar.

**Server mechanics:**

- `resolveShowTarget(pack, target, artifacts, figureState)`: split on the FIRST
  `@`; base key resolves exactly as today. If the entry is `type:'figure'`:
  resolve step (`id → index`, or numeric clamp to `[0, steps.length-1]`);
  unknown step id → **ignore the step part, keep current** (do NOT null the
  whole directive — a typo'd step must not blank the canvas). Emit
  `{ type:'figure', id: <BASE key>, title, payload: { kind, spec, step } }`.
  **`id` = base key without `@step`** — this is what makes step advance
  re-render in place: `ContentCanvas` keys the fade wrapper on `directive.id`,
  so same id + new payload = no remount, no fade, elements animate in. (Exactly
  the brief's "re-render the SAME directive id" requirement; it falls out of
  the existing keying for free.)
- `@step` on a non-figure target: strip and ignore (lint-level tolerance).
- Session state: `session.figureState = { [baseKey]: stepIndex }` (persisted —
  resume must restore the build-up, not reset the circles). `canvasTarget`
  stays the BASE key. `resolveCanvasChange`'s "same target → no change" check
  becomes: same base key AND same resolved step → no change; same key,
  different step → emit (it's a step advance, the whole point).
- `currentCanvasDirective` (start/resume) passes `figureState` through.
- System prompt CANVAS line addition: `Figures build in steps — advance with
  [SHOW: <key>@<step>]; steps for each figure are listed with its target.` And
  the target list renders figure targets as
  `figure.tamsamsom (figure; steps: base|tam|sam|som|values)`.
- Envelope `CANVAS NOW`: `figure.tamsamsom @ sam (3/5)` so the Director knows
  where the build-up stands. `describeCanvas` gains a `figure` case: kind,
  title, current step name + index, visible elements' labels/text — this is
  what makes SEEN-vs-SHOWN and marquee-pointing work on figures.

**`canvasDefaults` / `entry.canvas`: base keys ONLY** (validator rejects `@` in
them). Tier-2 fires on focus advance with resume-or-0 step semantics; a default
that hard-jumped to a late step would skip the build-up that is the feature.

### 2.3 Validator additions (kind-aware, same pass)

- `type:'figure'` → `payload.kind` ∈ {concentric, quadrant} (grows with
  renderers); `payload.spec` present.
- Generic: `steps` if present = unique nonempty strings; every element `step`
  value ∈ `steps`; element `id`s unique within their collection.
- concentric: `rings` nonempty, ordered ids unique; `callouts[].ringId` ∈ rings.
- quadrant: exactly 4 quadrants; `callouts[].quadrantId` ∈ quadrants.
- `canvasDefaults`/`entry.canvas` values contain no `@`.
- (Runtime, already covered: unknown `@step` in a live `[SHOW:]` degrades to
  current step, never to a blank canvas.)

### 2.4 Runtime value-injection: DEFER to v1.1 — with the grammar reserved

**Verdict: not v1.** The brief's own instinct is right and I'll sharpen it:
Jonathan's quote — "the example calcs superimpose as they crystallize" — is
about the WORKED EXAMPLE (boba), and authored `value`/callout elements on a
`values` step deliver exactly that, statically, at zero marginal engine cost.
Injecting *his* numbers live is item-#7 "would be cool," and it drags in: a
write channel from model → authored spec (merge semantics, sanitization), a
validation story for model-supplied values, and JSON-in-tags fragility the
brief already distrusts. Meanwhile his numbers already land somewhere better:
the sizing memo artifact — which is the deliverable that persists.

**Reserve the mechanism now** so the spec doesn't reshape later (this is why
`value: null` slots exist in the ring spec): v1.1 adds a key=value tag — NOT
JSON —

```
[FIG: figure.tamsamsom :: som=“$3,600/yr (his count)”, sam=2000]
```

`ringId=value` pairs, comma-split with quoted-value tolerance, values are
STRINGS rendered verbatim (never parsed as numbers), unknown ids dropped,
stored as `session.figureValues[baseKey] = { ringId: string }` and merged over
the authored spec at resolve time. Grammar note goes in the header now; zero
code now.

---

## Interactions with existing mechanics (question 5)

1. **F1 lost-update race** — pre-existing, promoted to fix-now by Change 1.
   Detailed in §1.5 (client flush-deferral + server settle-merge). This is the
   one finding I'd call blocking-adjacent for the current code even if neither
   change shipped.
2. **Seq guard** — no interaction by design: artifact saves stay seq-free,
   director writes ride inside the guarded turn. Keep it that way; do not be
   tempted to seq-guard `artifact.js` (it would 409 every debounce flush after
   a turn settles).
3. **Fold/window memory** — two rules keep it safe: `[ARTIFACT:]` blocks are
   stripped from `cleanText` (a 1.5KB memo must not sit in `history` and get
   re-folded N times — token bloat AND the fold summary would start describing
   memo prose as conversation), and artifact content lives in
   `session.artifacts` + envelope, which never folds. The fold prompt needs no
   change — "artifacts worked on" is already in its keep-list. `figureState` is
   likewise envelope-carried, fold-immune.
4. **Evidence ticks / rejectedTicks** — `rejectedTicks` entries grow a reason
   (`gate` | `unedited` | `ownership`); the envelope's REJECTED line renders
   it per id. Without the reason, the Director can't distinguish "make him
   edit" from "make him defend his numbers" — the recovery moves differ.
   `MAX_NEW_TICKS_PER_TURN` unchanged.
5. **Validator** — additions in §2.3 plus: nothing new needed for artifacts
   (gates/rubrics unchanged — the rubric now ALSO feeds the required verifier,
   which retroactively justifies making rubrics effectively mandatory: add a
   validator WARNING, not error, for an artifact gate without one).
6. **safeEmitLen / settle frame** — `'[ARTIFACT:'` in `CONTROL_STARTS` covers
   mid-stream; the unterminated-block strip (§1.3) covers the settle-frame
   leak; `done.message`/`history` both use the stripped `cleanText`. `[SHOW:
   key@step]` needs zero streaming changes (`SHOW_RE` already matches it; only
   `resolveShowTarget` learns to split `@`).
7. **start.js opener** — allow `parsed.artifactWrites` in the opener too (same
   apply step): a later-day pack whose entry context says "the memo structure
   from Day 1 carries over" can prepopulate on turn 0. No special casing; the
   gate's layer (b) already guarantees an opener draft can't self-tick.
8. **`resolveShowTarget` signature change** — it gains `figureState`; three
   call sites (`resolveCanvasChange` ×2, `currentCanvasDirective`) plus the
   harness. Mechanical, but list it so the harness gets extended, not patched.

## Defer list (explicit)

- Live token-streaming of `[ARTIFACT:]` content into the pane (v1 =
  settle-apply + `artifactPending` shimmer).
- `[FIG: key :: ringId=value]` runtime value injection (v1.1; grammar reserved,
  `value` slots already in spec).
- Additional figure kinds (funnel, bars, timeline, flow) — renderer-only work
  once the generic step layer exists; add per real day need.
- Learner-visible "my work" file surface + STORAGE copy decision — Step 6, with
  CF Access. Private-bucket mirror keys ship NOW so nothing is lost meanwhile.
- "Apply / Keep mine" conflict UI — only if the learner-wins rule demonstrably
  loses director drafts in practice (transcriptLog keeps them regardless).
- Per-segment artifact provenance (`segments`) — no consumer; whole-doc
  replace + directorDraft diff covers the report.

## Build checklist (order I'd implement)

1. F1 fix (client flush-deferral + server settle-merge) — standalone, testable.
2. `_turnCore`: `ARTIFACT_RE` in `parseTurn` (+ unterminated strip),
   `CONTROL_STARTS` entry. Harness cases: block parse, two-blocks cap,
   unterminated, safeEmitLen partial `'[ARTIF'`.
3. `_session.js`: artifact state shape v2, apply-writes step, gate (a)(b)(c) in
   `makeTickGuard` (verifier call + cache), envelope provenance + content
   injection, reasoned rejectedTicks, prompt METHOD rewrite, INTERVIEW-bucket
   mirror keys. `message.js`/`start.js` settle order per §1.3.
4. Driver + `ArtifactCanvas`: `artifact` frame handling, dirty map,
   learner-wins, `artifactPending` shimmer.
5. Figure engine: `FigureCanvas` + two kind renderers, `resolveShowTarget`
   `@step` + `figureState`, validator §2.3, `describeCanvas` case, prompt
   CANVAS line, harness cases (step resolve, unknown-step degrade, same-key
   step-change emits, defaults reject `@`).
6. Then the Day-1 pack rewrite authors against all of it.

— Fable, review #3. The §2 revision is honest ONLY as the (a)+(b)+(c) bundle;
if any layer gets cut in implementation — most temptingly the verifier — the
review-#2 blocking rule stands un-revised and the tick is theater again.
