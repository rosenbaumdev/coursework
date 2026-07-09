# Archived Phase A–P project log

> Salvaged from the pre-reconciliation `main` branch on 2026-07-08, when `main` was
> archived and re-aligned to the coached-session line. This is historical narrative
> (CF migration Phases A–P + the original 'Phase Q: CF Access' security note).
> Full main history is preserved at git tag `archive/main-2026-07-08`.

---

# Coursework Tracker — Session State
Last updated: 2026-06-15

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
