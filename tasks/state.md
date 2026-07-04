# Coursework Tracker — Session State
Last updated: 2026-07-04

## Phase T — Coached-session two-pane platform (NEW UI/UX) — BUILT + VALIDATED, UNCOMMITTED (2026-07-04)
New product direction: **coursework-as-platform** — daily sessions run *inside* the app (own the loop, observe every turn, gate on objectives), generalizing the interview engine into the session engine. Full plan: `/Users/jonathanrosenbaum/.claude/plans/misty-mapping-widget.md`. Round-2 task tracker: `tasks/session-ui-tasks.md`.

- **What shipped (v1 UX-first, mocked content + real functional panes + real live chat):** a two-pane `SessionView` at routes `/session` and `/:studentSlug/session`. Chat pane (extracted shared components from InterviewView → `src/components/chat/{Bubble,ProgressHeader,ChatMessages,ChatInput}.jsx` + `chatMarkdown.jsx`; reading markdown → `src/components/markdown/readingMarkdown.jsx`; InterviewView + DayCard refactored to reuse, SSE logic untouched). Adaptive content canvas (`ContentCanvas` + `src/components/session/canvas/*`): reading, deck, video (real `<video>` + generated asset), image (real asset), browser (real iframe nav), terminal (interactive sim shell), artifact (editable + live preview).
- **Layout intelligence:** slide-away when no canvas material (retains last directive, flex-basis→0 fade); auto orientation L/R vs T/B from viewport aspect + content type; manual override persists across sessions, resets on slide-away; hand-rolled draggable divider (pointer events, no dep); narrow(<768px) → Chat/Canvas tabs. State + lifecycle in `SessionView`; `SplitPane` is controlled.
- **Terminal:** `src/session/vsh.js` = seeded virtual FS + real-feeling interpreter (ls/cd/pwd/cat/echo+`>`/`>>`/mkdir/touch/rm -r/mv/head/whoami/date/clear/help, flags, real errors, `edit` editor). Simulated only (no real exec/persistence). Validated via node harness.
- **Context-aware chat + marquee (item 6):** `describeCanvas()` builds a "what's on screen" summary (terminal/browser/artifact report live state via `onLiveState`). "◲ Point" marquee tool → drag rectangle → best-effort text extraction (caretRangeFromPoint) → attaches to composer → sent as context. Hybrid driver (`useScriptedSessionDriver` in `src/session/useSessionDriver.js`): **chips advance the scripted tour; free-typed messages → REAL model turn**. Backend `functions/[studentSlug]/api/session/message.js` — stateless SSE, provider-abstracted (**Haiku default**; Ollama via `SESSION_LLM_PROVIDER=ollama`). VALIDATED under `wrangler pages dev` (8788): real Haiku turns answered correctly about terminal contents AND about a marquee'd region.
- **Assets:** `public/session-assets/{sample-image.jpg,sample-video.mp4,sample-video-poster.jpg}` (ffmpeg-generated, self-contained).
- **Runtimes right now:** vite dev on **5173** (scripted demo, HMR, no live chat) and `wrangler pages dev` on **8788** (full build + live chat). Full experience = `http://jserver:8788/session`.
- **NOT done / next:** Jonathan's interactive walk; D7 `[SHOW:]` (model drives canvas); real PTY terminal (SSH-authed, non-persistent); local Ollama wiring; browser proxy for frame-blocked sites. Nothing committed all session.

