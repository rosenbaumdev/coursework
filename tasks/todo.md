# Status (rolling)

## Phase T.4g — Auto-advance shown figure's step + unfilled-elements envelope nudge — COMPLETE (2026-07-06)
Two generalized (zero pack-specific) engine fixes from the live pilot: the
owner had to ASK for a computed number (SAM) to land on the canvas, and had
to manually navigate to a figure step that had already silently populated.

- [x] **FIX 1 — auto-advance the shown figure's step.** New
      `autoAdvanceShownFigureStep(pack, session, figValues)` in `_session.js`,
      called in both settle paths (`message.js`, `start.js`'s `settleOpener`)
      right after `applyFigureValues`, before canvas resolution. Scoped
      tightly: only mutates `figureState`/`figureInstances` for whatever's
      ALREADY on screen (matches the exact base/instance key of the value
      write, mirroring `applyFigureValues`' own malformed-instance degrade);
      a value landing on a figure/instance that ISN'T displayed is left
      completely alone (no hijack — Fix 2 + the model's own [SHOW:] cover
      that case). Computes the furthest `spec.steps` index among the newly
      valued elements' own `step` fields and advances (never retreats) if
      it's beyond the current step. Emits via the EXISTING values-hash check
      in `resolveCanvasChange` (unchanged) — this function only sets the step
      that mechanism reads, never fights it, never emits itself.
- [x] **FIX 2 — unfilled-elements envelope nudge.** New
      `unfilledFigureElementIds(kind, spec)` in `_sessionPacks.js` (read-side
      counterpart to `mergeFigureValues`'s write side, one branch per figure
      kind: null/empty `value` for concentric/funnel/bars, zero `items` for
      quadrant, missing `sub` for iconrow). `buildSessionEnvelope` in
      `_session.js` picks ONE candidate figure (focus objective's
      `canvasDefault` first, else whatever's currently displayed) and, if it
      resolves to a figure with unfilled ids, prints one line:
      `FIGURE ELEMENTS UNFILLED on <key>: <ids> — as each is established in
      conversation, put it on the figure with [FIG: <key> :: id=value] in
      that turn.` Zero pack-specific code — works for any kind, any day.
- [x] One system-prompt CANVAS line reinforcing Fix 1's contract: the server
      auto-advances a shown figure to a newly-valued element's step with no
      [SHOW:] needed; the model's job is to emit [FIG:] the moment a
      number/entry is agreed, never wait to be asked.
- [x] `node --check` clean on `_session.js`, `_sessionPacks.js`,
      `[studentSlug]/api/session/{message,start}.js`.
- [x] Harnesses extended (both baselines kept green, then grown):
      `session-pack-test.mjs` 293→**302/302** (pure-function
      `unfilledFigureElementIds` coverage: concentric/quadrant/iconrow appear
      via a real/synthetic spec then disappear once filled via the real
      `mergeFigureValues` path; funnel/bars null-value detection sanity —
      those kinds' validator requires a value at authoring time, so this is
      defensive, not pack-exercised). `session-engine-test.mjs` 118→**137/137**
      (Fix 1: step advances + emits on the shown figure, never retreats on an
      earlier-step value, does NOT touch an off-screen figure or a different
      instance of the same base figure; Fix 2: nudge fires + disappears for
      concentric via the REAL Zachary pack, and for quadrant via a small
      test-local mini-pack fixture — NOT added to `_sessionPacks.js`, since
      real SWOT ships pre-seeded with example items and showcase/registered
      packs were off-limits to touch; system-prompt reinforcement line
      assertion).
- [x] `npm run build` clean (434KB/135KB gzip, +0 deps — no new dependencies).
- [ ] Live smoke — SKIPPED per the owner's guard: Zachary's live day-1
      session (~20 real turns) must not be reset/smoked. Relied on harness +
      build, same posture as T.4d-fix/T.4e/T.4f.
- [x] Updated `tasks/state.md` + this file.

Did NOT touch `lessons/zachary/...` R2 state, `_interview.js`, `_usher.js`,
or `SHOWCASE_DAY` in `_sessionPacks.js`.

## Phase T.5 / T.4d-fix — Runtime [FIG:] value injection + canvas-sync discipline + client animations/swipe + dynamic slate — COMPLETE (2026-07-06)

Owner-reported live bug: chat computed SAM ≈ $37,500 while canvas sat frozen on
a bare TAM ring. Root cause: no mechanism existed for the Director to push a
computed number onto a figure element without a full [SHOW:] step, and no
prompt discipline forcing the canvas to track the conversation. This phase
promoted the reserved v1.1 [FIG:] grammar (fable-collab-figures-review.md §2.4)
forward, added prompt discipline, client-side figure animations/swipe, and a
live-updatable arc slate. A prior agent died mid-work; this pass audited what
it left (`_turnCore.js` fully done; `_session.js`/`_sessionPacks.js` had the
mechanics built but NOT wired into the endpoints, plus one prompt-text
regression) and completed the rest. Full audit + findings in `tasks/state.md`
under "T.4d-fix — figure values + never-orphan + figure UX polish".

### 1. [FIG:] runtime value injection
- [x] `_turnCore.js`: `FIG_RE`, `'[FIG:'` in `CONTROL_STARTS`, quoted-comma-
      tolerant key=value pair parser, `parseTurn` returns `parsed.figValues`,
      stripped from cleanText. (Found already complete from the dead agent.)
- [x] `_sessionPacks.js`: `figureElementIds(kind, spec)`, `mergeFigureValues`
      (ring override, quadrant append, iconrow sub override + add-item),
      `resolveShowTarget` merges `figureValues`/`figureAdditions`. (Found
      already complete.)
- [x] `_session.js`: `newLesson` seeds `figureValues`/`figureAdditions`/
      `figureValuesHash: {}`. `applyFigureValues` validates ids at apply time,
      handles `add=` (max 6 iconrow items). `resolveCanvasChange` extended:
      values-hash change on the CURRENTLY shown figure emits with no [SHOW:].
      (Found already complete — this was the dead agent's actual work.)
- [x] Wired `applyFigureValues` into `message.js` and `start.js`'s
      `settleOpener`, BEFORE canvas resolution in both — **this was the actual
      gap**: the function existed and was unit-tested directly, but nothing
      in the request handlers ever called it, so `[FIG:]` tags were silently
      inert in production.

### 2. Canvas-sync prompt discipline
- [x] `buildSessionSystemPrompt` CANVAS section already taught `[FIG:]` +
      "THE CANVAS MUST TRACK THE CONVERSATION" (found already complete).
      Fixed a regression in the SAME function: the figure-targets line
      appended `; ids: ...` inside the parens the harness's substring check
      depends on, breaking it (64/64 → 63/64) — moved ids to a trailing
      `[ids: ...]` outside the parens. Added a new METHOD line forbidding
      tags-only turns (speak + end on an ask whenever [SHOW:]/[FIG:]/[TICK:]
      fire).
- [x] `buildSessionEnvelope` figure block (steps + current values + mismatch
      nudge) — found already complete.
- [x] Never-orphan guarantee (message.js + start.js): widened the trigger to
      `!cleanText || !looksAnswerable(cleanText)` (was `!looksAnswerable`
      only — a tags-only turn producing literal `''` didn't fire it). New
      `fallbackAsk(pack, session, canvasDirective)` in `_session.js` —
      deterministic, no network call — used whenever `ensureNextAsk` (Haiku)
      also comes back `''`.

### 3. Client animations + swipe
- [x] `FigureCanvas.jsx`: `.value-pop` animation (scale 1.15→1 + brief accent
      glow, ~350ms, reduced-motion respected) via a `ValueGroup` wrapper keyed
      on `${id}:${value}` (remount-to-reanimate — no manual diffing/timers);
      `splitAssumption()` splits a value's embedded parenthetical for smaller/
      muted sub-rendering (concentric ring / funnel band / bars value); local
      learner-navigable step state (prev/next + dots + n/total — nav had
      regressed to dots-only) capped at the server-resolved frontier; swipe
      (48px horizontal-dominant) via `useRef` (a plain object was silently
      dropping swipes across the frequent re-renders a streaming turn causes);
      directional slide (`.step-enter-advance`/`.step-enter-retreat`);
      `touch-action:pan-y`; reports the learner's actual displayed step via a
      new `onLiveState` prop.
- [x] `DeckCanvas.jsx`: fixed the same plain-object swipe-state bug; added
      `touch-action:pan-y`; added directional slide-in per page change.
- [x] `describeCanvas.js`: figure case now reads the learner's actual
      displayed step from `liveState` (an object for this canvas type) instead
      of always trusting the server frontier.
- [x] `index.css`: `.step-enter-advance`/`.step-enter-retreat`/`.value-pop`
      keyframes, reduced-motion guarded.
- [x] `useSessionDriver.js` / `ContentCanvas.jsx`: verified (not touched) —
      figure directives already re-render in place via `key={directive.id}`
      (base key, unaffected by step/value changes).

### 4. Dynamic slate
- [x] `figure.slate` (iconrow, his 3 arcs) + `[FIG: figure.slate :: add=...]` +
      `canvasDefaults['explore.lock']` + masterPrompt note — found already
      fully authored/wired by the dead agent. No gap.

### Verify
- [x] `node --check` on every touched functions file
- [x] session-pack-test.mjs 257→**267/267**, session-engine-test.mjs 64→**82/82**
      (extended: mergeFigureValues per-kind + parenthetical + cap-at-6,
      applyFigureValues incl. unknown-id/unknown-key drop, values-hash
      emit-then-settle, dynamic-slate add= end-to-end, fallbackAsk both
      branches, tags-only-turn→empty-cleanText trigger proof)
- [x] `npm run build` clean (430KB/134KB gzip, +0 deps)
- [ ] Live smoke — SKIPPED per the owner's explicit guard: Zachary's day-1
      session has ~20 real turns and must not be reset/smoked; `jordan` has
      no pack (404, can't render a figure). Relied on harness + build only —
      screenshots of the new nav/swipe/pop-animation are NOT captured.
- [x] Updated tasks/state.md + todo.md

Do NOT touch interview/_usher/showcase. No new deps (kept).

## Phase T.4e — Canvas pending-swap + history (client driver/SessionView) — COMPLETE (2026-07-06)
Owner-scoped design brief (delivered inline, not previously written here — this
section documents it retroactively): mid-conversation canvas swaps were
yanking the visible pane on wide viewports the instant a new [SHOW:] frame
landed. Fixed by queuing a "different material" frame instead of applying it
immediately, surfaced as an explicit tap-to-continue affordance, plus a small
history of recently-displayed material to revisit.
- [x] `useSSESessionDriver` (`src/session/useSessionDriver.js`): new `pendingCanvas`
      state — an incoming canvas frame whose `id` differs from the currently
      DISPLAYED `canvas`'s id queues into `pendingCanvas` instead of replacing
      `canvas`; a frame with the SAME id (a figure step/value update, or the
      very first frame of the session) applies immediately in place via a new
      `applyCanvasFrame()` helper (used by bootstrap's resume/fresh-stream path
      and by `send()`'s canvas frames alike). `acceptPendingCanvas()` swaps the
      queued frame into `canvas` (the tap handler). `artifactPending`/`artifact`
      frames patch BOTH `canvas` and `pendingCanvas` (a drafting artifact might
      be the queued pane, not the displayed one).
- [x] History: driver keeps `history` — last 20 DISTINCT displayed directives
      (deduped by id, oldest→newest), pushed by `applyCanvasFrame`/
      `acceptPendingCanvas`. `restart()` resets `pendingCanvas`/`history` too.
- [x] `SessionView.jsx`: wide VP — a "Continue to `<title>` →" pill overlaid on
      the canvas pane (bottom-center) when `pendingCanvas` is set; tap calls
      `acceptPendingCanvas()` (marks seen via the existing canvasId-driven
      `markSeen` effect — no separate call needed). Narrow VP — the existing
      inline chat "Continue to X" button now sources its title from
      `pendingCanvas ?? shownDirective` and its handler (`continueToCanvas`)
      accepts the pending frame (if any) before switching to the canvas tab —
      same `showContinue` gate, extended to also fire on a queued pending frame
      (not just an already-displayed-but-unseen one).
- [x] History UI: a "‹ History" chip (narrow header + wide header, shown only
      when 2+ distinct directives exist) opens a small popover list (title +
      type per row, current entry highlighted); clicking an entry sets local
      `historyViewId` and renders that directive instead of the live one — a
      "← Return to current →" pill (canvas-pane overlay, both viewports)
      clears it. `historyViewId`/`historyOpen` are SessionView-local UI state,
      not driver state (browsing history never touches the server-authoritative
      session).
- [x] `canvasRef.current` (what `buildContext`/`describeCanvas` see) is derived
      from `shownDirective = historyEntry || (canvas || lastDirectiveRef.current)`
      — always the ACTUALLY-displayed directive, live or browsed, never the
      queued pending one. The `canvasId`-keyed effects (live-state reset,
      seen-marking) were re-pointed at `shownDirective?.id` for the same reason.
- [x] `node --check` N/A (client-only); `npm run build` clean — confirms the new
      `CompareCanvas.jsx` (T.4f) and all SessionView/driver edits compile.
- [ ] Live/screenshot verification — SKIPPED, no student pack available to
      exercise without touching Zachary's live session (forbidden) or `jordan`
      (404, no pack). Same guard T.4d-fix hit; relied on build + code review.

Do NOT touch interview/_usher/showcase.

## Phase T.4f — Runtime canvas generation, Tiers 2+3 (LOCKED by Jonathan: build both, no Fable pass) — COMPLETE (2026-07-06)
Theater trio: Director decides, STAGEHAND builds, Usher lands the turn.
- [x] Tier 2 — instantiation: authored figures usable as TEMPLATES. Grammar
      `[SHOW: <figureKey>#<instanceId>]` (+ optional @step); instances live in
      `session.figureInstances[key#id] = {step, values}`; `[FIG: key#id :: ...]`
      targets an instance (`applyFigureValues` splits on `#`, malformed id
      degrades to the base figure — never throws, never blanks); validator:
      `#` reserved in authored `canvasProgram` keys / `canvasDefaults` /
      `entry.canvas` (alongside the existing `@` rule); instance ids
      `/^[a-z0-9-]{1,24}$/` (`INSTANCE_ID_RE`, exported). Step/hash bookkeeping
      generalized: `getFigureStep`/`setFigureStep` route a directive id with
      `#` to `figureInstances[id].step`, else the existing `figureState[id]` —
      `resolveCanvasChange`/`currentCanvasDirective` needed NO other changes
      (they already operate generically on "whatever `dir.id` is"). Covers
      per-arc TAM/SAM/SOM (translator/gym/community) reused as one template.
- [x] Tier 2 — compare view: new canvas/directive type `compare`, payload
      `{ a, b }` (each a fully-resolved CanvasDirective). Grammar
      `[SHOW: compare(targetA, targetB)]` — `resolveShowTarget` matches
      `compare(...)` FIRST and resolves both sides recursively through itself
      (any target form: key, `key#instance`, `key@step`, or both); either side
      unresolvable → the whole compare fails (tier-3 keeps current, never a
      half-broken split). `describeCanvas.js` summarizes both sides. Client:
      new `CompareCanvas.jsx` renders two mini-panes (stacks on narrow) reusing
      the SAME per-type renderer map ContentCanvas uses; registered in
      `ContentCanvas.jsx`'s `RENDERERS`. Engine freshness: `compareStateKey`
      (step+values-hash per figure side) reuses the `figureValuesHash` map
      keyed by the compare's own id, so a value/step change on EITHER side
      re-emits on the next `[SHOW: compare(...)]` (a bare `[FIG:]` alone, with
      no fresh `[SHOW:]` that turn, does NOT auto-refresh a live compare —
      documented v1 scope limit, mirrors the single-figure mechanism but not
      extended to compare's no-`[SHOW:]` branch).
- [x] Tier 3 — STAGEHAND (`runStagehand` in `_session.js`): `[STAGE: <request>]`
      parsed in `_turnCore.js` (`STAGE_RE`, single-line capture, `'[STAGE:'` in
      `CONTROL_STARTS`, last-wins like `[SHOW:]`, stripped from cleanText).
      Wired into BOTH settle paths (`message.js` + `start.js`'s `settleOpener`)
      right after `applyFigureValues`, before canvas resolution — success
      force-shows the new key that turn (overrides the model's own `[SHOW:]`,
      since the build IS the response); failure leaves the canvas alone and
      sets `session.lastStageNote` (one-shot, surfaced in the NEXT envelope,
      cleared right after). Haiku (`claude-haiku-4-5`) first, ONE Sonnet-5 retry
      (fed the validation errors, adaptive thinking) on failure; strict JSON
      `{kind, title, spec}` (`kind` = a figure kind or `"deck"`), validated via
      the SAME `validateFigureSpec`/`validateDeckEntry` authored packs use (now
      exported from `_sessionPacks.js`, zero separate validation surface).
      Success → `session.dynamicProgram["stage.N"]`, merged into
      `pack.canvasProgram` at resolve time (`resolveFigureDir` in `_session.js`)
      so a dynamic target is addressable exactly like an authored one — no
      changes needed to `resolveShowTarget` itself. Hard cap
      `STAGE_MAX_BUILDS = 6`/session (checked BEFORE any model call — a capped
      request costs nothing). `transcriptLog` records `{request, ok, key,
      reason, spec}` on every attempt.
- [x] Prompt: `buildSessionSystemPrompt`'s CANVAS section teaches `#instances`,
      `compare(a, b)`, and `[STAGE:]` (framed as last-resort — prefer an
      authored target/instance/compare first; costs a real call; capped;
      failure keeps the canvas + gets a note). Envelope
      (`buildSessionEnvelope`) lists `STAGE-BUILT TARGETS` (session-scoped,
      with a `N/STAGE_MAX_BUILDS used` counter) and any pending
      `STAGE BUILD NOTE`.
- [x] Harness coverage: `session-pack-test.mjs` 267→**293/293** (instance
      resolve/resume/step-override/value-merge/malformed-id-degrade, compare
      resolve incl. unresolvable-side failure + per-side `@step` + non-figure
      sides, validator `#`-forbidden in canvasProgram/canvasDefaults/
      entry.canvas, exported `FIGURE_KINDS`/`ICON_GLYPHS`/`validateFigureSpec`/
      `validateDeckEntry`/`INSTANCE_ID_RE` sanity); `session-engine-test.mjs`
      82→**118/118** ([STAGE:] parse incl. last-wins + stream guard,
      `applyFigureValues` instance write + malformed-id degrade, engine-level
      `resolveCanvasChange`/`currentCanvasDirective` for instances + compare
      incl. the value-change-on-showing-instance-emits case and the
      value-change-on-one-compared-side-re-emits case, `runStagehand`'s hard
      cap refusing before any network call, dynamicProgram end-to-end resolve
      through the normal `[SHOW:]` path, envelope dynamic-targets listing +
      stage-note surfacing, system-prompt teaching-copy assertions).
      Screenshots NOT captured (see T.4e note above — same no-live-session
      guard applies; STAGEHAND additionally needs a real Anthropic call this
      environment didn't exercise live).
- [x] `node --check` clean on every touched `functions/**/*.js`; `npm run build`
      clean (434KB/135KB gzip, +0 deps).

Do NOT touch interview/_usher/showcase. No new deps (kept).
