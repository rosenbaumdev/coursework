# Coursework Tracker — Session State
Last updated: 2026-07-08 (Phase I shipped)

## Completed This Session (Phase I — signed rotating workshop tokens)
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

## In Progress
- (none) — Phase I + all UI fixes deployed. Phase II-1/II-2 shipped (authz dark, registry overlay).

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