## Phase S.2 — Interview redesign (objective-inventory + pack architecture) — VERIFIED, UNCOMMITTED
- **Redesign shipped:** the 7-section `[SECTION_COMPLETE]` machine is replaced by an **objective inventory** the LLM ticks. Each turn's envelope carries the live markdown checklist + FOCUS-NOW + due parked notes + a two-question drift gate (is this drift meaningfully better than what's established? is now the time, or table it under a later tick?). Server stays authoritative on ticks; `[TICK:id]` / `[TABLE:id :: note]` / `[SUGGESTED_REPLIES:...]` control tags parsed server-side and guarded out of the stream (`safeEmitLen`).
- **General engine / specific content ("packs"):** `functions/_inventory.js` holds `PACKS[courseSlug] = { inventoryMd, framing{context,reviewer}, profileSchema }` + a checklist parser + inventory helpers. `functions/_interview.js` is the content-agnostic engine (envelope, tick/table state, drift gate, streaming, pacing, persistence, synth) and reads all course specifics from the pack via `getPack(courseSlug, courseTitle)`. **A new course = one pack entry, zero engine changes.**
- **Model:** `claude-sonnet-5` + adaptive thinking + effort:medium for turns (Haiku 4.5 emitted 0 control tags across 13 turns — see lessons). `claude-sonnet-4-6` for profile synth. `MAX_NEW_TICKS_PER_TURN=3`, `MIN_TURNS_BEFORE_COMPLETE=10`, `MAX_TURNS=60`.
- **FRESH UNBOUND TEST PASSED (2026-07-01):** wiped local INTERVIEW bucket, ran a NEW session with a *different* persona (creative/meme-maker, not sports betting). `resumed=False`, ticks advanced 0→11/11, interview completed `done=True`, profile synthesized to R2. Verified: correct persona in profile (memes/YouTube/funny present), **zero cross-persona leakage** (no "sports"/"betting"/"gambling"), full schema populated, and the instrument correctly HELD `work.stuck` when the persona conflated bored-abandonment with stuck-behavior — only ticked it once a real escalation process was described. This is the drift-discipline the redesign was for, working as intended.
- **Files touched (uncommitted):** `functions/_inventory.js` (now PACKS), `functions/_interview.js` (generic engine), `functions/[studentSlug]/api/interview/{start,message}.js` (thread `pack`), `src/components/InterviewView.jsx` (markdown + streaming + mobile 100dvh + multichoice chips + inventory progress header), `package.json` (`preview` binds 0.0.0.0:8788 both buckets), `tasks/lessons.md` (2 lessons).

### Phase S.2b — Multichoice chips (adaptive, 3-tier) — VERIFIED, UNCOMMITTED (2026-07-01)
- Problem chain: (1) chips vanished on reload — `start.js` resume branch hardcoded `suggestions:[]`; fixed by persisting `session.lastSuggestions`. (2) model (Sonnet) emitted the `[SUGGESTED_REPLIES]` tag inconsistently and bundled rating questions; strengthened envelope prompt (chips "expected not rare", rating sweeps ONE item/turn). (3) still missed bare comprehension questions with no inline options.
- Final architecture (`functions/_interview.js`), cheapest-first, in `resolveChips(env,{tagSuggestions,cleanText,studentName})`: (1) model's own tag wins; (2) else **Haiku `claude-haiku-4-5`** pass (`suggestChips`) reads the question, returns 2-4 chips or [] — adaptive, no hardcoded scales, no thinking/effort params; (3) else `deriveChips()` deterministic offline extraction of an inline "X or Y / A,B,or C / yes-no / …,or nah?" disjunction (guards padded mid-sentence "or", open lead-ins, escape-hatch options; 12/12 unit tests in scratchpad/chips.mjs). `parseTurn` is back to tag-only; `resolveChips` called in both `start.js` and `message.js` (awaited after stream, before the `done` frame). UI chip row already existed in `InterviewView.jsx`.
- VERIFIED via live walk: systems-map sweep fully chipped (some tag, some Haiku fallback), Haiku produced contextual chips ["Text game","Graphics game","Pygame","Not sure"] for a game-type question, open-ended turns correctly chip-free.
- Also fixed narrow-VP horizontal scroll in `InterviewView.jsx` (break-words + [overflow-wrap:anywhere] on bubbles, table wrap, overflow-x-hidden root, min-w-0 flex containers).

