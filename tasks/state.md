# Coursework Tracker — Session State
Last updated: 2026-07-09 (admin progress display + ask-AI objectives; dev-first clarified)

## Completed This Session (admin "12/18 but complete" ambiguity + ask-AI objective list)
- DIAGNOSIS (answer to "how is 12/18 but complete possible?"): NOT a bug, NOT an ask-AI
  hallucination, NOT missing objectives. Zachary's real Day-1 record is a GRACEFUL EARLY EXIT —
  `{completed:true, endedIncomplete:true, signedOff:null}`, 12/18 REQUIRED ticked (13 incl. 1 bonus).
  Two display/context gaps hid the truth: (a) admin collapsed complete/ended-early into one green
  pill; (b) ask.js never fed the objective board, so the model truthfully couldn't list them.
- FIXES (display/context only — no engine change):
  1. `_sessionPacks.js`: new `objectiveBoardData(pack, state)` — structured twin of
     renderObjectiveBoard (section/id/need/type/required/ticked/evidence).
  2. `api/admin/learner/[slug].js` GET: each day now returns `endedIncomplete`, `totalObjectives`,
     and `objectives[]` (the board).
  3. `api/admin/ask.js`: appends `renderObjectiveBoard()` + a precise status line
     (CLOSED-ended-early / COMPLETED-signed-off / COMPLETED) to each day's context.
  4. `AdminView.jsx`: `DayStatusBadge` (amber "ended early" vs green "signed off"/"complete" vs
     none) + collapsible `ObjectiveBoard` (per-section [x]/[ ] checklist, R/B tag, evidence line).
- VERIFIED on jserver:8788 (local miniflare R2, data-isolated from prod): seeded a synthetic Day-1
  lesson from the CURRENT pack (12/18 req, 20 total, completed+endedIncomplete). `GET /api/admin/
  learner/zachary` returned ticked 12/18, totalObjectives 20, endedIncomplete true, 20-item board
  (13 ticked). `POST /api/admin/ask` enumerated all 20 objectives, split done/not-done, and called
  it "NOT fully finished — ended early." `npx vite build` clean. Local seed deleted after.
  NOT browser-rendered (bg job) — UI wired to the verified data contract + build passes.
- DEV-FIRST CLARIFIED: "dev" = local `npm run dev:full` on jserver:8788, which uses a LOCAL
  miniflare R2 (no `--remote`) → already data-isolated from prod. Standing loop: edit → verify on
  8788 → commit → `npm run deploy`. Git hygiene DEFERRED: prod runs the `learner-naming-and-
  isolation` branch lineage; local `main` (f02e5a6) is 5 commits stale — fast-forward later.

## Also This Session — prod→dev R2 sync (test features against real data, isolated)
- NEW `scripts/sync-prod-to-dev.mjs` + `npm run sync:dev` (`-- --assets` to also pull STORAGE).
  Snapshots prod R2 → local miniflare R2 (the store jserver:8788 reads) so features can be
  tested against REAL learner data while local writes never touch prod.
- MECHANISM (no new deps, no S3 creds): wrangler `getPlatformProxy` twice — one with
  `experimental:{remoteBindings:true}` (reads real buckets, authed by CLOUDFLARE_API_TOKEN /
  `~/.coursework-cf-token`), one local (writes .wrangler/state). Additive copy; `rm -rf
  .wrangler/state` first for a pure mirror. INTERVIEW by default; STORAGE only with `--assets`.
- VERIFIED: synced 13 INTERVIEW objects; local `GET /api/admin/learner/zachary(-test)` reads
  them; stored ids match current pack (no drift — content faithful).
- FINDING (heads-up, not acted on): the "12/18 ended-early" record is NOT in prod now — real
  `zachary` has Day-1 ARTIFACTS but no `day-1.json` lesson; `zachary-test/day-1.json` is an
  unplayed 0/18 fixture. The ended-early display fix stays proven via the synthetic record.

## Completed Prior Session (names/pronouns key off account, not hardcoded)

## Completed This Session (names/pronouns de-assumption — DEPLOYED TO PROD, still uncommitted)
- DEPLOYED 2026-07-09 (branch main = prod, coursework.kitbord.com). VERIFIED LIVE via prod alias
  `coursework-5lg.pages.dev/acme/api/student` → new `displayName` field present (acme→"acme", nickname
  null, pronouns unset→neutral they). acme's persisted Day-2 opener needs ↻ RESTART to regenerate.
