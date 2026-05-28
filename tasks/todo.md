# Status (rolling)

Active phase: **Phase 5 — CF-native migration.** Tunnel + jserver-Express stack is being retired. App moves to Cloudflare Pages + Functions + R2, gated by Cloudflare Access on /dad.

## Decision inputs (locked in this session, 2026-05-28)
- Repo: **reuse `rosenbaumdev/coursework`** (app code joins the existing mirror repo, app at root, day-N/ folders coexist with src/ etc.)
- Auth on /dad: **Cloudflare Access by email** (joalro@yahoo.com)
- Tunnel: retired after Pages is live. cloudflared on jserver stops, DNS repoints to Pages.
- Express on jserver: retired. Backend logic moves into Pages Functions.

## Architecture target
- **Frontend:** Cloudflare Pages, builds `rosenbaumdev/coursework` repo (Vite → `dist/`)
- **API:** Pages Functions
  - `functions/api/assets/index.js` — GET (list R2 objects → manifest)
  - `functions/api/assets/[dayId].js` — POST (upload to R2, optionally mirror to GitHub)
  - `functions/api/assets/[dayId]/[category]/[filename].js` — DELETE
  - `functions/files/[[path]].js` — GET (proxy R2 object as response stream)
- **Storage:** R2 bucket `coursework-assets`, keyed `day-<id>/<category>/<filename>` (same scheme as filesystem, easy migration)
- **GitHub mirror:** stays. Worker calls GitHub Contents API (no git CLI, no `~/.coursework-mirror-clone/`). PAT lives in Worker secret.
- **Auth:** Cloudflare Access policy on `coursework.rosenbaum.us/dad*` AND `/api/assets/*` (POST + DELETE methods). GET on `/api/assets` and `/files/*` stays public so Jordan's view works.
- **Domain:** `coursework.rosenbaum.us` DNS repoints from tunnel CNAME → Pages.
- **localStorage:** unchanged.
- **Coursework MD parsing:** unchanged.

## Migration steps

### Phase A — Setup (some irreversible; check in before each)
- [ ] `wrangler login` (user does interactively via `! wrangler login`)
- [ ] Create R2 bucket: `wrangler r2 bucket create coursework-assets`
- [ ] `git init` in `projects/coursework/`, add remote `git@github.com:rosenbaumdev/coursework.git`
- [ ] Fetch existing mirror content (`git fetch`, examine main branch — day-0/, README.md)
- [ ] Verify app code at repo root won't collide with existing mirror layout (day-N folders coexist with src/, public/, etc.)

### Phase B — Backend rewrite (Pages Functions)
- [ ] Create `functions/` directory with the four endpoints listed above
- [ ] Reimplement upload handler: parse multipart, validate extension, write to R2 binding
- [ ] Reimplement GitHub mirror as Contents API call (octokit-free, just fetch + PAT)
- [ ] Reimplement manifest builder: `R2.list({ prefix: 'day-' })` → grouped JSON
- [ ] `/files/*` Function: `R2.get(key)` → stream with content-type
- [ ] Local dev: replace `npm run server` with `wrangler pages dev`. Update `npm run dev` story.

### Phase C — Asset migration
- [ ] Bulk upload existing `storage/day-0/*` to R2: walk dir, `wrangler r2 object put`
- [ ] Verify manifest endpoint returns same shape as before

### Phase D — Deploy
- [ ] Push to `rosenbaumdev/coursework` (initial app branch, then merge to main once Pages is wired)
- [ ] Create Pages project in CF dashboard, connect to repo, build command `npm run build`, output `dist/`
- [ ] Bind R2 bucket to Pages project as `ASSETS` env binding
- [ ] Add Worker secret `GITHUB_PAT` (copy from `~/.coursework-github-token`)
- [ ] Add Worker secret `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` (or hardcode)
- [ ] Add Cloudflare Access policy: applications → coursework.rosenbaum.us/dad* + /api/assets/* (POST,DELETE), allow email joalro@yahoo.com
- [ ] Custom domain: add `coursework.rosenbaum.us` to Pages project. CF auto-manages DNS (replaces tunnel CNAME).

### Phase E — Cutover + decom
- [ ] Verify Pages serves the app at coursework.rosenbaum.us
- [ ] Verify /dad triggers CF Access login
- [ ] Verify upload → R2 → manifest round-trip works
- [ ] Verify claude-prompt mirror still syncs to GitHub
- [ ] Verify existing claude.ai raw URLs (rosenbaumdev/coursework/main/...) still resolve
- [ ] Stop cloudflared on jserver
- [ ] Stop Express on jserver
- [ ] Delete `server/` directory, `~/.coursework-mirror-clone/`, `~/.coursework-mirror-state.json`
- [ ] PAT migration: secret now lives in Worker. `~/.coursework-github-token` deletable (keep as backup until verified).

### Phase F — Doc cleanup
- [ ] Update CLAUDE.md: backend section, scope rules (R2 in scope, tunnel out), dev command, auth model, project structure
- [ ] Update `tasks/decisions.md`: supersede the "Public exposure via Cloudflare Tunnel" + "Backend added (Express)" entries with new CF-native decision entry
- [ ] Update `tasks/state.md` for session-end
- [ ] Update memory: project_active_processes, project_arch_gotchas, reference_infra

## Risks & open questions
- **R2 free tier:** 10 GB / 1M Class A / 10M Class B ops per month. Current 22 MB + maybe 10 uploads/mo → way under. Fine.
- **Pages free tier:** unlimited bandwidth, 500 builds/mo, 100k Function invocations/day. Fine.
- **Cloudflare Access free tier:** 50 users. Fine.
- **Cutover downtime:** when DNS swaps from tunnel → Pages, ~minutes. CF DNS TTL low. Acceptable.
- **Existing claude.ai raw URLs:** same repo, same paths → unchanged. ✅
- **GitHub PAT scope:** currently Contents R/W on `rosenbaumdev/coursework`. Same scope works for API. No rotation needed.
- **Open question:** does Pages Functions support multipart upload parsing natively? Worker runtime has `request.formData()` — yes. Need to verify max body size (Pages free is 100 MB request body, matches current Multer limit).
- **Open question:** GET on `/api/assets` is currently public on tunnel. Stays public on Pages? Yes — Jordan's view needs to read manifest. Only the mutating routes go behind Access.

## Out of scope for this phase
- Engagement tracking (deferred; still pending from old roadmap)
- Username/password login (CF Access replaces this need for /dad; Jordan side stays open)
- Sub-day content additions (independent work, can happen anytime)
- launchd persistence on jserver (entire jserver runtime goes away)

---

## Prior context (kept for reference)

### What was deployed pre-migration
- App at https://coursework.rosenbaum.us (Cloudflare Tunnel → jserver:4174 Express)
- /dad/files CMS with drag-drop, auto-category-detect, claude-prompt category
- ClaudeLauncher: "Open in claude.ai" + "Copy full prompt" per prompt
- GitHub mirror auto-syncing claude-prompt files via git CLI
- Sub-day data model + nested UI

### Old pending (now mostly obsolete)
- ~~launchd plists for Express + cloudflared~~ — both being retired
- Phase 3 (auth + engagement) — auth half handled by CF Access for /dad; engagement tracking still pending
