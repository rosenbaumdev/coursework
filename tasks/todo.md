# Status (rolling)

Active phase: **Multi-tenant path-per-student on coursework.kitbord.com.** Replaces the prior subdomain-per-course design. Jordan moves from `jordan-sports-betting.kitbord.com` to `coursework.kitbord.com/jordan`; new student `contentcreator` lives at `coursework.kitbord.com/contentcreator`. Single Pages project, single R2 bucket, single mirror repo with per-course storage prefixes.

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
