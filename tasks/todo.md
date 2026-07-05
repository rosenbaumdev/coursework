# Status (rolling)

## Phase T.4 — Day-1 dry-run feedback (14 items) (2026-07-05)
Jonathan's walk-through feedback. Decisions locked: Day1 = Explore→Size→Decide;
artifacts = collaborative + saved to user files (revises Fable §2); visual engine
= declarative figure spec. Restart fresh after changes (old session incompatible;
artifacts are throwaway test data). Engine names: **Director** (primary) + **Usher**
(secondary/reformer).

Fable-independent (build now):
- [ ] Usher for the session: port `resolveChips` (model tag → Haiku → deterministic)
      + `ensureQuestion`/`looksAnswerable` so EVERY turn ends with a clear ask
      (#6, #11). Wire into start.js + message.js.
- [ ] Stream the opener (start.js → SSE like message.js) so it doesn't appear
      all at once (#3). Top-anchor scroll already gives expand-to-bottom-then-overflow.
- [ ] Lock app to window on desktop: `100dvh`, no page scroll; inner containers
      scroll only (chat, terminal-in-frame, portrait docs/browser); canvas fits
      pane (#9).
- [ ] Pulse/attention cue on multi-page deck [Next] (#5).
- [ ] Copy button on chat bubbles + code blocks (#13).
- [x] Acronym/framework intros: spell out on first use + teach before the figure
      (TAM/SAM/SOM, SWOT, GTM) — masterPrompt method rule + pack text (#2, #10).
      (Landed in the Day-1 rewrite: Teaching rules block + spelled-out pack text.)

Fable consult first (then build):
- [x] Collaborative artifacts (#12, #14): Director drafts memo FROM chat work,
      prepopulates templates for arcs 2/3, learner edits/owns; gate → reviewed+
      edited (provenance logged); persist to private-bucket mirrors (learner
      surface at Step 6 per Fable §1.6). Revises grammar contract §2.
      → `tasks/fable-collab-figures-review.md`. Engine landed earlier in T.4;
      pack side (sizing `need` lines encode the workflow) landed in the rewrite.
- [x] Declarative figure engine (#4, #7): data-driven figures (concentric/quadrant
      v1 + callouts + generic step reveal), progressive build-up via
      [SHOW: key@step] + persisted figureState, validated targets, SVG render
      (FigureCanvas). funnel/bars = later kinds, renderer-only once needed.

After Fable — the big content authoring:
- [x] Day-1 pack rewrite: Explore (interest areas + earning vectors: app, influencer
      faced/faceless, affiliate/social, digital goods, services) → Size → Decide
      (#1); real visual figures replacing text decks (#4); collaborative prepop
      memos (#12,#14). 18 objectives / 16 R; harnesses 137+64; live smoke clean.
- [ ] Navigable browser examples + ever-present [Return] (#8). DEFERRED: true
      multi-page nav + [Return] is client BrowserCanvas work; interim shipped in
      the Day-1 rewrite — richer curated competitor mock with internal anchor nav.

Then: restart clean → re-walk.

---

## Phase T.3 — Session engine + Day-1 runnable as Jonathan's test walk (2026-07-04)
Decision (Jonathan): make Day 1 walkable by HIM as the test — it's a bottle
episode (self-contained decision day) that exercises graphs, video, decks,
browser, readings, and gated artifacts. Scope = Steps 3+4 of the build order,
LOCAL ONLY (no deploy until Step 6 security gate).

Content (bottle-episode completeness):
- [ ] Generate `public/session-assets/tam-som-circles.svg` (nested-circles graph)
      + add `image.tam-circles` and `video.sizing` (placeholder assets) targets
      to ZACHARY_DAY_1 canvasProgram.

Engine (`functions/_session.js` — instruction-register prompt layer over _turnCore):
- [ ] System prompt: engine-universal METHOD scaffolding (tick discipline incl.
      bare-check-tick-rejected rule, artifact = learner-authored + gate, [SHOW:]
      menu, [TABLE: tangent], [SUGGESTED_REPLIES], pacing from pack.budget,
      pronouns) + pack.masterPrompt. Distinct from interview register.
- [ ] Envelope per turn: objective board (evidence shown) + FOCUS + CANVAS NOW +
      learner live state + artifact gate status + parked notes + rejected-tick
      feedback + session summary (window memory).
- [ ] Window memory v1: keep last 16 turns verbatim; when history > 24, fold
      oldest into running `sessionSummary` via one Haiku call (inline).
- [ ] tickGuard: check-type needs evidence; artifact-type needs
      isArtifactSatisfied. extraTableIds=[tangent]. maxNewTicks=3.
- [ ] [SHOW:] 3-tier: model target (validated) → canvasDefaults[new focus] on
      focus advance → keep current. Emitted as SSE `canvas` frame.
- [ ] State: R2 private bucket `lessons/<student>/<course>/day-<id>.json`;
      turn seq guard (client echoes seq; stale → 409); completion = all R ticked
      (low floor) OR budget.maxTurns ceiling.

Endpoints (`functions/[studentSlug]/api/session/`):
- [ ] `start.js` — create/resume (+ `reset:true` for test restarts); returns
      messages, suggestions, canvas, artifacts, progress, seq.
- [ ] `message.js` — REPLACE the open demo chat with the engine (also closes the
      open-LLM-proxy finding at the code level; CF Access still pre-deploy).
      SSE: delta / canvas / done frames.
- [ ] `artifact.js` — learner-authored artifact content sync (id + content);
      server stores; returns gate satisfied state.

Client (Step 4, behind the DriverState seam):
- [ ] `useSSESessionDriver(studentSlug, day)` in `src/session/useSessionDriver.js`
      — mirrors InterviewView SSE loop; canvas frames drive ContentCanvas;
      artifact edits debounce-POST to artifact endpoint; seq tracked.
- [ ] `SessionView.jsx`: real driver when studentSlug has a session pack, scripted
      showcase otherwise (bare `/session` demo keeps working); Restart = start
      with reset:true. Progress header shows ticked/totalRequired + focus.

Verify:
- [ ] Engine unit tests in scratchpad harness (envelope render, fold trigger,
      tickGuard paths, 3-tier canvas resolution, seq guard).
- [ ] Build + headless render of /zachary/session.
- [ ] Live local walk: start → real Sonnet turn → [SHOW:] canvas change → write
      artifact → gate opens → tick honored w/ evidence → progress advances.
- [ ] Interview regression untouched (same shared core).
- [ ] Update state.md. NOT in scope: deploy, CF Access, learner-record write
      (Step 5), syllabus doc, days 2+.

---

## Phase T.2 — Fable grammar-review fixes (pre-Day-1 authoring) (2026-07-04)
Source: `tasks/fable-grammar-review.md` (review #2). Goal: clear the 4 blocking
items + accepted question-verdicts + the Step-3 trap, extend the harness,
regression-check the interview, then author Zachary's Day 1 (Step 2b).

Blocking (A–D):
- [x] A. `validateSessionPack`: flag any `- [`-prefixed line that does NOT match
      `LINE_RE` (silent line-drop today; em-dash/type typos vanish undetected).
- [x] B. Strip SHOWCASE_DAY `masterPrompt` to genuinely day-specific persona;
      engine-universal method text (parking, tick discipline, canvas-driving)
      belongs in `_session.js` (Step 3), not the authoring template.
- [x] C. Declare the artifact-provenance contract in `_sessionPacks.js` docs:
      v1 artifact content is LEARNER-AUTHORED ONLY; model scaffolds via
      canvasProgram (template as a reading target), never writes into
      `session.artifacts`. Otherwise minChars is theater.
- [x] D. Optional per-day `budget: { maxTurns, targetMinutes }` field +
      validator coverage. SHOWCASE_DAY carries one as the template example.

Accepted question-verdicts:
- [x] Q8: `exit.reportSchema` optional; export `DEFAULT_REPORT_SCHEMA`
      (engine default, per-day override only when needed).
- [x] Q10: reserve `tangent` as a TABLE target (export `TANGENT_TABLE_ID`);
      `applyTurnEffects` accepts it via opts so lesson tangents aren't
      silently dropped when not tied to a known objective id.

Step-3 trap (fix now in `_turnCore.js` while fresh):
- [x] `parseTurn`: support `[TICK: id :: evidence]` — a `::` payload is ONE
      id + evidence (no comma-split); returns `ticks` (ids, shape unchanged
      for interview consumers) + new `evidence` map `{id: string}`.
- [x] `applyTurnEffects`: persist evidence into state; accept
      `opts.tickGuard(id, evidence) → bool` (session engine rejects
      evidence-less `check` ticks + unsatisfied artifact ticks; interview
      passes no guard → unchanged). Accept `opts.extraTableIds` for tangent.

Verify:
- [x] Extend `session-pack-test.mjs` (malformed-line, budget, evidence parse
      incl. mixed forms, evidence persisted, tickGuard rejection, tangent,
      comma-ids still work); `node --check`; `npm run build`.
- [x] Interview regression: one live turn on :8788; wipe test session.
- [x] Update `tasks/state.md`; then → author Zachary Day-1 pack (Step 2b).

---

## Phase S.2 — Interview instrument redesign: objective inventory (2026-07-01)
Root-cause fix for the drift (model froze in Section 1, mined out of order, never advanced). Replace the 7-section + `[SECTION_COMPLETE]` machine with a **granular objective inventory**.

Design (Jonathan's spec):
- **Inventory md** = a program of checkable objectives (ids like `care.energy`), authored as markdown, course-scoped. Source of truth for the interview program.
- **Rendered into every envelope** with live tick-state ([x]/[ ]) so the model always sees what's captured vs open, and can't lose the plan.
- **Advancement = ticking boxes.** Model emits `[TICK: id]` when an objective is genuinely covered; server validates the id + records it (authoritative). Interview completes when all *required* boxes are ticked (or MAX_TURNS).
- **Drift gate (the two questions, injected into the envelope):** before pursuing any tangent the model must ask — (1) does this genuinely advance an *unticked* objective, meaningfully better than what's already captured? (2) is now the right time, or does it belong under a later objective → `[TABLE: id :: note]` to park it and steer back.
- **Parking lot** in session state: tabled threads keyed to the objective they resurface under; the envelope surfaces a due note when its objective becomes the focus.
- Keep `[SUGGESTED_REPLIES]`. Drop `[SECTION_COMPLETE]`.
- **Pacing safety net (server):** cap new ticks/turn (rushing = ticking many at once) + floor on total turns before "complete".

Session schema delta (no live user data yet — only local test sessions): add `inventory` (tick state by id) + `parkingLot[]`. Remove `currentSection`/`sectionTurnCounts` reliance; keep transcript/history.

Decisions (locked): soft spine + opportunistic ticks + tabling; required boxes block completion, bonus don't. Model: interviewer → `claude-sonnet-5` + `thinking:{adaptive}` effort medium (Haiku emitted 0 ticks/13 turns — see lessons.md).

Tasks:
- [x] `functions/_inventory.js` — inventory authored as md checklist, parsed to structured objectives (15 total, 11 required). `getInventory`/`focus`/`render`/`progress` helpers.
- [x] `_interview.js`: inventory envelope (live tick-state + focus + due parked notes + two-question drift gate); `parseTurn` for `[TICK]`/`[TABLE]`/`[SUGGESTED_REPLIES]`; `applyTurnEffects` (server-authoritative, cap=3, dedupe); new session shape (`inventoryState`+`parkingLot`); Sonnet 5 + adaptive thinking; pacing = turn-floor 10.
- [x] `start.js` + `message.js`: new engine; streaming guard learns `[TICK:`/`[TABLE:`; completion = all required ticked past floor.
- [x] `InterviewView.jsx`: progress bar = ticked/totalRequired + focus label.
- [x] Verify: unit tests pass; live walk on Sonnet 5 ticked all 11 required, **tabled** a sports-betting thread and resurfaced it, completed at turn 12, profile synth wrote a grounded 12KB profile to R2. Haiku walk (0 ticks) documented the model dependency.

**Next:** commit Phase S.1 + S.2 (still nothing committed); Jonathan browser-walks `jserver:8788/zachary/interview`; then deploy + rotate API key.

---

## Phase S.1 — Interview UX polish (2026-07-01)
Jonathan's first-run feedback on `/zachary/interview`. Four asks:
- [x] **Markdown rendering** — assistant bubbles render `#`/`**`/lists via react-markdown (chat-tuned `CHAT_MD` map). User bubbles stay plain.
- [x] **Mobile full-screen** — `100dvh`, `px-4 sm:px-6`, wider bubbles (`max-w-[90%] sm:max-w-[82%]`), safe-area padding on composer.
- [x] **Streaming text** — `message` now returns SSE (`callAnthropicStream` + `consumeAnthropicSSE`). Server owns the gate: `safeEmitLen` withholds trailing control-tag region so tags never flash, on stream-end `parseAssistantOutput` strips tags, minTurns gate runs, `saveSession`, `waitUntil` synth, final `done` frame. `start` stays JSON. Verified: 6 deltas + 1 done, 0 leaks; char-by-char guard unit test passes (no leak in any case).
- [x] **Multichoice chips** — model emits `[SUGGESTED_REPLIES: a | b | c]`; parsed+stripped server-side; returned via start JSON + message `done` frame; rendered as tappable chips (send-on-tap), free-typing always available. Verified: opening offered 3 chips, open-ended turn offered none.

Verified on preview (jserver:8788). Not yet: real browser walk (Jonathan), prod deploy, key rotation. Nothing committed.
Known cosmetic: streamed bubble keeps a trailing `\n` until the `done` frame overwrites it with authoritative cleanText — invisible (markdown collapses it).

Design calls (proceeding without blocking): stream message-turns only (opening/resume stay non-streamed); multichoice is model-driven + optional, never a cage.

---

Active phase: **Phase S — Ingestion interview app (Zachary).** Port the claude.ai prototype (`coursework-app.zip`, design captured in this session) onto the serverless CF Pages + Functions stack. Goal: live, server-controlled onboarding interview at `/<studentSlug>/interview` that writes a Sonnet-synthesized profile to a *private* store. Proctor + Jonathan's feedback dashboard = deliberate later phase.

## Phase S plan (2026-06-30)

**What ports verbatim from the prototype** (logic is good): the 7-section instrument + per-turn envelope/state-machine (`interview-spec.js`), the "make him feel heard" base prompt (`base-system-prompt.js`), Haiku for chat turns + Sonnet for profile synthesis, the `[SECTION_COMPLETE]` + `minTurns` advancement gate, the schema'd profile output.

**What changes for serverless:**
- Express routes → Pages Functions `functions/[studentSlug]/api/interview/start.js` + `message.js` (mirrors existing `api/assets` routing).
- In-memory `sessions{}` → session JSON persisted to a **dedicated private R2 bucket `coursework-interview`** (binding `INTERVIEW`). R2 = strong read-after-write (safe for turn-by-turn state). Separate bucket = unreachable by the public file proxy (the real reason: Jordan's empty-prefix proxy can read all of `coursework-assets`).
- `fs.writeFileSync(profile)` → `INTERVIEW.put('profiles/<slug>-profile.md', ...)` + transcript JSON. Profile generated via `context.waitUntil()` so the final turn's HTTP response isn't blocked on the ~4k-token Sonnet call.
- Anthropic via plain `fetch` to `api.anthropic.com` (no SDK in edge runtime). Key = CF Pages secret `ANTHROPIC_API_KEY` (+ local `.dev.vars`, gitignored).
- Dark prototype UI → **light-mode** React route `/<studentSlug>/interview` matching the coursework design system. Student name pulled from registry (no name-entry screen).

**Cost/abuse guard (route is public until Phase Q CF Access):** refuse `start` if a completed profile already exists for the student (one-and-done); hard cap turns/session (~60) to bound runaway API cost. Flag CF Access on `/interview` as the real fix.

### Tasks
- [x] `wrangler r2 bucket create coursework-interview`; add `[[r2_buckets]] binding=INTERVIEW` to `wrangler.toml`
- [x] Set CF Pages secret `ANTHROPIC_API_KEY` for project `coursework` (prod) — `.dev.vars` set (local)
- [x] Add `zachary` to `src/students.js` + `functions/_students.js` (lockstep) with a `noob-to-ai-entrepreneur` course
- [x] `functions/_interview.js` — ported `SECTIONS`, `buildEnvelope`, `buildBaseSystemPrompt`, profile schema, session/profile R2 helpers (ES modules)
- [x] `functions/[studentSlug]/api/interview/start.js` (POST) — create/resume session in INTERVIEW bucket, first Haiku turn
- [x] `functions/[studentSlug]/api/interview/message.js` (POST) — read session, Haiku turn, gate/advance, `waitUntil` profile synth on done
- [x] `src/components/InterviewView.jsx` — light-mode chat UI + progress bar; route `/<studentSlug>/interview` in `App.jsx`
- [x] Local test: build clean; live Haiku turns; session persist + resume round-trip proven
- [x] Deploy; prod smoke `/zachary/interview` (route 200 + real start turn); test session deleted → clean for Zachary
- [x] Update `state.md`
- [ ] Walk a FULL interview (all 7 sections → profile synth + R2 write) — first real run is Zachary's
- [ ] Retrieve Zachary's profile from R2 for Jonathan (on request, after he runs it)
- [ ] **Jonathan: rotate the pasted API key**; then re-set prod secret + `.dev.vars`
- [ ] NEXT PHASE: proctor system prompt + Jonathan's structured-feedback dashboard

---

Active phase (prior): **Multi-tenant path-per-student on coursework.kitbord.com.** Replaces the prior subdomain-per-course design. Jordan moves from `jordan-sports-betting.kitbord.com` to `coursework.kitbord.com/jordan`; new student `contentcreator` lives at `coursework.kitbord.com/contentcreator`. Single Pages project, single R2 bucket, single mirror repo with per-course storage prefixes.

## Decision inputs (locked 2026-06-03)
- URL model: **path-per-student** under one domain `coursework.kitbord.com`
- Root `/` = private splash ("ask your coursemaster for a URL")
- Per-student URL: `/<studentSlug>` (auto-renders the student's single course; future picker when >1 courses)
- Dad's view: `/<studentSlug>/dad` and `/<studentSlug>/dad/files`
- Jordan keeps **flat R2 keys** (`day-N/<cat>/<file>`) — no migration; his course `r2Prefix` is empty string
- Content-creator gets `r2Prefix = "content-creator/"`
- GitHub mirror prefixes per course: Jordan `jordan-sports-betting/`, content-creator `content-creator/`
- Old subdomain `jordan-sports-betting.kitbord.com` → 301-redirect to `coursework.kitbord.com/jordan/:splat` via `_redirects`
- Single Pages project named `coursework`; single R2 bucket `coursework-assets`. No second project, no second bucket.

## Architecture target

### URL routes
| URL | What |
|---|---|
| `/` | private splash |
| `/<studentSlug>` | student's course view (auto-resolves to single course) |
| `/<studentSlug>/dad` | dad's view of that course |
| `/<studentSlug>/dad/files` | files CMS |
| `/<studentSlug>/api/assets` | manifest |
| `/<studentSlug>/api/assets/<dayId>` | POST upload |
| `/<studentSlug>/api/assets/<dayId>/<cat>/<file>` | DELETE |
| `/<studentSlug>/files/*` | R2 proxy |
| `/<studentSlug>/<mdFile>` | static MD source for the course |

### Students config (`src/students.js` + parallel `functions/_students.js`)
```js
export const STUDENTS = {
  jordan: {
    name: 'Jordan',
    courses: [
      {
        slug: 'sports-betting-ai',
        title: 'Sports Betting AI',
        mdFile: 'jordan-sports-betting.md',
        r2Prefix: '',             // flat — no migration
        mirrorPrefix: 'jordan-sports-betting/',
      },
    ],
  },
  contentcreator: {
    name: 'Content Creator',      // placeholder; real name later
    courses: [
      {
        slug: 'main',
        title: 'Content Creator',
        mdFile: 'content-creator.md',
        r2Prefix: 'content-creator/',
        mirrorPrefix: 'content-creator/',
      },
    ],
  },
}
```

### localStorage namespacing
Keys become `<studentSlug>.arc` and `<studentSlug>.days`. Existing keys on coursework.rosenbaum.us are already stranded; on kitbord.com everyone starts fresh.

## Migration steps

### Phase N — multi-tenant refactor (code)
- [ ] `src/students.js` (new) — students + courses config
- [ ] `src/App.jsx` — routing: `/:studentSlug`, `/:studentSlug/dad`, `/:studentSlug/dad/files`, root splash
- [ ] `src/courseConfig.js` — delete
- [ ] `src/components/Header.jsx` — read student/course from props/context (not env)
- [ ] `src/components/ClaudeLauncher.jsx` — same
- [ ] `src/components/NotesThread.jsx` — same
- [ ] `src/hooks/useTrackerData.js` — namespace localStorage by `<studentSlug>` prefix
- [ ] `src/hooks/useAssets.js` — fetch from `/<studentSlug>/api/assets`, etc.
- [ ] `src/components/Splash.jsx` (new) — minimal "ask your coursemaster" page
- [ ] `functions/[studentSlug]/api/assets/index.js` — move from `functions/api/...`
- [ ] `functions/[studentSlug]/api/assets/[dayId].js` — same
- [ ] `functions/[studentSlug]/api/assets/[dayId]/[category]/[filename].js` — same
- [ ] `functions/[studentSlug]/files/[[path]].js` — same
- [ ] `functions/_students.js` (new) — parallel students config for Functions runtime
- [ ] `functions/_shared.js` — `r2Key`/`rawUrl` take a course object, not env
- [ ] `functions/_github.js` — `syncToGitHub`/`removeFromGitHub` take course + pat (not env)
- [ ] `wrangler.toml` — drop `[vars]` GITHUB_PATH_PREFIX (no longer needed)
- [ ] `package.json` — collapse `deploy:jordan`/`deploy:cc` → single `deploy`
- [ ] `public/_redirects` — add 301 for old subdomain → `/jordan/:splat`
- [ ] Delete `scripts/set-pages-env.mjs` (one-off, no longer needed)

### Phase O — domain swap (jordan-sports-betting → coursework)
- [ ] Attach `coursework.kitbord.com` to existing Pages project (API)
- [ ] Create CNAME `coursework.kitbord.com` → `coursework-5lg.pages.dev` (API)
- [ ] Verify cert provisions + serves
- [ ] Keep `jordan-sports-betting.kitbord.com` attached (for redirect via `_redirects`)
- [ ] Deploy
- [ ] Verify `/jordan`, `/jordan/dad`, `/jordan/dad/files`, and old subdomain redirects

### Phase P — content-creator content
- [ ] Author `public/content-creator.md` from the 15 briefs already in `assets/Daily Instructor Briefs - content-course/`
- [ ] Upload each brief as `claude-prompt` via `/contentcreator/api/assets/<dayId>` → R2 + GH mirror
- [ ] Verify `/contentcreator` renders

### Phase Q — Cloudflare Access
- [ ] Add Access app: `coursework.kitbord.com/*/dad*` → email `joalro@yahoo.com` (covers both students' dad views)
- [ ] Add Access app: `coursework.kitbord.com/*/api/assets/*` → same allowlist (covers POST/DELETE; bare `/*/api/assets` stays public for manifest GET)

### Phase R — cleanup + docs
- [ ] Delete `server/` directory
- [ ] Delete `~/.coursework-mirror-clone/` + `~/.coursework-mirror-state.json`
- [ ] Update CLAUDE.md: multi-tenant architecture, route + storage shape, students config
- [ ] Update `tasks/decisions.md`: supersede subdomain-per-course decision with path-per-student
- [ ] Update `tasks/state.md`
- [ ] Update auto-memory: project_active_processes, project_arch_gotchas, reference_infra

## Risks + open questions
- **localStorage stranded on rosenbaum.us AND jordan-sports-betting.kitbord.com**: per-domain isolation. Notes Jordan added during the brief jordan-sports-betting.kitbord.com era won't carry to coursework.kitbord.com/jordan. Negligible content.
- **R2 listing collision**: Jordan's flat keys (`day-*`) and content-creator's prefixed keys (`content-creator/day-*`) don't overlap because the prefix in `list()` is computed per course (`{r2Prefix}day-`). Verified by design.
- **Brief file paths in mirror repo**: Jordan stays at `jordan-sports-betting/day-N/`. Content-creator at `content-creator/day-N/`. Both already in place from earlier work.

## Superseded (kept for memory)
- ~~Subdomain-per-course (Phase G-K original)~~ — replaced by path-per-student.
- ~~Per-course Pages project + R2 bucket~~ — single project + bucket now.
- ~~VITE_COURSE_SLUG / VITE_STUDENT_NAME / VITE_COURSE_TITLE env vars~~ — config moves into `src/students.js`.
- ~~GITHUB_PATH_PREFIX env var~~ — comes from per-course `mirrorPrefix` field at runtime.
- ~~`deploy:jordan` / `deploy:cc` scripts~~ — collapse to `deploy`.