- DEFERRED (added to todo.md top): PER-LEARNER AUTHORED PACKS. Root issue exposed by acme's live Day-2
  greeting "Zachary — good to see you. Yesterday you made a real call: the AI investing translator…":
  getSessionPack keys packs by COURSE + findCourseTemplate makes invited learners inherit the template's
  ZACHARY_DAY_1/2 verbatim. The {{name}}/pronoun fix corrects name+gender, NOT the Zachary-specific
  content. Real fix = author each learner's day-packs from THEIR profile + prior-day outcomes.
- Courses no longer assume a learner's name OR gender. Name a course addresses the learner by =
  `displayNameOf(student)` (nickname || account name); pronouns = `resolvePronouns(student)` default
  NEUTRAL singular they, used only when known. New helpers + `PRONOUN_SETS{they,he,she}` (w/ be/have
  verb forms) in `functions/_students.js`; nickname/pronouns threaded through registryToStudent + applyOverrides.
- Root fix: session packs (`_sessionPacks.js`) hardcoded "Zachary" (incl. a canvas card SHOWN to the
  learner) + he/him. Packs now author name-agnostic ({{name}} token + PRONOUN_SETS.they) and stay that
  way in the shared CACHE. New `personalizePack(pack, student)` in `_session.js` deep-clones per request,
  substitutes {{name}} (masterPrompt/opener/canvas) + resolves pronouns. Wired into session start/message/
  glance/canvas. `newLesson`/`newSession` store studentName=displayNameOf. `_interview.js` de-gendered
  (all he/him/his → they/their; intake never knows gender).
- Admin: nickname + pronouns are registry fields, editable via `learner/[slug].js` (clearable, pronoun-
  validated he/she/they) and invite (`learners.js`); surfaced in both admin GETs; inputs added to
  AdminView invite + edit forms. Client: `/api/student.js` returns displayName; `src/students.js`
  displayNameOf(); ClaudeLauncher + NotesThread address by displayName.
- VERIFIED: 20/20 unit assertions (helpers + personalizePack, incl. displayed canvas card + cache-not-
  mutated); 6/6 on the ASSEMBLED model-facing system prompt (right name, zero Zachary leak, she→she/her,
  unset→they/them/their, no he/him assumption); `npm run build` clean; all changed server modules import
  cleanly (no circular deps). NOT browser-driven end-to-end (bg job); NOT deployed; still UNCOMMITTED.
