# Architectural Decisions

## Per-learner isolation enforced (AUTHZ_ENFORCE flip) — 2026-07-09
**What:** Turned on app-side default-deny (`AUTHZ_ENFORCE="1"` in wrangler.toml [vars]). `_middleware.js`
gates every `/<slug>/(api|files)/*` to the owning learner (email→slug grant in R2 admin/access.json) and
`/api/admin/*` to admins (BOOTSTRAP_ADMINS ∪ grants.admins). Identity = verified CF Access JWT (`_access.js`).
Fail-closed: no identity → 401, wrong identity → 403. Decision logic extracted to a pure, unit-tested
`authzDecision(path,id)`. Grants added for all real self-login learners: jodi, acme, zachary, jordan.
**Two-layer model:** CF Access = the OUTER door (who reaches the app at all); these app grants = the INNER
isolation (which slug each identity sees). Now safe to widen the CF Access policy because the app isolates.
**Caching bypass (found + fixed during live verify):** CF shared-caches cacheable GETs keyed by URL, not
identity — a cached 200 (`/api/me`, `/<slug>/api/student`, `/<slug>/files/*` which set `public,max-age=300`)
was served to other identities WITHOUT re-running the gate (observed live). Fix: middleware forces
`no-store` on all API responses; files route → `private,max-age=300` (browser-only cache, never shared).
Non-sensitive shell/assets stay cacheable. LESSON: an auth gate in a Worker is bypassable by the edge cache
unless sensitive responses are explicitly non-shared-cacheable.
**Why the /files gap mattered:** `/<slug>/files/*` isn't under `/api/`, so an api-only gate missed it — it
streamed per-learner R2 materials ungated. The gate now covers api+files uniformly.
**Alternatives considered:** (a) self-gate each learner endpoint like requireAdmin — rejected: ~15 endpoints,
easy to miss one → leak; the middleware is one uniform chokepoint. (b) Leave enforcement dark until CF Access
widened — rejected: the pages.dev alias (no Access) was serving /<slug>/api/* to the open internet.
**Confidence:** 90% — deny-path proven live (401 on api+files+admin, no-store verified); authed allow-path
(jodi→/jodi, admin→all) is unit-verified only (can't mint real Access JWTs). Eyeball one real login.

## Courses never assume a learner's name or gender — 2026-07-09
**What:** Nothing in the course engine hardcodes a learner name or gender. The name a course
addresses the learner by is `displayNameOf(student)` = nickname || account name (`_students.js`);
pronouns resolve via `resolvePronouns(student)` defaulting to NEUTRAL singular `they` and used only
when genuinely known. Session packs are authored name-agnostic (a `{{name}}` token + neutral
`PRONOUN_SETS.they`) and CACHED that way; a per-request `personalizePack(pack, student)` deep-clones
the cached pack, substitutes `{{name}}` everywhere (masterPrompt, opener, DISPLAYED canvas cards) and
overrides pronouns for THAT learner. `newLesson`/`newSession` store `studentName = displayNameOf`.
Nickname + pronouns are admin-settable (registry entry fields; invite + edit; validated to he/she/they).
**Why:** Packs are keyed by COURSE, so any learner replicating a course inherited hardcoded "Zachary"
(incl. a canvas card literally shown to the learner) and he/him. The single injection seam already fed
the account name to the live AI; the leak was authored constants in `_sessionPacks.js`.
**Alternatives considered:** (a) reword prose to "the learner" only — fails the DISPLAYED canvas card,
which must render the real name. (b) Thread name/pronouns through every builder signature — 97 pronoun
sites; rejected for the one-seam personalizePack clone. (c) Build the learner-facing "persona
instructions" settings UI now — deferred to Phase III; admin-settable covers the need today. (d) Ask the
learner their pronouns — rejected (intrusive); default neutral, override only when known.
**Known cosmetic:** neutral `they` inherits the prompt's third-person-singular verb agreement
("they has/says") — semantically clear, model-robust, already the norm for the SHOWCASE default pack.
Accepted uniformly over a half-fix. `PRONOUN_SETS` carry be/have forms for a future full-agreement pass.
**Not solved (flagged):** the noob packs are Zachary's AUTHORED content (his interview/venture); de-naming
stops mis-naming but doesn't make that pack correct for a different learner. Legacy display-only `.md`
courses (jordan/content-creator) still carry name/gender in reading copy — a separate content-authoring track.
**Confidence:** 90% (unit-verified incl. assembled model-facing prompt; not yet browser-driven or deployed).

## Values-aware decisions: the growable-row matrix primitive + values scorecard — 2026-07-07
**What:** When a session decision hinges on the learner's own value system (e.g. which arc to build), the engine elicits and weighs those values on a **values scorecard** — a matrix figure whose COLUMNS are the options (the arcs) and whose ROWS are the learner's own named values, added at runtime. The reusable engine primitive is a **growRows matrix**: `spec.growRows:true` lets rows be appended live via `[FIG: <key> :: addrow="rowid|Label"]` (one per tag, parallel to iconrow's `add=`), capped at the 8-row matrix budget, deduped, malformed ids dropped. Cells hold a 1-5 fit score + reason, landed like any scoreboard cell. Row additions are stored in a new session field `figureRowAdditions` (session/R2 state, NOT the localStorage tracker schema), threaded through `resolveShowTarget`/`resolveFigureDir`/the Scribe, merged into `spec.rows` by `mergeFigureValues`, and surfaced in the envelope's current-values line (`row:id="Label"`) because control tags are stripped from model history. Day-1 instantiates it with `figure.values` + two objectives (`values.named` front, `values.weighed` tail) + a generic `VALUES DRIVERS` masterPrompt rule (elicit-first, score-at-decision, weigh scale AND fit — never let biggest TAM silently win).
**Why:** Jonathan: "if a decision is based upon a user value system … coursework should really understand the value drivers to help the user make the right choice." Sizing (TAM/SAM/SOM/Rev) is the scale axis; a personal 6-week build must also be weighed on non-scale fit, and Zachary won't volunteer his values unprompted. He chose "global primitive now" over a day-1 hardwire, so the capability (growRows matrix) lives in the engine and any pack can declare a values-scorecard; the day-1 pack is one instance.
**Alternatives considered:** (1) Prose-only values in the learner record, weighed verbally — rejected, no visible artifact he owns, weaker than a comparative board parallel to the sizing scoreboard (Jonathan picked the scorecard). (2) Add value rows to the existing sizing scoreboard — rejected, conflates monetary sizing with subjective fit on one board. (3) A brand-new figure kind — rejected, matrix already models cols×rows; a `growRows` flag + `addrow` is minimal surface area and reuses the whole render/nudge/hash path unchanged.
**Confidence:** 85%. Engine + harness verified (335 pack / 199 engine green, build clean); the open question is purely pedagogical — whether the Director reliably elicits 3-5 values and fills the board in a live session (watch first real run; the Scribe backstops forgotten cells).

## Ingestion interview: dedicated private R2 bucket `coursework-interview` — 2026-06-30
**What:** The onboarding-interview's session state and synthesized profiles live in a SEPARATE R2 bucket (`coursework-interview`, binding `INTERVIEW`), never the shared `coursework-assets`. Keyed by student×course: `sessions/<slug>/<course>.json`, `profiles/<slug>/<course>-profile.md`. No public Function references the `INTERVIEW` binding.
**Why:** The public file proxy `functions/[studentSlug]/files/[[path]].js` serves any key under a course's `r2Prefix`, and Jordan's `r2Prefix` is the empty string — so `/jordan/files/<anything>` can read the ENTIRE `coursework-assets` bucket. A profile containing "Flags for Jonathan" cannot live anywhere reachable that way. A separate bucket with no public reader is the only robust fix that doesn't depend on the still-pending Phase Q (CF Access). R2 (not KV) because turn-by-turn session state needs strong read-after-write consistency.
**Alternatives considered:** (1) Store in `coursework-assets` under an obscure prefix — rejected, Jordan's empty-prefix proxy defeats obscurity. (2) Cloudflare KV — rejected, eventual consistency risks a turn reading stale session state across colos. (3) Wait for CF Access to gate everything — rejected, blocks launch on unrelated work and still wouldn't stop Jordan's proxy reading the bucket.
**Confidence:** 90%. Profile delivery is MVP (Claude retrieves from R2 on request); a gated dad-view comes with the proctor/dashboard phase.

## Ingestion interview keyed by student×course, not student — 2026-06-30
**What:** "One-and-done" (refuse a new interview if a completed profile exists) is scoped to (student, course), not the student alone. A student who later takes a different course gets a fresh ingestion interview and a separate profile.
**Why:** Jonathan's point — the ingestion interview is course-specific (the AI-entrepreneur interview ≠ a French-cooking interview), so the profile is per-course. Keying one-and-done by student alone would wrongly block a student's second, unrelated course.
**Alternatives considered:** Per-student single profile — rejected, conflates distinct courses' calibration.
**Confidence:** 95%. Directly from Jonathan.

## Coursework loaded from `public/coursework.md` (not hardcoded) — 2026-05-23
**What:** The 21-day curriculum lives in `public/coursework.md` as frontmatter-delimited blocks, fetched at runtime and parsed by `src/data/parseCourseWork.js`. The React code never sees the curriculum content directly.
**Why:** CLAUDE.md mandates this so the coursework can be swapped (e.g. arc-specific rewrites) without touching React. The original build prompt called for a hardcoded `CURRICULUM` constant, but CLAUDE.md is the source of truth and the swap-without-rebuild property is genuinely useful — Jordan picking his arc will generate a new MD file.
**Alternatives considered:** (1) Hardcode the array per the build prompt — rejected, contradicts CLAUDE.md and locks the curriculum to a code release. (2) Hybrid (hardcoded with seam for later parser) — rejected as half-finished work; CLAUDE.md says no half-wired components.
**Confidence:** 95%. Confirmed with Jonathan before building.

## Frontmatter parser: split on `---` lines, alternating sections — 2026-05-23
**What:** `parseCourseWork.js` splits the document on `/^\s*---\s*$/m`. Resulting array is `["", frontmatter, body, frontmatter, body, ...]` so odd indices are frontmatter and `i+1` is body. Frontmatter is parsed as flat `key: value` pairs (no nesting, no quoting).
**Why:** Custom MD frontmatter format is intentionally minimal — only `day`, `week`, `title`, `description` are required. A real YAML parser would pull in a dependency and add a parsing surface for problems that don't exist here.
**Alternatives considered:** `gray-matter` (the standard frontmatter lib) — rejected, adds a dependency for ~20 lines of parsing we don't need. The CLAUDE.md "minimal surface area" rule pushed against new deps.
**Confidence:** 85%. The risk is if the body content ever contains a line that is literally `---` — it would be interpreted as a separator. Acceptable for now; if it becomes a problem, switch to a fenced delimiter like `+++` or use `gray-matter`.

## Tailwind for styling, no UI component library — 2026-05-23
**What:** Tailwind 3 with extended theme colors (`accent`, `dad`, `ink`, `paper`, `rule`, `inset`, `muted`) and Google Fonts (DM Sans body, DM Mono labels/numbers). No Radix, shadcn, or other UI lib.
**Why:** CLAUDE.md design rules are very specific (deep blue accent, slate dad accent, DM Mono/Sans, no purple gradients, no Inter). A UI lib would fight those choices. The app is small enough that hand-rolled components beat the indirection.
**Alternatives considered:** CSS Modules (PRD allowed it) — rejected, Tailwind keeps the design tokens in one place (`tailwind.config.js`) which makes the "single accent color" rule enforceable at a glance.
**Confidence:** 90%.

## Two routes only, no auth, role from `useLocation()` — 2026-05-23
**What:** `/` = Jordan, `/dad` = Jonathan. `useLocation().pathname.startsWith('/dad')` derives an `isDAD` boolean. Notes posted from each view are authored accordingly. No login screen, no role switcher.
**Why:** Explicitly mandated by CLAUDE.md and the PRD. Auth is out of scope; the URL is the role.
**Alternatives considered:** None viable — adding auth would violate scope and CLAUDE.md.
**Confidence:** 100%.

## GitHub mirror for claude-prompt files — 2026-05-25
**What:** claude-prompt category files are auto-mirrored to `github.com/rosenbaumdev/coursework` (public repo) on upload. Launcher uses the `raw.githubusercontent.com` URL in the pointer prompt sent to claude.ai. Local storage stays the source of truth; mirror is one-way downstream.
**Why:** claude.ai's WebFetch tool has an implicit domain allowlist. `coursework.rosenbaum.us` (our domain) is not on it; `raw.githubusercontent.com` is. Without the mirror, the "Open in claude.ai" button generates a pointer prompt that Claude can't fetch. With the mirror, Claude fetches from GitHub raw and the session starts.
**Alternatives considered:** (1) jsDelivr CDN — rejected; GitHub raw is just as universally allowlisted and avoids an extra hop / 12h cache. (2) Cloudflare Pages — rejected; requires separate deploy pipeline and Pages domains' allowlist coverage is uncertain. (3) Stop fighting WebFetch, make button "copy + open" only — rejected; user wanted "one click → spawn Claude session" and the mirror achieves that.
**Confidence:** 95%. Risk: GitHub repo size could bloat if someone uploads huge md/txt files. Mitigated by the category-extension filter (md/txt only, no audio/PDFs).
**Architecture rules baked in:**
- Local is source of truth. Never sync GitHub → local.
- Only `claude-prompt` category mirrored. Podcasts/PDFs stay local-only.
- Sync failures don't fail uploads (logged + visible in UI badge).
- Sync is auto on upload (no "click to sync" button).
- State persisted in `~/.coursework-mirror-state.json` so manifest builder can include it.
- See [[file-cms-backend]] for related upload handler.

## Public exposure via Cloudflare Tunnel — 2026-05-24
**What:** App publicly reachable at `https://coursework.rosenbaum.us` via cloudflared tunnel → localhost:4174. WAF custom rule on `coursework.rosenbaum.us` skips Super Bot Fight Mode + Browser Integrity Check. Bot Fight Mode disabled zone-wide. Cloudflare "Manage your robots.txt" set to allow AI bots.
**Why:** Personal access (Jonathan + Jordan from any device, any network) without exposing jserver's IP directly. Cloudflare provides TLS, DDoS protection, and the tunnel handles NAT traversal so no router port-forwarding needed.
**Alternatives considered:** (1) Cloudflare Pages + Workers — rejected; backend requires filesystem (uploads) which Workers don't have natively. (2) Tailscale Funnel — rejected; .ts.net hostnames are ugly and Funnel paths are limited. (3) Caddy reverse proxy with port forward — rejected; exposes jserver IP and requires router config.
**Confidence:** 90%. Tunnel currently runs as background task within Claude Code session (dies when session ends). Persistence pending (launchd).
**Operational notes:**
- Use `--protocol http2` (NOT QUIC). Comcast/home networks drop UDP, causing constant tunnel flapping.
- Tunnel token stored in command args; lives in this conversation history. Can be rotated in CF dashboard if needed.
- Free CF plan has no per-hostname Bot Fight Mode override; had to disable zone-wide. Acceptable since other subdomains have their own auth.

## Backend added (Express) — 2026-05-23
**What:** Small Express server at `server/index.js` serves the built React app, file CMS API (`POST/GET/DELETE /api/assets`), and uploaded assets at `/files/*`. Storage is filesystem at `storage/day-<id>/<category>/<filename>` (gitignored). Multer handles uploads with 100 MB limit and per-category extension allowlists.
**Why:** The original "no backend, localStorage only" rule collapsed the moment Jonathan needed to upload podcasts/PDFs/PPTXs and have them reachable from any tailnet device. localStorage can't store or share real media files. The smallest backend that solves it is Express + multer — no DB, no auth, no sessions.
**Alternatives considered:** (1) Manual file placement over SSH — rejected, Jonathan explicitly wants a browser UI. (2) External object storage (S3/R2) — rejected, adds credentials + a third-party dependency for a personal-scale problem. (3) localStorage with base64 — not viable: 5–10 MB browser quota, can't share between Jordan's and Dad's browsers.
**Confidence:** 95%. Confirmed with Jonathan before building. The remaining 5% is whether 100 MB / file is the right limit (PPTX decks with embedded media can blow past it).

## Sub-days nested under parent — 2026-05-23
**What:** Days with fractional IDs (`0.1`, `0.2`) are children of their integer parent (`0`). Parser stores `id` as a string and `parentId` (also string or null). `buildDayTree(days)` returns top-level days each with `children: [...]`. Sub-day cards render inside the parent's expanded panel, smaller and without the "current day" accent. Top-level day count is what counts toward "X / N complete" — sub-days are bonus content.
**Why:** Jonathan has supplementary materials (audio, decks) keyed to half-days. Visual hierarchy should match conceptual hierarchy. Flat siblings would make Day 0.1 look as important as Day 1, which it isn't.
**Alternatives considered:** Flat sibling list with string IDs — rejected, hides the parent/child relationship in the UI.
**Confidence:** 90%. Open question: should completing all of a parent's sub-days auto-complete the parent? Currently independent. Easy to add later if Jonathan wants it.

## Auto-link assets by directory layout — 2026-05-23
**What:** No asset manifest file. The backend scans `storage/` on every `GET /api/assets` and returns a manifest grouped by day → category → file. Uploads pick day + category + file via the `/dad` UI; the backend writes to the corresponding directory; the frontend re-fetches the manifest and re-renders. To remove a file, click delete (DELETE endpoint unlinks it).
**Why:** A separate manifest JSON would have to stay in sync with the filesystem, creating a class of bugs where the file exists but isn't listed (or vice versa). Filesystem-as-truth eliminates that. Performance is fine at this scale (dozens of files, not thousands).
**Alternatives considered:** SQLite manifest with file metadata — rejected, premature for the scale.
**Confidence:** 95%. Would revisit only if asset count grows to thousands.

## Sub-day editing happens in public/coursework.md directly — 2026-05-23
**What:** `JORDAN_COURSEWORK.md` + `scripts/build-coursework.mjs` were a one-shot seed. Going forward, `public/coursework.md` is the source of truth for day content — edited directly. Adding a sub-day = append a `---\nday: 0.1\nweek: 1\ntitle: ...\ndescription: ...\n---\n<body>` block.
**Why:** Re-running the build script would overwrite hand-edited sub-day blocks. Two-stage authoring (edit source MD → re-run script) was useful for the bulk import but creates a footgun for ongoing content edits.
**Alternatives considered:** Make the build script idempotent (merge instead of overwrite) — rejected as added complexity for a tool that only runs once.
**Confidence:** 85%. If Jonathan ends up wanting to bulk-regenerate from a new source, we revisit.

## localStorage shape matches PRD exactly — 2026-05-23
**What:** Two keys: `arc` (plain string) and `days` (object keyed by stringified day id, each value `{ completed, completedAt, notes[] }`). Days with no interaction have no entry — the hook returns a default object via `getDay`.
**Why:** PRD specifies this shape; sparse storage keeps the JSON small and means the "default state" is defined in one place (the hook), not duplicated across the data.
**Alternatives considered:** Pre-populating all 21 entries on first load — rejected, just wastes bytes and creates a migration headache if the day count ever changes.
**Confidence:** 95%. The one risk is downstream code forgetting to use `getDay()` and reading `days[id]` directly. Mitigated by the hook being the only thing that touches `days`.

## Terminal persistence via tmux attach-or-create — 2026-07-08
**What:** The droplet PTY bridge (`/home/coder/bridge/server.mjs`) now spawns `bash -lc 'exec tmux new-session -A -s course'` instead of a bare `bash -l`, and keeps a ws ping heartbeat (25s). On disconnect it only `term.kill()`s the tmux CLIENT (detach); the tmux server + session survive — across idle drops AND bridge restarts. Client `LiveTerminal.jsx` auto-reconnects with backoff and re-attaches invisibly. Proven: same `pane_pid` across reconnects through the live tunnel; session survives every disconnect.
**Why:** Old bridge spawned a fresh shell per connection and `term.kill()`d it on close, and had no keepalive — so a ~100s idle tunnel drop killed the learner's shell mid-build (a running `claude`, cwd, scrollback all lost). Day 2 (build a game in the terminal) is unusable without this.
**Alternatives considered:** (a) client-only auto-reconnect — rejected: reconnect still hit a fresh shell, state gone. (b) longer bridge idle timeout — rejected: doesn't survive bridge restarts or real network blips. tmux is the standard, robust answer and was already installed.
**Confidence:** 95% — verified end-to-end. Caveat: a full droplet REBOOT ends the session (first reconnect recreates it fresh); acceptable. Ephemeral tunnel URL still churns on cloudflared restart — named tunnel is the durable fix, folded into the pending CF Access work.

## Auth: Cloudflare Access + Google as the front door — 2026-07-08
**What:** coursework.kitbord.com is now behind Cloudflare Access (Zero Trust team `flat-heart-d5af`), Google IdP, session 24h. Interim policy = email allowlist (jonathan.rosenbaum@gmail.com + zachary@rosenbaum.us). Access injects a verified email (`Cf-Access-Authenticated-User-Email`) on every request.
**Why:** The app is public on CF Pages and serves a live-shell token in the session payload — anyone could read it. Access gates the whole domain so the token is only ever served to authenticated, allowlisted users. Closes the exposure hole; supersedes the "flip the token" interim.
**Split (the model):** Authentication = Cloudflare (don't build passwords/sessions ourselves). Authorization = our app (which courses an identity may open). Target end-state: widen the Access policy to "allow any authenticated user," and an app-side DEFAULT-DENY gate (reads the CF-verified email, checks a user→courses grant map) enforces per-course access + invite links. Interim allowlist holds until that gate is built (rushing security code late-night is worse than a coarse allowlist).
**Supersedes:** CLAUDE.md's "Auth: None / tailnet-only" rule — stale since the app went public + multi-tenant + live-shell. Update CLAUDE.md when the authz layer lands.
**Confidence:** 90% on the split; the default-deny gate + per-student workspace isolation are the next security-critical builds.

## Workshop VM: stable named tunnel + hardcoded URL default — 2026-07-08
**What:** The droplet's public origin moved from an ephemeral cloudflared quick tunnel (`*.trycloudflare.com`, churns on every restart) to a STABLE named Cloudflare tunnel on a fixed subdomain `workshop.kitbord.com` (ingress → droplet `proxy.cjs` on :9000, which multiplexes app HTTP:8080 + PTY WS:7681). `TERMINAL_WS_URL` + `APP_VIEWER_URL` now both point at it, and the same URL is hardcoded as `DEFAULT_VM_URL` in `_session.js` — so `injectLiveSurfaces` (and the `viewer-status` probe) fall back to the REAL URL, never `''`, if the Pages `[vars]` binding fails. The TOKEN is never defaulted (secret, env-only).
**Why:** Day 2's blocker was NOT serving/framing — the app was live and iframe-able the whole time. It was that `env.APP_VIEWER_URL` arrived empty, so `injectLiveSurfaces` silently emitted `viewerUrl: ''`, stranding the viewer iframe (no `src` → placeholder) and the Director (coached blind). Traced both server + client paths: code was sound; the empty env var was the single origin. A stable URL that's also a code default makes this failure mode impossible to recur, and ends the quick-tunnel URL churn (which forced a wrangler edit + redeploy on every tunnel restart).
**Alternatives considered:** (a) Keep the quick tunnel, just re-verify the env binding — rejected: churn remains, and the silent-empty-string footgun stays armed. (b) Per-student subdomains + CF Access scoping now — deferred: needs per-student droplet users; wide-open single tunnel is fine for one student (Zachary). Wildcard `*.workshop.kitbord.com` + a `workspace` field in `_students.js` makes that a later config change, not a redesign.
**Confidence:** 90%. The URL default guarantees delivery; remaining risk is purely the one-time droplet/CF infra setup (named tunnel creds, DNS CNAME, systemd unit).

## Terminal-watching: the Observer (Haiku) — 2026-07-08
**What:** On live-workshop days the Director "watches the terminal" via TWO channels, both feeding `buildSessionEnvelope`. (1) REACTIVE: every turn reads a rolling plain-English SITUATION summary (`loadGlance`) + the raw terminal tail (client `describeCanvas` liveState). (2) PROACTIVE: `LiveTerminal` fires a `{kind:'settled'}` event when Claude Code worked (saw `esc to interrupt`) or an error-ish line appeared and the terminal then went quiet ≥3s; `SessionView.runObserverGlance` POSTs the tail to the new `/session/glance` endpoint → OBSERVER (Haiku, `runObserver`) returns `{situation, salient, kind, oneLine}`; salient → a short proactive Director turn. Fast client regexes (Sentinel) now handle ONLY permission/trust prompts + the learner's own typed prompt; activity/error interpretation moved to the Observer. Situation stored in a SEPARATE R2 object (`glances/...`), never the session — so glance writes can't clobber a concurrent Director turn's read-modify-write.
**Why:** `100cr` — Jonathan (rightly) hit the roof: I'd claimed terminal-watching "worked (turns-based)" twice, but the Director observably never reacted. Root cause on full trace: the wiring was complete but (a) the reactive channel only opened on a chat SEND (blind during terminal work — "turns-based doesn't make sense"), and (b) the proactive Sentinel fired on only permission/trust/long-prompt — ordinary build activity/errors emitted NOTHING. Regexes also can't tell "finished, looks good" from "finished, subtly broken." A model that READS the terminal fixes both and is robust to Claude Code's TUI wording changing.
**Alternatives considered:** (a) Broaden the regex taxonomy only — shipped as the interim in the same session but ~70% and brittle; Jonathan chose the Observer. (b) `/glance` chains into the Director turn itself (one endpoint, two model calls + SSE) — rejected: the two-call client flow (glance → then sendProactive) reuses ALL existing proactive plumbing. (c) Store situation on the session — rejected: races the Director turn's session write; separate object is race-free.
**Confidence:** 90%. Proven end-to-end via `curl` to deployed `/glance` (real `npm ERR!` → correct `{salient:true,kind:error,oneLine:...}`). Remaining risk is the one brittle spot: scraping Claude Code's TUI (`WORKING_RE`, permission regexes) — quarantined in `terminalEvents.js` + `LiveTerminal.jsx`.
