# Status (rolling)

## 🎯 Day 2: force real, self-prompted improvements (2026-07-09) — IN PROGRESS
Goal (all noob learners; pack keyed by course so one edit hits everyone): Day 2 must push learners to
become CREATIVE and to PROMPT Claude Code themselves, not copy-paste the Director's prompts.
Confirmed design (w/ Jonathan):
- BAR: ship ≥3 improvements they drive, ≥2 FUNDAMENTAL (change how it WORKS, not just looks); 5 = "going
  for it", never a trap. Protect the Day-1 "leave grinning not grinding" ethos.
- TIERS: fundamental = non-rect holes, hills/valleys, physics, moving obstacles, variable hole count,
  tunnels. Juice = ball color, sound, start/end screens, win/lose fx, transitions, animations. Hard
  stretch (bonus, not required) = multiplayer, hole designer, cross-session saves.
- AUTHORSHIP = graduated resistance (NOT a hard wall): Director may hand a copyable/fenced prompt for the
  FIRST BUILD + ONE first improvement (a model). After those two, DEFAULT to NOT emitting a copyable
  prompt block — coach + offer wording inline to steal; only produce one if explicitly asked, resistance
  GROWS as the session goes on. Reuse the existing LEARNER'S OWN PROMPT proactive coaching.
- NOVELTY EXCEPTION: help ebbs/flows with novelty, not the clock — if the learner reaches for something
  genuinely hard/new (cross-session saves, DB, multiplayer, cross-user), help ramps back UP incl. terminal
  setup. Cross-DAY escalation is out of scope (future packs).
- MENU → chips (prod only after self-discovery stalls); no new canvas figure (keep focus on live workshop).