- Known cosmetic + deferred: see decisions.md "Courses never assume a learner's name or gender". Legacy
  display-only `.md` courses (jordan/content-creator) still carry name/gender in reading copy — flagged as
  a separate content-authoring track (never hit the AI; jordan's md is his own course).
- NEXT for this thread: eyeball a non-Zachary learner in-browser (invite a dev learner w/ nickname+pronouns
  from PROD /admin → open their Day 2 → confirm greeting + canvas card use the nickname, pronouns neutral/set),
  then deploy + commit with the rest of the pending work.

## Provisioning daemon + workshop Claude auth (2026-07-09) — DONE, live on droplet
- Daemon INSTALLED + PROVEN: invite from prod /admin → daemon creates the isolated account → status
  reconciles provisioning→active. Runs as systemd `coursework-provisioner` (survives logout/reboot).
- WORKSHOP CLAUDE AUTH SOLVED (big thread): copying `~/.claude` creds between users FAILS — OAuth
  refresh tokens rotate → logout cascades (acme's copied cred drifted 504→276 bytes, 401'd). Switched
  to ONE shared long-lived **setup-token** (`claude setup-token`, ~1yr, `sk-ant-oat01-…`) supplied via
  **`CLAUDE_CODE_OAUTH_TOKEN`** env. Lives in `/etc/coursework/claude-oauth.env` (root 600), loaded by
  `coursework-bridge@.service` (`EnvironmentFile=-`), inherited by tmux/claude (`env:process.env` in
  server.mjs). Daemon/provision-user.sh no longer copy auth (AUTH_SOURCE empty). Full model + gotchas
  in memory `project_workshop_auth.md`. VERIFIED: acme `claude -p`→AUTH_OK; bridge /proc/environ has the
  token (grep -c = 1). acme + jonathan migrated (rm stale .credentials.json, restart bridge, tmux kill-server).
- Local repo changes for this (workshop/coursework-bridge@.service, provision-daemon.mjs [AUTH_SOURCE
  default '', conditional --copy-auth-from], provision-user.sh messaging) are scp'd to the droplet but
  still UNCOMMITTED locally.
- REMAINING: (1) eyeball acme's LIVE terminal in-browser (should be logged in, no /login). (2) ZACHARY
  not yet migrated (live student — do rm .credentials.json + restart bridge + tmux kill-server when he's
  not mid-session, so he's on the stable token too). (3) coder's own default-route terminal unauthed (only
  matters if the legacy no-prefix route is used). (4) token regen reminder ~11 months out.

## Completed Prior Session (Phase I — signed rotating workshop tokens)
- Retired per-user static tokens. App now mints HMAC-SHA256 signed, short-lived tokens
  (`functions/_workshopToken.js`, TTL 24h) served from `GET /<slug>/api/session/workshop-token`;
  client (`WorkshopCanvas` → `LiveTerminal`) re-fetches a fresh token per (re)connect.
- Bridge (`workshop/bridge/server.mjs`) verifies signature + `u===WORKSHOP_USER` + `exp>=now`.
  Bridge learns its own user from `/etc/coursework/<user>.env` (`WORKSHOP_USER`), reads shared
  `WORKSHOP_SIGNING_SECRET` from `/etc/coursework/signing.env`. Static `TERM_TOKEN` kept as fallback.
- Droplet cutover done (by root): `signing.env` created; `WORKSHOP_USER` in both env files;
  new `server.mjs` + `coursework-bridge@.service` deployed; both bridges restarted → active.
- CF Pages secret `WORKSHOP_SIGNING_SECRET` set on production (same value as droplet). Deployed to prod.
- VERIFIED END-TO-END (headless, no browser): bridge accepts signed / rejects cross-user(4001) /
  rejects expired(4001); deployed prod app mints `{"u":"jonathan",...}` for zachary-test; that
  ACTUAL app-minted token → `/u/jonathan/` = identity jonathan, → `/u/zachary/` = 4001.
  Proof method: fetch token via pages.dev (bypasses CF Access), WS-test through tunnel from droplet.
- Only unproven bit: the in-browser click path (`/zachary-test` Day-2 → terminal renders + attaches).
  Same-origin fetch carries the Access cookie so it should just work; optional to eyeball.

## Completed Prior Session
- `100cr` on Director terminal-watching. Root-caused: wiring was complete, but (a) the reactive channel only opened on a chat send (blind during terminal work) and (b) the proactive Sentinel fired on only permission/trust/long-prompt — ordinary activity/errors emitted nothing.
- Built the OBSERVER (Haiku): new `functions/[studentSlug]/api/session/glance.js` + `runObserver`/`loadGlance`/`saveGlance`/`glanceKey` in `_session.js`. Rolling situation stored in a SEPARATE R2 object (`glances/<slug>/<course>/day-<id>.json`) so glance writes never clobber the session.
- Two awareness channels now feed `buildSessionEnvelope`: reactive (situation + raw tail every turn) and proactive (settle → /glance → salient → proactive Director turn).
- `LiveTerminal.jsx`: settle detector (`WORKING_RE` + error-ish armer → `{kind:'settled'}` on quiet ≥3s). `SessionView.jsx`: `runObserverGlance` (throttle 5s + tail-change dedup), `fireProactive` with `GAP_EXEMPT` (permission/trust/error/learner-prompt bypass the 25s gap; only "activity" waits).
- Trimmed the Sentinel (`terminalEvents.js`) to fast/unambiguous triggers only (permission/trust/learner-prompt); activity/error interpretation is the Observer's job. Removed dead `onActivity`/`ERROR_RE`. Made `AFFORDANCE_LABELS` honest (dropped never-emitted `menu`/`claude-working`).
- Added WORK LANDED + ERROR bullets to the proactive prompt block; added the TERMINAL SITUATION envelope block.
- Built, deployed to prod, smoke-tested `/glance` on the pages.dev URL (real `npm ERR!` → `{salient:true,kind:error,oneLine:...}`). Cleaned the test's glance object from R2.

## Phase II progress (2026-07-09)
- II-1 authz foundation: DONE + PROVEN end-to-end. Identity from VERIFIED Access JWT
  (Cf-Access-Authenticated-User-Email is NOT forwarded to Pages; cf-access-jwt-assertion is).
  `_access.js` verifies RS256 vs team JWKS (flat-heart-d5af.cloudflareaccess.com) + aud
  (d83de7fb…) + iss + exp. `BOOTSTRAP_ADMINS`=jonathan.rosenbaum@gmail.com (Pages secret).
  `/api/me` returns {email,isAdmin,courses}; middleware default-deny gated behind
  `AUTHZ_ENFORCE` (still DARK/unset). Proven: /api/me on real Access → isAdmin:true, sig verified.
- II-2 registry overlay: DONE + PROVEN. R2 admin/registry.json overlaid on code seeds via
  `primeStudents()` in `_middleware` (getStudent stays sync). Tested a registry-only slug
  resolved with NO redeploy; code seeds intact. Client unknown-slug resolution deferred to II-3/4.
- NEXT: II-3 admin console (read-first: roster + per-learner progress/transcripts +
  "ask AI about learner"; then invite/create-learner which writes registry via saveRegistry).
- ENFORCEMENT FLIP (later, coordinated): learner access will come from registry email→slug;
  then set `AUTHZ_ENFORCE=1`, verify fail-closed, THEN Jonathan widens the CF Access policy.

## Phase II admin + dev cohort (2026-07-09)
- II-3 admin console (`/admin`, `src/components/AdminView.jsx` + `functions/api/admin/*`): roster,
  per-learner progress/transcripts, "ask AI about learner", invite, provision controls — DONE.
- II-4 provisioning (app→droplet, pull): `functions/_provision.js` (R2 queue), invite enqueues
  `create`, `workshop/provision-daemon.mjs` + systemd unit written — DONE app-side. Daemon NOT yet
  installed on droplet (Jonathan sets it up).
- DEV COHORT (new): learners can be flagged `dev:true` at invite. Stored in registry; surfaced in
  roster/detail; grouped in a separate "Dev users" section; `dev` badge. Purpose: observe MULTIPLE
  distinct dev accounts (each its own droplet shell) without a second droplet — per-user isolation
  makes throwaway dev accounts on the prod droplet safe.
- DELETE learner (new): `DELETE /api/admin/learner/:slug` — enqueues `deprovision`+wipe, drops the
  registry entry, revokes the email→slug grant. Refuses code-seed slugs (409). UI: red "Delete" in
  detail header (registry learners only) + confirm. VERIFIED locally: invite dev → roster dev=true →
  delete ok; zachary delete → 409. No daemon change needed (reuses existing deprovision action).
- KEY CONSTRAINT: the droplet daemon reads PROD R2. So dev users must be INVITED FROM PROD /admin to
  actually provision on the droplet — a local-dev invite lands in isolated local R2 the daemon never sees.

- STATUS RECONCILIATION (fixes "stuck in provisioning"): root cause was that NOTHING advanced a
  learner's registry status out of 'provisioning' — invite sets it, the daemon writes only its
  separate admin/provision-status/<slug>.json and never touches registry.json, and the admin renders
  the registry value. New `reconcileStatus(entry, provStatus, queued)` + `isTerminalStatus()` in
  `functions/_provision.js` (queued→provisioning, error→error, done→active/suspended/deprovisioned).
  Wired reconcile-on-read + self-heal into both admin GETs (`learners.js` roster reconciles only
  'provisioning' rows; `learner/[slug].js` reconciles + persists terminal transitions back to the
  registry). UI: StatusPill gains 'error' (red); ProvisionControls surfaces the daemon error detail +
  a "Retry provisioning" button, and a "no daemon result yet — daemon may not be running" hint when
  provisioning with an empty queue/status. VERIFIED locally by simulating the daemon (injected
  provision-status into miniflare R2 via `wrangler r2 object put --local --persist-to .wrangler/state`):
  done→active + registry self-healed (raw R2 confirms acme.status=active); error→error + detail
  surfaced + NOT persisted (stays provisioning, retryable). 10/10 unit assertions on the mapping.
- Confirmed the delete IS durable: after API delete, raw local R2 registry keys=[] (the earlier
  "reappearance" was a miniflare WAL/reload hiccup, not the delete code; prod R2 is durable anyway).

- TERMINAL COPY (prod): `LiveTerminal.jsx` already had ⌘C/right-click → `copyText(getSelection())`,
  but (a) it was never deployed and (b) inside Claude Code's TUI mouse-reporting swallows drags so no
  selection forms → copy got nothing. Added a **⧉ Copy button** in the controls panel that copies the
  selection OR, when there's none, the visible screen (`viewportText()` reads buffer rows) — always
  puts real text on the clipboard, mobile + desktop. Added a hint to hold ⌥/Shift to select inside a
  menu. NOT eyeball-tested in a browser (background job) — deployed + build-verified only.
- DEPLOYED TO PROD (2026-07-09): `npm run deploy` → https://b47e0f57.coursework-5lg.pages.dev (branch
  main = production; coursework.kitbord.com). This release shipped EVERYTHING pending: admin console
  (/admin), dev-cohort flag + delete, status reconciliation, terminal copy + mobile controls, Phase-I
  local-dev fixes. Verified 200 + functions respond on the pages.dev alias. AUTHZ_ENFORCE still unset
  (default-deny stays dark); /admin gated by real Access JWT (DEV_ADMIN_EMAIL is local-only, not deployed).

- DAEMON PROVEN LIVE (2026-07-09): provisioning daemon installed on droplet + verified end-to-end —
  invited "acme" from prod /admin → daemon created the account → status reconciled provisioning→active
  (confirmed via prod /acme/api/student → "active"). The full invite→provision→active loop works.
- CLIENT UNKNOWN-SLUG RESOLUTION (was deferred): registry-invited learners (e.g. acme) hit `<Splash/>`
  because the CLIENT resolved slugs from the STATIC src/students.js (code seeds only). Fixed: new
  `GET /<slug>/api/student` (registry-aware, middleware-primed) + shared `src/hooks/useStudent.js`
  (static map first, server fallback) used in StudentRoute (App.jsx), InterviewView, SessionView.
  Also: `findCourseTemplate()` in _students.js so an invited learner inherits the replicated course's
  mdFile/defaultArc/title (keeps own r2Prefix) — acme now loads zachary-noob-to-ai-entrepreneur.md.
  learners.js no longer defaults courseTitle to the slug (lets the template title win). Deployed +
  verified on prod (/acme/api/student resolves; unknown slug 404s). Hard-reload to see /acme render.

## In Progress
- (none) — all pending work deployed to prod. Still UNCOMMITTED in git (deploy builds from the working
  tree, not a commit). Next: commit the accumulated work (getting large); optional stable workshop tunnel.

## Next Session Starts Here
- COMMIT the Phase I + workshop-isolation work (new `workshop/` dir, `functions/_workshopToken.js`,
  `functions/[studentSlug]/api/session/workshop-token.js`, `_session.js`/students wiring,
  `LiveTerminal`/`WorkshopCanvas` token re-fetch). Then optionally push `main` to GitHub.
- Then Phase II (designed in ~/.claude/plans/plan-id-like-elegant-whistle.md): runtime learner
  registry (R2 `admin/registry.json`), pull provisioning daemon (R2 queue + droplet root daemon),
  authz layer (`_access.js` + default-deny middleware + `api/me` + `api/admin/*`), concurrency
  lease (cap 3), admin console. Then Phase III (user settings incl. theme = overrides light-only rule).

## Doc drift to fix when convenient
- `workshop/README.md` "Known limits" + `wrangler.toml` comment still say per-user *tokens* in places
  and "stable named tunnel workshop.kitbord.com" — actually signed tokens + still the churny quick
  tunnel (`eye-recruiting-views-kingston.trycloudflare.com`). `DEFAULT_VM_URL` still that quick tunnel.
- CLAUDE.md still says single-`coder` / "Auth: None" — now multi-user isolation + CF Access.

## Open Questions / Blockers
- Proactive-during-proactive is best-effort: a second proactive event while one is streaming is dropped (not queued). Rare (human-paced) but a learner-prompt could in theory be lost behind a still-streaming trust/permission turn. Left as best-effort; revisit only if observed.

## Temporary Notes
- Custom domain coursework.kitbord.com is behind CF Access (deliberate, see decisions.md) — in-app same-origin fetches carry the cookie and work; out-of-band curl 302s to the Access login. Test Functions against the pages.dev deploy URL to bypass Access.
- DEFAULT_VM_URL still the interim quick tunnel; flip to workshop.kitbord.com when the named tunnel is up.