### Phase S.2c — Interview depth + interests→arc convergence — UNCOMMITTED, AWAITING REAL WALK (2026-07-01)
- Jonathan feedback: real walk took ~10 min, should be 30-45; and the instrument never converged on a central ARC (product/service thesis the coursework personalizes around, like Jordan's "Sports Betting AI"). He wants the arc to emerge from INTERESTS (depth on what he's into), kept adaptive (NOT a hardcoded pack scale).
- Inventory (`_inventory.js`): section 4 now "What He's Actually Into (Interests → Arc)" with new `care.depth` (mine top interest for maker's-angle / audience / problem). Section 7 now "Direction & Reflection" with new `arc.lean` (pitch 2-3 product arcs built from his interests, capture which pulls him → provisional lead + runner-up). Required count 11→13. Profile schema gained a first-class "## Provisional Lead Arc" section.
- Pacing (`_interview.js`): MIN_TURNS_BEFORE_COMPLETE 10→20, MAX_NEW_TICKS_PER_TURN 3→2, MAX_TURNS 60→80. Prompt: rule 4 "don't rush / 30-45 min / 2-4 exchanges"; envelope depth gate rewritten to MOVE BRISKLY through quick boxes (orient/know.map sweep/logistics/work) and SPEND REAL TIME on interests+direction (care.*/world.ai/arc.lean).
- GOTCHA fixed mid-session: first depth-prompt version over-corrected → Sonnet emitted 0 tick tags across 15 turns (great convo, no progress). Rebalanced with explicit "TICK WHEN CAPTURED — un-ticked captured box stalls the interview." Ticks flow again.
- NOT yet verified: real minute-count (scripted walks distort pace — canned answers don't respond to real follow-ups, so baseline looks stuck), and a full completion → profile-with-lead-arc on this new 13-box inventory. Watch: does technical baseline feel brisk or front-loaded in a real walk?

### Phase S.2d — PRODUCTION DEPLOY of the interview — LIVE & VERIFIED (2026-07-02)
- Deployed via `CLOUDFLARE_API_TOKEN=$(cat ~/.coursework-cf-token) npm run deploy`. Live at https://coursework.kitbord.com/zachary/interview. Prod-verified end-to-end: fresh start (0/13), SSE streaming message (delta frames), tick (orient.ready→1/13), chips, resume (200), R2 persistence. Prod secret ANTHROPIC_API_KEY + INTERVIEW binding + coursework-interview bucket all present.
- BUG hit on first prod run: 500 / error 1101. Real cause: an OLD-SCHEMA session (original Phase S 7-section machine, no `inventoryState`) was sitting in prod R2 for zachary; start.js resume branch called progressInfo(pack, existing.inventoryState=undefined) → `state[o.id]` throws "Cannot read properties of undefined (reading 'orient.ready')".
- FIX (kept, permanent robustness): start.js now only honors a loaded session if `inventoryState` is a valid object — else ignores it and starts fresh (overwriting the stale one). message.js returns 409 "out of date — restart" for a session missing inventoryState. Old/pre-redesign sessions can never crash the inventory helpers again.
- BIG LESSON (cost ~an hour): `wrangler r2 object get/put/delete` DEFAULT TO LOCAL `.wrangler` state — my "deletes" of the prod ghost were hitting local, so it looked like a phantom split-store. **Always pass `--remote` for prod R2.** This is also how to retrieve Zachary's completed profile later: `wrangler r2 object get coursework-interview/profiles/zachary/noob-to-ai-entrepreneur-profile.md --remote --file=...`.
- Prod session was cleared (`--remote`) → Zachary's first load generates his own clean opener. STILL UNCOMMITTED. Pending: rotate the pasted API key; Phase Q CF Access on open /dad routes.

### Phase S.2 — Next session starts here
1. **Jonathan to browser-walk** `http://jserver:8788/zachary/interview` (dev server live, fresh/empty bucket, Sonnet 5). Confirm UX: markdown, streaming, mobile full-screen, multichoice chips, progress header.
2. On his OK: **commit** Phase S.1+S.2 (nothing committed yet).
3. Deploy: `CLOUDFLARE_API_TOKEN=$(cat ~/.coursework-cf-token) npm run deploy`; smoke `/zachary/interview` in prod.
4. **ROTATE the pasted Anthropic API key** (still pending — was in chat).
5. Later: proctor prompt + Jonathan's feedback dashboard; Phase Q CF Access on open `/dad*` + `/*/api/assets/*` routes.

## Phase S (original) — Ingestion interview app (Zachary) — SUPERSEDED BY S.2 ABOVE
- New student `zachary`, course `noob-to-ai-entrepreneur`, entry point `/zachary/interview`.
- Ported the claude.ai prototype (`coursework-app.zip`) to serverless: 7-section instrument + per-turn envelope + `[SECTION_COMPLETE]`/minTurns gate live in `functions/_interview.js`; endpoints `functions/[studentSlug]/api/interview/start.js` + `message.js`; light-mode UI `src/components/InterviewView.jsx`; route added in `App.jsx`.
- Session state + synthesized profile persist to a **dedicated private R2 bucket `coursework-interview`** (binding `INTERVIEW`) — NOT `coursework-assets`, because the public /files proxy (Jordan's empty r2Prefix) can read the whole shared bucket. Keyed by student×course: `sessions/<slug>/<course>.json`, `profiles/<slug>/<course>-profile.md`.
- Haiku (`claude-haiku-4-5-20251001`) for turns, Sonnet (`claude-sonnet-4-6`) for profile synth via `waitUntil`. Anthropic called via plain `fetch` (edge runtime).
- Guards: one-and-done per student×course (refuse start if completed profile exists; resume if in-progress), MAX_TURNS=60 cost cap.
- Key handling: CF Pages secret `ANTHROPIC_API_KEY` set on `coursework` (prod) + `.dev.vars` (local, gitignored). `.dev.vars` added to `.gitignore`.
- **VERIFIED LOCALLY:** `npm run build` clean; `wrangler pages dev` with both buckets — start endpoint routes, resolves student (unknown→404), reaches Anthropic, key AUTHENTICATES.
- **BLOCKER:** the pasted key's Anthropic account has **$0 credits** (`400: credit balance too low`). No model turn can run until Jonathan adds credits/billing to that account (same key is in prod secret, so prod is blocked too).
- **NOT yet verified** (needs credits): a real Haiku turn, section advancement, profile synth + R2 write, frontend against live data, prod deploy. Nothing committed yet.
- **SECURITY:** the live API key was pasted in chat — Jonathan must **rotate it** after confirming it works (then re-run `wrangler pages secret put` + update `.dev.vars`).

### Phase S — Next session starts here
1. Confirm Anthropic account has credits.
2. `npm run dev:full` (or `wrangler pages dev dist --r2 STORAGE=coursework-assets --r2 INTERVIEW=coursework-interview`), walk a short interview, confirm `profiles/zachary/noob-to-ai-entrepreneur-profile.md` lands in the local INTERVIEW bucket.
3. `CLOUDFLARE_API_TOKEN=$(cat ~/.coursework-cf-token) npm run deploy`; smoke `/zachary/interview` in prod.
4. Retrieve Zachary's profile from R2 for Jonathan on request (MVP delivery — no dad view yet).
5. Rotate the API key.
6. THEN: proctor system prompt + Jonathan's structured-feedback dashboard (deliberate next phase).

## TL;DR (resume point)
- App is **live + serverless** at `https://coursework.kitbord.com/jordan` (Sports Betting AI) and `https://coursework.kitbord.com/contentcreator` (Creator Business, niche "Perimenopause + Women's Wellness").
- Single Cloudflare Pages project (`coursework`), single R2 bucket (`coursework-assets`), one shared GitHub mirror repo (`rosenbaumdev/coursework`) with per-course path prefixes.
- **`/dad*` and `/<student>/api/assets/*` are wide open** to the public internet. **Phase Q (CF Access) is the next priority.**
- Phase R cleanup (delete `server/`, `~/.coursework-mirror-clone/`, stale CLAUDE.md sections) still pending.

## Completed this session arc (May 28 – June 15)
- **Phase A–F**: CF-native migration. Tunnel + Express retired. Pages Functions handle uploads/manifest/file proxy. R2 bucket `coursework-assets`. GitHub mirror via Contents API (no git CLI).
- **Phase G–I**: env-driven multi-course attempt + Jordan domain swap (rosenbaum.us → jordan-sports-betting.kitbord.com). Superseded by Phase N.
- **Phase N**: path-per-student multi-tenant refactor. Single domain `coursework.kitbord.com`. Routes `/<studentSlug>`, `/<studentSlug>/dad`, `/<studentSlug>/dad/files`, `/<studentSlug>/api/assets/*`, `/<studentSlug>/files/*`. Splash on `/`. Old subdomain `jordan-sports-betting.kitbord.com` 301-redirects via `functions/_middleware.js`.
- **Phase O**: `coursework.kitbord.com` attached to Pages project + CNAME via API. Cert live.
- **Phase P**: content-creator course set up. 15 briefs uploaded → R2 + GH mirror at `content-creator/day-N/`. `public/content-creator.md` authored from briefs.
- **Rich Day 1–15 bodies**: both courses' MDs rebuilt with Day-0-style structure (Theme, pitch blockquote, Session Goal, numbered What You'll Build, Tools, Teaching Moments, Confusion Points, Stretch Goals). See [[feedback-rich-day-format]].
- **defaultArc**: per-course config. Content-creator gets "Perimenopause + Women's Wellness" since no Day-0 picker. Header hides "change" link when defaultArc is set.

## In Progress
- Nothing. Both Phases Q and R are pending but neither was started.

## Next Session Starts Here

**Priority 1 — Phase Q: CF Access on the open routes.** The site has been wide open for ~2 weeks. In the CF Zero Trust dashboard, add two Self-hosted Access apps both gated to email `joalro@yahoo.com` via One-Time PIN:
1. `coursework.kitbord.com` path `/<student>/dad*` (covers `/jordan/dad`, `/jordan/dad/files`, `/contentcreator/dad`, etc.)
2. `coursework.kitbord.com` path `/<student>/api/assets/*` (sub-paths only — bare `/<student>/api/assets` stays public so student manifest GETs work)

Walk-through is in the original Phase K plan; basically Add Application → Self-hosted → path → identity providers (One-Time PIN is on by default) → policy (Allow, Include = email = joalro@yahoo.com).

**Priority 2 — Phase R cleanup.**
- `rm -rf server/`
- `rm -rf ~/.coursework-mirror-clone/ ~/.coursework-mirror-state.json`
- Delete the stray `assets/Daily Instructor Briefs - content-course/day-{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15}/` directory (literal brace-expansion folder, empty/harmless)
- Update `CLAUDE.md` to reflect multi-tenant + serverless architecture (current text still references Express + tunnel — wholesale rewrite of the architecture sections).
- Update `tasks/decisions.md` to supersede old single-course / subdomain-per-course entries.

**Priority 3 (waits on Jonathan)** — Real student name + course title framing for the contentcreator course. Edit `src/students.js` AND `functions/_students.js` in lockstep. Currently `name: 'Content Creator'`, `title: 'Creator Business'`, `defaultArc: "Perimenopause + Women's Wellness"`.

## How to deploy (any session)
```
CLOUDFLARE_API_TOKEN=$(cat ~/.coursework-cf-token) npm run deploy
```
The token at `~/.coursework-cf-token` (chmod 600) has Pages Edit + R2 Edit + DNS Edit scopes. Don't use `wrangler login` — its OAuth flow is flaky from Claude Code sessions and the resulting token has weaker scopes than the API token.

## Open Questions / Blockers
- None right now. CF Access can be done any time. Phase R is housekeeping.

## Temporary Notes
- Bundle size: ~352 KB JS / 110 KB gzip. Acceptable.
- Both course MDs ~40 KB after the rich-body rewrite — about 10× the previous prose summaries.
- localStorage is per-domain. Any old notes on `coursework.rosenbaum.us` or `jordan-sports-betting.kitbord.com` are stranded. Negligible content was lost.
- Pages auto-deploys on `wrangler pages deploy`, NOT on git push. Git push to `rosenbaumdev/coursework` doesn't trigger anything Pages-side — GH integration was never wired up.
- Functions middleware (`functions/_middleware.js`) intercepts every request, including static. It currently handles the old-subdomain 301 redirect.
- `wrangler.toml [vars]` is currently empty (no `GITHUB_PATH_PREFIX` etc.) — the multi-tenant refactor moved that logic into `students.js`/`_students.js`. If a future Function ever needs an env var, put it in `[vars]` so it survives `wrangler pages deploy` clobbering.
- `scripts/set-pages-env.mjs` was deleted (one-off, no longer needed).
- The deploy:jordan / deploy:cc scripts in package.json were collapsed to a single `deploy`.
- Pages reserved binding name `ASSETS` — we use `STORAGE`. Don't rename.