Changes to functions/_sessionPacks.js ZACHARY_DAY_2:
- [ ] objectivesMd build section: build.first (R) + build.imp1/imp2/imp3 (R, ≥2 fundamental across them,
      evidence = learner's OWN prompt) + build.imp4/imp5 (B, imp5 may be a hard stretch). Replaces
      build.mine/juice/hole2. Update ship.replayable/wrap.next wording.
- [ ] canvasDefaults: remap build.mine/juice/hole2 → build.imp1..5 (all → workshop.build).
- [ ] masterPrompt MOVEMENT 4: rewrite FRAME THE MANDATE (make-it-yours) + STEP 5 (loop → improvements
      mandate + self-discovery→chips + looks-vs-works + hand-off/resistance + novelty exception) + the two
      "HOW TO WORK" lines (reconcile "keep bar low" with the new 3-improvement bar).
- [ ] budget 70/75 → ~100/100 (self-authoring is slower).
- [ ] Verify: validateSessionPack passes, objectives parse, ids match canvasDefaults; build.
NOTE: new prose uses neutral "the learner/they" (legacy pack prose still he/him — neutralize at per-learner
authoring). Content-only change (not a name) → applies to all noob learners automatically.

## 🔒 Enforce per-learner isolation (AUTHZ flip, 2026-07-09) — DEPLOYED + VERIFIED LIVE
DEPLOYED (2 deploys: enforcement, then a caching-bypass fix). VERIFIED LIVE on the no-Access pages.dev
alias: /<slug>/api/* + /<slug>/files/* + /api/admin/* → 401 for anon (fail-closed, body {"error":"Not
signed in"}, no-store); /api/me + shell/static → open. Repeated plain GET stays 401 (no cacheable 200).
CACHING BYPASS (found during verify, FIXED): jsonResponse set no cache-control + /files set
`public,max-age=300`, so CF shared-cached GETs by URL (not identity) and served a cached 200 PAST the
gate (observed live). Fix: `_middleware.js` forces `no-store` on ALL /api/* + /<slug>/api/* responses
(post-next wrap); files route → `private,max-age=300` (browser-cacheable, never shared). isApiPath added.
Authed ALLOW-path (jodi loads /jodi, admin all) is logic-verified only (19/19 + 10/10 unit) — can't mint
real Access JWTs; worth eyeballing jodi's login once. STILL UNCOMMITTED in git.
- HTML-ROUTE GAP (reported: "acme can reach /zachary"; FIXED + deployed): the gate only covered
  /<slug>/(api|files); the bare /<slug> + /<slug>/session HTML routes were open, and the SPA renders a
  learner's course SHELL from the STATIC client bundle (src/students.js ships all code seeds) + the PUBLIC
  course md — no gated API needed. Fix: `learnerScope(path)` (first segment = known learner via getStudent);
  enforceAuthz now gates learner HTML too → owner/admin ALLOW, else REDIRECT to their own course (data paths
  still JSON 403/401). Added `accessAction()` (pure, exported, 19/19 unit). no-store wrapper extended to
  learnerScope paths so a cached shell can't bypass the redirect. VERIFIED LIVE (pages.dev, anon): /zachary +
  /jordan + /contentcreator + /acme + /jodi + /test-user all → 401+no-store; /, /dad, /admin, assets, /api/me
  → 200. (First probe showed /zachary=200 = edge propagation lag; consistent 401 after.)
- NOTE (minor, not fixed): the static client bundle still lists code-seed learners' names/course titles, and
  the course template md (/zachary-noob-...md) is public (shared across learners on that course). Route is
  hard-blocked now; residual is only that the JS bundle mentions other learners exist. Follow-up if it matters:
  fetch the owner's config from /api/student instead of shipping all seeds in the bundle.
Ask: each user sees ONLY their own course (jodi's Google account → /jodi only, etc.). Big issue:
enforcement was DARK (AUTHZ_ENFORCE unset) so past CF Access anyone could read any /<slug>/api/*, AND
the pages.dev alias (no CF Access) served /<slug>/api/* to the open internet.
- ROOT CAUSE: learner data APIs don't self-gate; they relied on a middleware default-deny gated behind
  AUTHZ_ENFORCE (off). Admin APIs already self-gate (requireAdmin) — not affected.
- GAP FOUND + FIXED: /<slug>/files/* (course materials from R2) is NOT under /api so the old gate missed
  it. New gate covers /<slug>/(api|files)/* uniformly.
- CHANGES: `_middleware.js` — extracted pure `authzDecision(path,id)` + `isGatedPath`; gate now
  api+files. `wrangler.toml [vars] AUTHZ_ENFORCE="1"` (version-controlled, remove line to disable).
- MODEL: identity from verified CF Access JWT (`_access.js`); courses = email→slug grants in R2
  admin/access.json; admins = BOOTSTRAP_ADMINS ∪ grants.admins → courses ['*']. Fail-closed.
- LIVE GRANTS (verified from prod R2): jnwearne@gmail.com→jodi, astarr@kitbord.com→acme. Admin=jonathan
  via BOOTSTRAP_ADMINS. So jodi/acme keep working, isolated; admin reaches all.
- ⚠ ROLLOUT RISK RESOLVED (2026-07-09): zachary + jordan self-login (zachary@rosenbaum.us,
  jordan@rosenbaum.us). Added their grants to prod R2 admin/access.json (verified read-back: 4 grants —
  acme, jodi, zachary, jordan). Additive write while enforcement still dark → no effect until deploy, no
  lockout window. test-user/zachary-test/contentcreator remain admin-only (fine).
- VERIFIED: 19/19 authzDecision unit assertions (jodi↔acme mutually blocked on api+files; anon/pages.dev
  →401; admin→all; non-admin→admin 403; shell/assets/me/course-md open). NOT deployed; can't mint real
  Access JWTs so the authed happy-path is logic-verified, not browser-driven.
- NEXT: user deploys (`npm run deploy`); confirm zachary/jordan don't self-login (or grant them); then
  verify live: pages.dev/<slug>/api/student → 401 (was 200). Optional: widen CF Access policy now that
  app-authz isolates.

## 📦 Per-learner authored day-packs (deferred from names/pronouns work, 2026-07-09) — TODO
WHY: `getSessionPack` keys packs by COURSE, and the invite flow (`findCourseTemplate` in `_students.js`)
makes every new learner INHERIT the template's authored day-packs. So acme (invited on
noob-to-ai-entrepreneur) runs ZACHARY_DAY_1/DAY_2 verbatim — its Day-2 opener recites "the AI investing
translator, the simplified transy you decided yesterday," which is Zachary's decision, not acme's. The
{{name}} token + neutral pronouns fix (shipped separately) fixes the NAME/gender but NOT the substance:
the pack content is authored for Zachary (his interview, his prior-day decisions, his venture).
PROVEN LIVE: acme's /acme/session?day=2 greeted "Zachary — good to see you. Yesterday you made a real
call: the AI investing translator…" (screenshot 2026-07-09).

GOAL: each learner's day content is authored/generated from THEIR OWN profile + prior-day outcomes, not
shared from a course template. Sketch (revisit before building):
- [ ] Pack store keyed by (learner, course, day), not just (course, day) — getSessionPack resolves
      per-learner first, falls back to the course template only for un-authored days.
- [ ] Authoring step: generate a learner's day-pack from their interview profile + prior days' session
      outcomes/artifacts (the same way Zachary's DAY_1/DAY_2 were hand-authored from his profile).
- [ ] Day-N back-references ("yesterday you decided X") must read the learner's ACTUAL Day-(N-1) outcome
      (session/artifacts/report in R2), never a hardcoded prior decision.
- [ ] Invite flow: stop making a new learner silently inherit the template's authored packs; either
      author on demand or gate Day-2+ until authored. (`findCourseTemplate` shares mdFile too — decide
      whether display md is per-learner as well.)
- [ ] The {{name}}/pronoun personalization stays correct for whatever authored pack a learner gets.

## 🔤 Names/pronouns key off the learner account (2026-07-09) — DEPLOYED TO PROD
DEPLOYED 2026-07-09 (user ran `npm run deploy` → https://b549845e.coursework-5lg.pages.dev, branch main =
prod). VERIFIED LIVE: prod `coursework-5lg.pages.dev/acme/api/student` returns the new `displayName` field
({"name":"acme","nickname":null,"displayName":"acme",...}) → new code is live. acme→"acme", pronouns unset
→ neutral they. NOTE: acme's EXISTING Day-2 opener is persisted in R2 history — must hit ↻ RESTART to
regenerate from the fixed pack. After restart: greeted "acme" (name fixed) but still recites Zachary's
storyline (deferred to the per-learner-packs TODO above). STILL UNCOMMITTED in git.
Ask: courses must not assume a name. Resolve from account name, or a nickname the learner set
(admin-settable now; learner-facing "persona instructions" UI stays Phase III). Pronouns: default
Ask: courses must not assume a name. Resolve from account name, or a nickname the learner set
(admin-settable now; learner-facing "persona instructions" UI stays Phase III). Pronouns: default
NEUTRAL (they/them) — never assume gender, never prompt the learner; override only when known (admin).

Scope (confirmed w/ Jonathan): Option 1 + neutral pronouns. De-hardcode packs; resolve name from
account (nickname||name); add optional `nickname`+`pronouns` to registry + admin edit/invite + UI.
Honest caveat: noob packs are Zachary's AUTHORED content (his interview/venture) — de-naming stops
mis-naming but does NOT make that pack correct for a different learner. Flagged, not solved here.

Findings (verified): runtime AI already injects account name at every seam (_session.js:835 Director,
:1412 Observer, _interview base/envelope/profile, ClaudeLauncher). LEAK = _sessionPacks.js noob packs
hardcode "Zachary" in masterPrompt (492,1249,1268), opener (1223,1483), DISPLAYED canvas card (1428);
pronouns he/him hardcoded (486 Day1, 1237 Day2) but routed via single pack.pronouns (97 uses). .md
files are DISPLAY-ONLY (never hit AI): jordan "Jordan" x45, content-creator "she/her" x52 + "the student" x11.
No nickname/settings feature exists (registry stores only name; admin edits name/email/status).

Mechanism: cached pack stays name-agnostic ({{name}} tokens + neutral pronouns); per-request
`personalizePack(basePack, student)` clones with pronouns resolved + {{name}} substituted across
masterPrompt/oneLine/title/entry.context/canvasProgram. Consumers swap after getSessionPack.

- [x] 1. _students.js: displayNameOf() + resolvePronouns() helpers; PRONOUN_SETS {they,he,she} w/ verb forms;
       nickname/pronouns through registryToStudent + applyOverrides.
- [x] 2. _sessionPacks.js: import PRONOUN_SETS; both noob packs → PRONOUN_SETS.they; literal "Zachary" → {{name}}
       (masterPrompt/opener/DISPLAYED canvas card). Only comments name Zachary now.
- [x] 3. _session.js: personalizePack(pack, student) = substituteName deep-clone + resolvePronouns; newLesson
       studentName=displayNameOf. Cached pack stays name-agnostic (proven: cache unmutated after personalize).
- [x] 4. Consumers personalize after getSessionPack: session start.js / message.js / glance.js / canvas.js.
       (artifact.js + admin ask.js render no learner name/pronoun text → left unchanged.)
- [x] 5. _interview.js: newSession studentName=displayNameOf; de-gendered all hardcoded he/him/his → they/their.
- [x] 6. Admin: learner/[slug].js EDITABLE += nickname,pronouns (clearable, pronoun-validated); learners.js
       invite accepts optional nickname/pronouns; both GETs surface them; AdminView invite+edit inputs.
- [x] 7. Client: /api/student.js returns displayName; src/students.js displayNameOf(); ClaudeLauncher +
       NotesThread address by displayName. (App tab title left as account name — a label, not addressing.)
- [~] 8. .md files FLAGGED, not rewritten: display-only (never hit AI); jordan-sports-betting.md is Jordan's
       OWN course; content-creator.md is gendered marketing copy. Full neutralization = a content-authoring
       pass (same caveat as packs: a name token alone doesn't make gendered copy reusable). zachary md already neutral.
- [x] 9. Verified: 20/20 helper+personalizePack unit assertions (incl. cache-not-mutated + displayed canvas card);
       6/6 on the ASSEMBLED model-facing system prompt (right name, no Zachary leak, she→she/her, unset→they/them);
       client build clean; all changed server modules import cleanly (no circular deps).

DONE (code complete, unit-verified). NOT browser-driven end-to-end (bg job) and NOT deployed/committed.
KNOWN cosmetic: neutral 'they' inherits the prompt's third-person-singular verb agreement ("they has/says") —
semantically clear, model-robust, and already the codebase norm (SHOWCASE default pack). Accepted uniformly
rather than a half-fix. PRONOUN_SETS carry be/have forms if a future pass wants full agreement.

---

## 🚀 Automated onboarding + admin console + user settings (2026-07-08) — IN PROGRESS
Full plan: `~/.claude/plans/plan-id-like-elegant-whistle.md`. Goal: invite a learner → auto-create
registry entry (replicate an existing course) → auto-provision the VM user → invite link, with NO
terminal + NO redeploy. Builds on the per-user VM isolation shipped this session (`workshop/`).
Decisions: signed rotating tokens · pull provisioning (R2 queue + droplet root daemon) · shared
platform API key default (BYOK-ready). Capacity: cap = 3 concurrent active sessions on current box.

**Phase I — Rotating (signed) workshop tokens** (code complete 2026-07-08; deploy/verify pending):
- [x] `functions/_workshopToken.js` — `signWorkshopToken` (Web Crypto HMAC); interop with Node verifier PROVEN (6/6 tests)
- [x] `functions/_session.js` `injectLiveSurfaces` — drops per-user `TERMINAL_TOKEN_<USER>`; shared `TERMINAL_TOKEN` fallback only
- [x] `functions/[studentSlug]/api/session/workshop-token.js` — new endpoint mints a fresh signed token per request
- [x] `workshop/bridge/server.mjs` — accepts signed (HMAC + `WORKSHOP_USER` claim + expiry) OR legacy static token (zero-downtime cutover)
- [x] `workshop/provision-user.sh` — writes `WORKSHOP_USER`; no per-user token; shared secret at `/etc/coursework/signing.env`; `coursework-bridge@.service` loads it
- [x] client — `LiveTerminal` fetches a fresh token per (re)connect via `WorkshopCanvas.getWorkshopToken`
- [x] `wrangler.toml` — documents `WORKSHOP_SIGNING_SECRET` (retires `TERMINAL_TOKEN_<USER>`)
- [x] DEPLOY (Jonathan, root+CF): signing.env on droplet + `WORKSHOP_USER` on existing envs + copy server.mjs/service + restart bridges + set `WORKSHOP_SIGNING_SECRET` app secret + deploy app (2026-07-09)
- [x] verify live WS through tunnel — valid→whoami=user, cross-user→4001, expired→4001; PLUS end-to-end with a REAL prod-app-minted token (2026-07-09)

**Phase II — session continuity + admin console + automated onboarding.** Ordered, de-risked build (authz is high-blast-radius, so it ships DARK behind `AUTHZ_ENFORCE` and is flipped only after grants are populated + verified, right before CF Access is widened). Detail in the plan file.

II-1 — Authorization foundation (dark first):
- [x] `functions/_access.js` — identity from VERIFIED Access JWT (Cf-Access-Authenticated-User-Email is NOT forwarded to Pages; JWT is, via cf-access-jwt-assertion header). RS256 sig verified vs team JWKS + aud + iss + exp. Grants store `admin/access.json` in INTERVIEW; `BOOTSTRAP_ADMINS` env; `getIdentity`/`canAccess`/`isAdmin`/`load|saveGrants`. Team=flat-heart-d5af.cloudflareaccess.com, aud=d83de7fb… (env-overridable).
- [x] `functions/api/me.js` — `{email, isAdmin, courses}` (+ `?debug=1` diagnostic)
- [x] `functions/_middleware.js` — dark default-deny behind `AUTHZ_ENFORCE` (one getIdentity call; `/api/admin/*`→admin; `/<slug>/api/*`→admin|granted; `/api/me`+HTML pass; gated+no identity→401). Public game host untouched.
- [x] deployed DARK, `BOOTSTRAP_ADMINS`=jonathan.rosenbaum@gmail.com secret set, PROVEN end-to-end through real Access (isAdmin:true, JWT sig verified) 2026-07-09
- [ ] LATER (coordinated, after II-2): learner access comes from the registry (email→slug), so no hand-maintained grants for existing learners. Then flip `AUTHZ_ENFORCE=1`, verify fail-closed (ungranted email → 403), THEN Jonathan widens the CF Access policy. pages.dev fails closed by design (no Access → anon).
II-2 — Runtime learner registry: [x] SERVER overlay done + PROVEN (2026-07-09) — `admin/registry.json` in INTERVIEW, `primeStudents()` in `_middleware` refreshes a merged map (getStudent stays sync), code seeds win on clash, `loadRegistry`/`saveRegistry` for admin. Tested: a registry-only slug resolved with NO redeploy; code seeds intact. [ ] CLIENT unknown-slug resolution (App.jsx StudentRoute → `api/student` or fold into `me`) — deferred until the first real invited learner exists (build with II-3/II-4).
II-3 — Admin console: [x] READ-FIRST done + deployed (2026-07-09) — `/admin` route + `AdminView.jsx`; `functions/api/admin/{learners, learner/[slug], ask}.js`, all self-gated via `requireAdmin` (verified Access identity, independent of the dark AUTHZ_ENFORCE flag — 403 verified for non-admin). Roster (seeds+registry), per-day progress + parkingLot + Observer read + full transcripts, "ask AI about this learner" (grounded in their R2 session data). [ ] invite/create-learner form (writes registry via saveRegistry + enqueue provision) — pairs with II-4.
II-4 — Pull provisioning (CW triggers, droplet root daemon executes — NO terminal, NO inbound privileged endpoint):
  - [x] APP SIDE (II-4a, tested locally 2026-07-09): `functions/_provision.js` (R2 queue+status), `POST /api/admin/learners` (invite→registry+grant+enqueue create→invite link), `POST /api/admin/learner/:slug/provision` (suspend/resume/deprovision), detail includes provision state, AdminView invite form + VM status pill + action buttons.
  - [x] DAEMON CODE (II-4b): `workshop/provision-daemon.mjs` (root; aws4fetch → R2 S3 API; polls queue, allocates ports, runs provision-user.sh / systemctl / userdel, writes status) + `workshop/systemd/coursework-provisioner.service` + README install steps.
  - [ ] DROPLET INSTALL (Jonathan, root): R2 API token (scoped coursework-interview R+W) → `/etc/coursework/provisioner.env`; copy daemon+script to /opt/coursework; `npm i aws4fetch`; enable coursework-provisioner. See workshop/README.md "Provisioning daemon".
  - [ ] END-TO-END TEST (after install + deploy app): invite from /admin → daemon creates the unix account → learner reaches /<slug> → Day-2 workshop routes to /u/<slug>. Then suspend/deprovision.
II-5 — Session continuity + concurrency lease (cap 3): `admin/leases.json`, acquire in `start.js`, renew in glance/message, release on signoff + TTL; warm/reap; `claude --resume` recovery

**Phase III** — user settings (Director persona, BYOK key, profile, workspace reset, **theme choices**, a11y). Detail in the plan file.

---

## 🎯 Genuinely open, larger (current top of mind — 2026-07-08)
The big remaining workstreams. Detail lives in the sections below; this is the trustworthy at-a-glance list.
- [ ] **#6 — Paste/attach images & files in chat** (multimodal to the model). Not started. Detail: "Multimodal input" section below.
- [ ] **/admin console + default-deny authorization layer.** Marked IN PROGRESS but all sub-items still unchecked (`_access.js`, middleware, me/admin APIs, `AdminView`, 403 UX). CF Access on the whole domain is now LIVE (done 2026-07-08, see decisions.md), so this is the **app-side per-course grant** layer, not the front door. Detail: "/admin console" section below.
- [ ] **#3 — Live annotation overlays / Guide v2** over the scrolling terminal. Explicitly deferred (hard: needs xterm content anchoring). Detail: "Deferred" + "Guide overlay v2" sections below.
- [ ] **Director persona / custom instructions as a per-user/per-course SETTING + admin tools** (2026-07-08). Users (or the admin) set persona/behavior instructions that fold into the Director's system prompt. Belongs on the settings surface of the `/admin` console workstream — build alongside the authz layer.

---

## 🎨 UI polish / attention cues (2026-07-08)
- [x] **Pulsing "Continue to…" chip regression (items 1 & 4).** DONE — added `continue-pulse` to the canvas-side overlay pill (`SessionView.jsx`); the inline chat version already pulsed.
- [x] **Guide overlay chips need contrast (item 3).** DONE — `GuideTip` chips now bright amber (`#febc2e`) + dark border + white outer ring (reads on dark terminal AND light viewer) + `continue-pulse`.

---

## 📝 Day-2 run feedback batch (Zachary, 2026-07-08) — from a full end-to-end test (reached "end")
Triaged by theme; impact-ordered. Fix top-down.

**Quick wins (high-frequency, well-specified):**
- [x] **#1 Chat streaming scroll** — grow-up-then-freeze-at-top: when a reply starts, pin its bubble TOP to the frame top and freeze; text streams downward off the fold; down-arrow reveals below-fold + follows bottom. (`ChatMessages.jsx`) ✅ reinstated.
- [x] **#7/#8 Terminal copy/paste** — ⌘C/Ctrl+Shift+C + right-click copy the selection; ⌘V/Ctrl+Shift+V + right-click (no selection) paste; bare Ctrl-C still SIGINTs when nothing is selected. (`LiveTerminal.jsx`) ✅

**Director-as-live-tutor loop (core pedagogy — PROACTIVE Director turns that react to the terminal stream without a user message):**
- [x] **PROACTIVE TURNS machinery (Phase 1)** — SHIPPED. Client Sentinel (`src/session/terminalEvents.js`, closed event taxonomy + hash-dedupe for TUI repaints) → LiveTerminal `onEvent` (output signal + `onData` learner-line buffer) → ContentCanvas/WorkshopCanvas pass-through → SessionView firing policy → `driver.sendProactive` → `message.js` `kind:'proactive'` lean branch (`handleProactiveTurn`): budget-exempt (proactiveTurns not totalUserTurns), tick-inert, completion-inert, `[PASS]` escape, buffered (no [PASS] flash), synthetic-turn history, server-authoritative `explainedAffordances`. Model = Sonnet 5, max_tokens 700, session cap 20. Engine PROACTIVE-TURNS prompt block (workshop days) + envelope proactive block + affordance ledger in `_session.js`; Day-2 pack NARRATE beat rewritten.
- [x] **#2 (first-time affordances) + #5 (permission prompts) — Phase 1 slice** — permission/trust prompts fire a proactive explanation the moment they appear; affordances explained once (ledger).
- [x] **#4 Watch & critique the learner's own prompting** — SHIPPED (Phase 1 flagship): learner-typed prompts (≥15 chars, not a shell command) fire a real-time critique turn.
- [ ] **#5 rest + #2 rest (Phase 2)** — menu (↑/↓) / error / step-done / wait-narration events; proactive suggestion chips; client-side repeat-decay throttle using the mirrored ledger.
- [ ] **Phase 3 hardening** — Haiku salience prefilter fallback if TUI-regex proves brittle; per-pack affordance extensions.

**Multimodal input:**
- [ ] **#6 Paste/attach images + files in chat** — like Claude/ChatGPT. Upload + attach to the coached-session message; multimodal to the model.

**Ship & clean completion (TOP-PRIORITY per Jonathan — the course payoff):**
- [x] **#9 Ship the game + sign-off gate** — BUILT (pending 1 infra step). Decision: snapshot the self-contained index.html to R2, serve publicly at `play.kitbord.com/<student>/<course>/day-<id>` (outside CF Access → share links work). MANDATORY on this step only (`requiresShip: true` on the Day-2 pack; other days unaffected) — no skip. Backend: `ship.js` (snapshot→R2, sets session.shipped/shippedUrl), `signoff.js` (sets signedOff+completes), `_middleware.js` (serves play.* from R2), gate in `message.js` (`done = baseDone && (!requiresShip || signedOff)`) + `awaitingShip` signal, session fields + start.js resume signal. UI: `ShipCard.jsx` overlay (Ship→link+copy+preview→"I'm happy, finish"), dismissable-to-workshop with a persistent 🚀 banner (anti-trap), wired in `SessionView.jsx`. Director pack STEP 6 drives to ship.
  - **⚠️ INFRA (Jonathan, ~2 min, gates the live link):** add `play.kitbord.com` as a custom domain on the `coursework` Pages project (Pages → Custom domains); confirm the CF Access app is scoped to `coursework.kitbord.com` (NOT `*.kitbord.com`) so `play.*` stays public. Until then ship writes to R2 but the link 404s.

**Deferred (Jonathan said "later"):**
- [ ] **#3 Live annotation overlays** — Director highlights/points to elements in the terminal (or viewer) with clickable, expandable annotations. (Guide v2 over live terminal text.)

---

## 🔑 /admin console + default-deny authorization layer (2026-07-09) — IN PROGRESS
Builds the authz layer we designed (CF Access = identity, app = authorization) + the admin surface.

**Model:** CF Access injects verified `Cf-Access-Authenticated-User-Email`. App holds a grants store (email → course slugs; admins → all). Default-deny, enforced in Functions (the token/data layer). **"Course" (v1) = an existing student slug** (`zachary`, `zachary-test`, `contentcreator`, `jordan`). **Invite = grant an email to a slug**; on first visit CF Access makes them Google-login and the grant matches. Real invite *emails* = phase 2.

**CREATE:** `functions/_access.js` (grants store in R2 INTERVIEW `admin/access.json` + `BOOTSTRAP_ADMINS=['jonathan.rosenbaum@gmail.com']` so we can't lock out + `getEmail`/`getIdentity`/`canAccess`); `functions/api/me.js` (`{email,isAdmin,courses}`); `functions/api/admin/{access,grant,revoke}.js` (admin-only); `src/components/AdminView.jsx`.
**MODIFY:** `functions/_middleware.js` (enforce: `/api/admin/*`→admin, `/<slug>/api/*`→canAccess or admin, else 403; HTML+assets+`/api/me` pass; fail closed if no email header); `src/App.jsx` (`/admin` route); `SessionView.jsx`+tracker (render a friendly "no access to this course" state on API 403).

**/admin UI (v1):** courses table (student+title+open+`/‹slug›/dad` link); access/invites (email→courses list, grant form email+course dropdown, revoke, pending-invite hint + copy-link); legacy admin links to `/‹slug›/dad`; roadmap section.

**Deploy coordination (no open window):** (1) deploy default-deny middleware+APIs+/admin (fails closed → nothing opens); (2) THEN Jonathan widens CF Access policy from the 2-email allowlist to **Allow → Everyone**; until then the allowlist still protects everything.

**Roadmap — other admin features (not v1):** manage admins from /admin; provision a new course/tenant (new slug+config+R2, removes students.js hand-edit); per-student progress/activity view; real invite emails (Resend/MailChannels); per-student workspace isolation (agreed, keys off this login); revoke/reset a student's day.

**Progress:** [ ] _access.js  [ ] middleware  [ ] me+admin APIs  [ ] AdminView+route  [ ] 403 UX  [ ] deploy → widen CF (Jonathan)

---

## Session UX / workshop roadmap (2026-07-09)
- [ ] **Proactive / auto-advance Director (event-driven terminal turns).** Today the Director only acts on the learner's messages, though it already SEES the terminal output each turn. Make terminal *milestones* trigger a Director turn without the learner typing: detect `claude` launched → hand the prompt; `index.html` written → "hit reload"; an error → jump in. Musts: milestone detection (not every byte), debounce + "only speak if it moves things forward," cost guard (each trigger is a model call). Bigger engine feature — plan properly. (Interim easy-win DONE: pack rules "READ THE TERMINAL, DON'T INTERROGATE" + STEP-1 "watch the terminal yourself" so it stops asking the learner to confirm what it can see.)
- [ ] **Guide overlay v2** — outline elements INSIDE the live terminal text (e.g. "this line is Claude writing your file"). Harder than v1 (fixed-pane outlines) because terminal text scrolls/changes; needs xterm content anchoring.
- [x] **Guide overlay v1** — "❔ Guide" toggle in the workshop → glowing outlines + click-to-expand captions on the fixed panes (terminal, viewer). (WorkshopCanvas.)
- [x] **Continue affordance under the chat + pulse** — wide VP now shows the pulsing Continue bar under the response (distinct from answer chips), not only the canvas overlay.

---

## Dev batch — Jonathan's 6 open comments (2026-07-07, dev only, HOLD release)
Working on dev; do NOT deploy until this batch is reviewed. Production is already
live at coursework.kitbord.com with the canvas-resolver deploy.
#1–#5 DONE + verified on dev (harnesses 333+184 green, `npm run build` clean).
#6 is design-only, awaiting Jonathan's check-in (touches coursework data).

- [x] **1. Scroll-to-bottom button** (Claude-style): hovering round button, down
      arrow, appears when scrolled up, jumps to bottom + re-arms streaming-follow.
      → `ChatMessages.jsx` (`atBottom` state + floating button).
- [x] **2. `000,000` formatting** (thousands separators). Jonathan: throughout the
      platform — chat + artifacts, NOT code windows. → new `src/lib/format.js`
      (`withThousands` / `commaFormatMarkdown`, skips fenced/inline code + years);
      wired into `Bubble.jsx` (chat) + `ArtifactCanvas.jsx` (memo preview). Figures
      already handled by `fmtFigureValue`.
- [x] **3. Streaming scroll — follow the bottom** (Jonathan: "do 2… otherwise 1;
      let's not guess"). Behavior 2 (grow-up-then-freeze-at-top) pushed streaming
      text below the fold = the "broken" report. Switched to follow-the-bottom
      (Claude-style), headless-Chrome verified (ALL PASS). → `ChatMessages.jsx`.
- [x] **4. Thinking indicator** — 3-dot staggered pulse in the assistant bubble
      whenever a cast member is working (streaming OR post-text canvas work).
      Replaced the single caret. → `Bubble.jsx` (`ThinkingDots`).
- [x] **5. Sizing → revenue opportunity.** New `Rev` row on the sizing scoreboard
      (SOM × price × cadence for the project window, assumption stated in-cell).
      → `_sessionPacks.js`: `SCOREBOARD_SPEC.rows` (tam/sam/som/**rev**/gap/gut) +
      masterPrompt "Rev" instruction + memo rubric/objective text. Harnesses updated.
- [x] **6. Values elicitation (bake-off).** DONE on dev (growable-matrix primitive
      + values scorecard + front/tail objectives + VALUES DRIVERS rule; harnesses
      335+199 green, build clean). See decisions.md 2026-07-07 + steps A-F below.
      Z should name his values / non-scale
      qualities to weigh in the arc choice — he won't do it automatically. Put it
      at the FRONT (establish) and TAIL (weigh the pick against them) of the
      scope/choice process. Pack/pedagogy — DESIGN, proposal to Jonathan.
      Touches coursework data structure → check-in required per CLAUDE.md.

### #6 build plan — values scorecard (CHECK-IN CLEARED 2026-07-07)
Jonathan chose: **values scorecard figure** + **global primitive now** (reusable,
not just day-1 hardwired). Dev-only, HOLD release with the rest of the batch.

Reusable engine primitive = **growable-row matrix** (learner-defined rows added at
runtime) + a generic VALUES rule; day-1 objectives instantiate it. Steps:

- [ ] **A. Engine: runtime add-ROW for matrix figures** (the one new capability).
  - `_session.js`: new session field `figureRowAdditions: {}` ({ [baseKey]: [{id,label}] }).
  - `applyFigureValues`: for matrix bases, handle `[FIG: key :: addrow="id|Label"]`
    (parallel to iconrow `add=`): validate id (MATRIX_ID_RE), require spec.growRows,
    cap total rows ≤ 8, dedupe by id → push to figureRowAdditions[base]. Then build
    `validIds` from rows MERGED with additions so same-turn cell writes land.
  - `mergeFigureValues` matrix branch: append figureRowAdditions rows to spec.rows.
  - `figureHash`: include row additions so a new row triggers a canvas frame.
- [ ] **B. Pack: the values scorecard figure** (`_sessionPacks.js`).
  - `VALUES_SPEC`: matrix, `growRows:true`, cols = SAME 3 arc ids as SCOREBOARD_SPEC,
    `rows: []` (learner-filled), cells {}. canvasProgram target `figure.values`.
  - Validation: allow 0-8 rows when `growRows` (currently hard 1-8).
- [ ] **C. Pack: objectives + canvasDefaults + VALUES rule.**
  - FRONT objective `R discuss values.named` (start of §4) — 3-5 non-scale values
    named in his words, each landed as a scorecard row.
  - TAIL objective `R check values.weighed` (§5) — each arc scored 1-5 per value
    WITH him; final pick defended on BOTH axes (sizing numbers + values fit).
  - canvasDefaults: both → `figure.values`.
  - masterPrompt: generic **VALUES DRIVERS** rule (elicit-first, score-at-decision,
    weigh scale AND fit — never let biggest TAM alone decide).
- [ ] **D. Client:** MatrixFigure already renders dynamic rows — verify only; no
  change expected. (Optional 1-5 dot viz deferred — keep number parity, no branch.)
- [ ] **E. Verify:** extend both harnesses (addrow apply/merge/cap/dedupe + envelope
  nudge over dynamic rows + validation of a growRows matrix); `npm run build` clean.
- [ ] **F. decisions.md:** record the growable-matrix primitive + values-scorecard
  pattern as the reusable mechanism (packs instantiate; engine stays generic).

## 🚨 Day-1 pilot trap — Zachary got stuck at the end (2026-07-07) — FIXED (dev) + live session closed
**What happened:** Zachary did the whole day (13/18 objectives incl. decision.defended,
wrap.recap, wrap.next) but the 4 required ARTIFACT gates (3 sizing memos + decision.memo)
never ticked — the ownership verifier refused them (identical-to-draft / rejected-arc memo /
weakness bracket unfilled). `isComplete` never true → the never-orphan backstop appended
"Let's keep going: <sizing objective>" EVERY turn, overriding the Director's own "we're done"
and the learner saying "please stop" 4×. He rage-quit. Root causes: (1) no graceful exit —
required gates the only terminal state; (2) verifier too strict for consolidation memos;
(3) required an owned memo for an arc he REJECTED.

**Fixes (dev, HOLD with batch) — pack 335 / engine 221 green, build clean:**
- [x] **Ownership verifier softened** (`_session.js`) — credits the learner's LIVE work
      (numbers/picks agreed on the boards); lean PASS on close calls; FAIL only genuine
      theater (untraceable/contradictory content, or a rejected-arc memo).
- [x] **Graceful exit** — `detectStopIntent` (`_session.js`, deterministic, tested on
      Zachary's actual messages) + `message.js`: the never-orphan nag is SUPPRESSED when
      the learner signals stop; and a session closes gracefully (`completed` +
      `endedIncomplete`) when they stop after ≥70% of required objectives + past the turn
      floor. Never trap an exhausted learner behind the last gates.
- [x] **Zachary's live prod day-1 closed** — one-time careful write: completed=true,
      endedIncomplete=true, 13/18 ticks preserved. He's unblocked for tomorrow.

**Follow-ups:**
- [ ] **Deploy decision:** his live session is closed, but the ENGINE fix only helps future
      sessions once the held batch ships. Recommend deploying the graceful-exit + verifier
      fixes soon (live-student-facing).
- [ ] **Author day-2** for noob-to-ai-entrepreneur (only `[ZACHARY_DAY_1]` exists — use the
      Course Architect instrument).
- [ ] **Reconsider required-artifact load** (deferred: user chose "soften verifier" over
      "right-size artifacts"). Requiring owned memos for NON-chosen/rejected arcs is still
      pedagogically heavy even with the softer verifier + graceful exit — revisit.

## Adversarial review (2026-07-07) — 12 confirmed / 2 plausible / 1 refuted
Multi-agent red-team (5 dimensions, adversarial verify). No confirmed critical; no
cross-student/R2 leak survived. Full report: scratchpad/ADVERSARIAL_REVIEW.md.

### Fixed this pass (dev, HOLD release with the batch) — harnesses 335+205, build clean
- [x] **#1 (HIGH) artifact-body tag leak** — `_turnCore.js` parseTurn now extracts
      artifact writes + strips artifact blocks FIRST, then runs TICK/TABLE/SHOW/
      FIG/STAGE/SUGGESTED over `stripped`, never raw `text`. Tags drafted inside a
      memo no longer fire as live directives. +6 regression tests.
- [x] **#2 (HIGH) comma formatter corruption** — `src/lib/format.js`: boundary
      classes now reject `/ # _ -` (phones, #refs, snake_ids, URL segments spared);
      `commaFormatMarkdown` masks markdown links + autolinks + bare URLs like code.
      Verified: phones/refs/ids/links unchanged, quantities/$/parens still format.
- [x] **#5 (MED) requested-frame yank** — `useSessionDriver.js` artifact patch
      closures set `requested:false`, so content patches don't re-fire SessionView's
      requested effect and snap a narrow learner off the chat tab.
- [x] **#6 (MED) streaming dead-band** — `ChatMessages.jsx` recomputes `atBottom`
      on content growth when follow is off, so the jump-to-bottom button appears in
      the 5–79px scroll-up band.
- [x] **#11 (LOW) values board empty state** — `FigureCanvas.jsx` MatrixFigure
      renders a muted placeholder row when `rows:[]` (no floating header), bounds
      the label track + break-any so long labels wrap instead of overflowing.

### Tier 2 fixed (2026-07-07, dev, HOLD) — harnesses 335+211, build clean
- [x] **#3 (MED) Stagehand cost cap** — `_session.js` runStagehand now increments
      `stageBuildCount` at the TOP (counts the attempt before spending calls), so
      failed builds count toward `STAGE_MAX_BUILDS`; `buildNo` names the key.
- [x] **#4 (MED) 409 stale canvas** — `useSessionDriver.js` applyStartPayload sets
      the canvas directly + clears pending (a start payload is authoritative), so a
      resync displays the server canvas instead of queuing it behind a Continue pill.
- [x] **#7 (MED) nested-bracket leak** — `_turnCore.js` replaced the depth-1
      TABLE_RE/FIG_RE with `extractBalancedTags` (bracket-depth scan → any depth).
      Deeper fix: TABLE/FIG spans are removed BEFORE TICK/SHOW/STAGE/SUGGESTED
      extract, so a tag quoted inside a note never fires. +2 regression tests.
- [x] **P1 (MED) SAY-DO tri-state** — `resolveClaimedTargetLLM` returns
      `RESOLVER_NONE` (ran, no target) vs `null` (outage); `message.js` skips repair
      on NONE, falls back to the deterministic resolver only on outage — no forced
      canvas yank on a purely referential mention.

### Remaining review findings (follow-up, not yet done)
- [ ] #8 (LOW) ownership verifier fails open (`pass:true` on parse error) + learner-
      controlled text interpolated raw into the Haiku judge (`_session.js:458`).
      Fix: fence the verifier input; fail CLOSED (or neutral "unverified") on parse
      error for artifact objectives. Pairs with the CF Access / report-writer phase.
- [ ] #9 (LOW) foldHistory summary is a persistent injection channel — a learner
      line that survives summarization re-enters the Director prompt every turn
      (`_session.js:927`). Fix: fence the transcript chunk; summarize facts only.
- [ ] #10 (LOW) discuss-objective ticks have no evidence gate (`_session.js:201`) —
      by design ("Model tick OK"); revisit only if discuss ticks need auditing.
- [ ] #12 (LOW) autoAdvanceShownFigureStep ignores matrix column steps
      (`_session.js:399`) — latent (no authored stepped matrix). Fix if/when a
      Stagehand-built stepped matrix ships.
- [ ] P2 (PLAUSIBLE/LOW) Scribe has no deterministic provenance check on landed
      values (`_scribe.js:186`) — model-gated, self-only. Fix: require instructor
      corroboration or mark Scribe values provisional.
- [ ] #9 (LOW) foldHistory summary is a persistent injection channel.
- [ ] #10 (LOW) discuss ticks ungated (by design — revisit with report-writer).
- [ ] #12 (LOW) autoAdvanceShownFigureStep ignores matrix column steps (latent).
- [ ] P1 (PLAUSIBLE) SAY-DO backstop can't distinguish resolver NONE from error
      (`message.js:310`) — give the LLM resolver a tri-state result.
- [ ] P2 (PLAUSIBLE) Scribe has no provenance check on landed values (self-only).

## BACKLOG (pending — not yet started)

### Feedback loop → creator-reviewed recursive self-improvement

**What:** Any in-session learner comment about the app/platform itself — a complaint, a question about how something works, a "why can't I…", a "it'd be better if…", or an observed friction/bug — should be captured into a durable feedback channel for the creator (Jonathan) to review later and decide whether to act on.

**Two layers:**
1. **Capture (mostly built):** the Director already has the `FEEDBACK CAPTURE` rule — it parks such comments verbatim via `[TABLE: tangent :: FEEDBACK: "…"]` and tells the learner their suggestion reaches the course architect. Remaining work: these parked items must land in a **single reviewable surface for the creator** (session report section + a dashboard aggregation across sessions/students), not just buried in per-session JSON. This ties into the Step-5 durable-record/report-writer work.
2. **Propose (new):** the system should go beyond logging — it should periodically synthesize accumulated feedback + observed pilot failures into **concrete proposed improvements** (engine rules, pack edits, UX changes), each presented to the creator for **explicit approval before anything ships** — the same human-on-the-loop, propose-then-approve pattern I use here. This is the "recursive self-improvement, human-gated" north-star loop noted in the plan; this makes it a real deliverable rather than a doc footnote.

**Why:** learners who know they're heard give better signal; and the creator can't manually review every session — the system should surface *what to consider changing*, with the human retaining the accept/reject decision.

**Guardrails:** proposals are suggestions only — never auto-applied. Approval is required per change. Keep the reviewable surface deduped and ranked (recurring complaints first).

**Cross-links (for the implementer):** the capture half is the `FEEDBACK CAPTURE` rule in `functions/_session.js` (parks to `[TABLE: tangent :: FEEDBACK: …]`); the reviewable-surface + propose halves belong with the Step-5 report-writer and the creator dashboard — build them there, not standalone. Related in-session invariant already landed this session: the `NO UI COACHING` rule (same file) — a Walker check-target when that QA agent is built.

---

## Phase T.4i — Contents Menu (self-navigation) + SCRIBE (new cast member) — COMPLETE (2026-07-07)
Two green-lit builds fixing "Director as single point of failure": the learner
was stuck wherever the Director chose to steer, and a value the Director
talked through without tagging just silently never landed on the canvas.

- [x] **BUILD 1 — Contents Menu (client-mostly, one read-only endpoint).**
  - `functions/_session.js`: new `buildCanvasCatalog(pack, session)` — titles/
    types only (never full payloads) for every authored `canvasProgram` entry,
    every declared `artifact:<id>` target (from the pack, regardless of
    whether it has content yet), and any session-scoped `dynamicProgram`
    (Stagehand) entries. `resolveFigureDir` (previously module-private) is now
    exported — it's the exact resolver `[SHOW:]` uses, and is 100% read-only
    (never mutates `canvasTarget`/`figureState`/`figureInstances`/`seq`), so
    it's the correct reuse target for a browse-only resolve.
  - New `functions/[studentSlug]/api/session/canvas.js` — `POST {day, target}`
    → `{ directive }`. Loads the session (read-only) and resolves the target
    via `resolveFigureDir`; never persists, never touches `seq`. A learner
    browsing the menu is never Director intent.
  - `start.js` (both the resume branch and `settleOpener`'s fresh-start
    payload) and `message.js`'s `done` frame all now carry
    `catalog: buildCanvasCatalog(...)` — refreshed every turn since a
    Stagehand build can add a new target mid-session.
  - `src/session/useSessionDriver.js` (`useSSESessionDriver`): new `catalog`
    and `artifacts` state, populated from the start payload and refreshed from
    each turn's `done` frame; both returned from the hook.
  - `src/components/session/SessionView.jsx`: new "☰ Contents" affordance
    beside the existing "‹ History" chip (both the narrow single-row header
    and the wide header) — mutually exclusive popovers (opening one closes
    the other). The list merges the server catalog with anything already
    resolved client-side (history entries, the live canvas, a queued pending
    frame) so runtime-only forms (figure instances, `compare()` ids) are
    reachable too, deduped by id. Picking an item is cache-first: the live
    target snaps any browse override back to live; an already-resolved
    (history/pending) item is reused directly; an uncached authored/dynamic
    target is resolved via one `POST /session/canvas` call. A new
    `browsedDirective` local state generalizes the existing `historyViewId`
    override mechanism (`shownDirective = browsedDirective || historyEntry ||
    liveDirective`; a new `browsing` boolean replaces the old bare
    `historyViewId` checks everywhere — the "Return to current" pill and the
    Continue-nudge suppression both now cover a Contents-Menu browse too).
    SEEN-tracking and `describeCanvas` were already keyed off `shownDirective`
    (T.4e), so they correctly report whatever's actually displayed with zero
    further changes. Artifact catalog entries show a small dot indicating
    whether they're already drafted (from the newly-captured `artifacts`
    driver state — previously sent by the server and silently unused).
- [x] **BUILD 2 — SCRIBE (new cast member).** New `functions/_scribe.js`. A
  per-turn Haiku sweep that lands values the conversation clearly established
  but the Director's own `[FIG:]` missed. Design:
  - Cheap regex prefilter (`mightContainValues` — digits/`$`/`%`) skips the
    network call on ordinary turns; a second free skip when nothing "in play"
    (same candidate priority as the T.4g envelope nudge: focus's canvas
    default, current canvas target, in-progress figures) has any unfilled
    elements.
  - Director-first precedence: message.js/start.js apply the Director's own
    `[FIG:]` values (`applyFigureValues`) BEFORE calling the Scribe, so
    `scribeCandidates`' "unfilled" list already reflects anything the Director
    just landed — the Scribe can only fill gaps, never overwrite.
  - Input to the model: the unfilled element ids + their real labels (row/
    col/ring/etc.), already-filled context, the learner's message, and the
    Director's reply this turn. Output: strict JSON `[{target, id, value}]`,
    validated against the EXACT unfilled-id set per target computed just
    before the call (`validateScribeOutput` — unknown target/id/null value
    dropped, overlong value truncated to 60 chars) — same "typo never
    guessed" discipline `[FIG:]` apply already uses, and it's re-validated a
    second time inside `applyFigureValues` itself (defense in depth).
  - Output feeds straight into the SAME `applyFigureValues` path the
    Director's own tags use (figValues shape `[{key, values}]`), tagged
    `source: 'scribe'` in `transcriptLog`; `autoAdvanceShownFigureStep` and
    the existing values-hash canvas-emit mechanism both then run over the
    Scribe's writes exactly as they do over the Director's, so a Scribe-landed
    value on the showing figure gets a fresh frame with no extra plumbing.
  - Fail-open: any error (network, parse, shape) resolves to `{ figValues: [] }`
    and logs — a Scribe outage never blocks or corrupts a turn.
  - Wired into both settle paths (`message.js` after the turn's own
    `[FIG:]`/auto-advance; `start.js`'s `settleOpener`, for consistency, though
    an opener rarely establishes real values).
  - `_session.js`: new "Cast" comment block in the header naming Director/
    Usher/Stagehand/Scribe (the existing theater metaphor, now written down in
    one place); one new system-prompt sentence in the CANVAS section framing
    the Scribe as a backstop, not a substitute for the Director's own habit of
    emitting `[FIG:]` promptly.
- [x] **Verify:** `node --check` clean on every touched `functions/**/*.js`;
  harnesses extended and green — `session-pack-test.mjs` stayed
  **333/333** (no pack-grammar changes this pass); `session-engine-test.mjs`
  **148 → 184/184** (buildCanvasCatalog shape incl. dynamicProgram inclusion;
  resolveFigureDir export + read-only-ness proof; mightContainValues;
  scribeCandidates incl. Director-first-precedence proof; buildScribePrompt
  shape; validateScribeOutput's full drop/truncate/group matrix;
  runScribeSweep's two guaranteed-no-network-call skip branches, same posture
  as the existing runStagehand hard-cap test; system-prompt Scribe line).
  `npm run build` clean (440.35KB / 136.34KB gzip, +0 deps).
- [ ] Live/screenshot smoke — SKIPPED per the standing owner guard: Zachary's
  live day-1 R2 session must not be reset/smoked. Relied on the harness +
  build, same posture as every T.4* pass before this one.
- **Deviations from the brief:** none structural. The brief's suggested
  wording ("simplest correct: start.js returns catalog...") was followed
  literally for `start.js`; `message.js`'s `done` frame ALSO carries a
  refreshed `catalog` (a small, deliberate extension beyond the literal ask)
  so a mid-session Stagehand build is menu-reachable without forcing a
  restart — titles/types only, so the cost is negligible and nothing in the
  brief's constraints (no full payloads over the wire, no session mutation)
  is violated.

Did NOT touch `lessons/zachary/...` R2 state, `_interview.js`, `_usher.js`
(only its `ensureAsk` pattern was used as the model for a cheap side-call, per
the brief), or the interview/showcase routes.

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

## Phase T.4h — `matrix` figure kind + live SIZING SCOREBOARD (Day 1 rewrite) — COMPLETE (2026-07-06)
Owner design request (live pilot feedback): replace the document-first sizing
flow with a live SIDE-BY-SIDE SCOREBOARD — arcs as columns, TAM/SAM/SOM/Gap/Gut
rows filling in via `[FIG:]` as numbers are agreed in chat; memos become
Director-drafted consolidations FROM the scoreboard that the learner edits (no
retyping). Plan (per CLAUDE.md plan threshold — 4+ files):

- [x] **New figure kind `matrix`** (`functions/_sessionPacks.js`): spec
   `{ cols: [{id,label,sub?,step?}], rows: [{id,label}], cells?: {"colId.rowId":
   value}, steps? }`. Add to `FIGURE_KINDS`; extend `figureElementIds` (cross
   product `colId.rowId`), `mergeFigureValues` (cells object merge — new values
   overlay `spec.cells`), `unfilledFigureElementIds` (any col.row id with no
   cell value), `validateFigureSpec` (cols 2-4, rows 1-8, col label ≤24, cell
   value ≤60, cell keys must reference real col/row ids, new `MATRIX_ID_RE`
   forbidding dots in col/row ids since cell keys join on the dot). Audited: NO
   changes needed in `_session.js` or `_turnCore.js` — `figureElementIds`/
   `unfilledFigureElementIds`/`mergeFigureValues`/`resolveShowTarget`/envelope
   nudge/system-prompt targets line are all already kind-generic; `[FIG:]`
   parsing splits on the FIRST `=`, tolerating dotted ids. Also add `matrix` to
   the Stagehand `STAGE_SCHEMA_SUMMARY` doc-string in `_session.js` (Stagehand
   already accepts any `FIGURE_KINDS` member via `validateFigureSpec`; only the
   prompt's shape description needed the new kind spelled out).
- [x] **Renderer** (`src/components/session/canvas/FigureCanvas.jsx`): new
   `MatrixFigure` — HTML grid (not SVG; real DOM text beats wrapped SVG
   `<text>` for this much prose), col headers (label + sub) across the top,
   row labels down the left, cell values center. Unfilled cell → muted em-dash.
   Generalize `ValueGroup` to accept `as` (default `'g'`, matrix passes `'div'`)
   so the existing value-pop animation/remount trick works in an HTML context
   too — zero new CSS (`.value-pop`/`.fig-enter` already tag-agnostic). Add
   `matrix: MatrixFigure` to `KINDS`.
- [x] **Zachary Day 1** (`functions/_sessionPacks.js`): new shared
   `SCOREBOARD_SPEC` (cols = his 3 slate arcs — `translator`/`gear`/
   `community`, matching `SLATE_SPEC`'s ids — rows = tam/sam/som/gap/gut, cells
   empty, filled live). New `canvasProgram['figure.scoreboard']`.
   `canvasDefaults['sizing.translator'|'sizing.gear'|'sizing.community'|
   'sizing.compare']` → `figure.scoreboard` (replacing the old
   `artifact:sizing.*` defaults — the artifact pane now only appears when the
   Director explicitly consolidates + `[SHOW: artifact:...]`s it). New
   masterPrompt "Sizing rules" section: work the scoreboard live (every agreed
   number → `[FIG: figure.scoreboard :: col.row=value]` same turn, say-do);
   name the arc in every ask (3 columns live in parallel); once a column reads
   complete, consolidate that arc's memo via `[ARTIFACT:]` sourced from the
   scoreboard + `[SHOW: artifact:sizing.<arc>]` same turn — tick gate
   unchanged (edited-after-draft + ownership verifier). Light reword of the 3
   sizing + `sizing.compare` objective `need` text to reference the scoreboard
   instead of an implicit document-first flow.
- [x] **Verify:** `node --check` all touched files clean; extended both
   harnesses (new `matrix` validator accept/reject cases,
   `figureElementIds`/`mergeFigureValues`/`unfilledFigureElementIds` matrix
   coverage, scoreboard canvasDefaults resolve, system-prompt/envelope-nudge
   fire for matrix via the real Zachary pack): `session-pack-test.mjs`
   302→**333/333**, `session-engine-test.mjs` 137→**148/148**; `npm run build`
   clean (436.86KB/135.48KB gzip, +0 deps). Did NOT touch
   `lessons/zachary/...` R2 state, `_interview.js`, `_usher.js`,
   `_turnCore.js`, `SHOWCASE_DAY`, or the `showcase`/`interview` routes.
- [x] Updated `tasks/state.md` + this file with final counts/deviations.

Full detail (audit findings, deviations, exact diffs touched) in
`tasks/state.md` under this same "Phase T.4h" heading.
