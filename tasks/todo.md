# Status (rolling)

Active phase: **Multi-course + domain migration to kitbord.com.** Jordan's course (Sports Betting AI) moves from `coursework.rosenbaum.us` → `jordan-sports-betting.kitbord.com`. New course `content-creator` set up at `content-creator.kitbord.com` from the same codebase.

## Decision inputs (locked 2026-06-02)
- Multi-course model: **subdomain-per-course** (separate Pages project per course)
- Slug for current course: `jordan-sports-betting`
- Slug for new course: `content-creator`
- Mirror repo: **reuse `rosenbaumdev/coursework`** with `GITHUB_PATH_PREFIX` per course (Jordan's existing files at root → migrate to `jordan-sports-betting/`)
- R2: **separate bucket per course**. Jordan keeps `coursework-assets`. New: `coursework-content-creator`.
- App code: **one repo, one branch, env-driven** (per-Pages-project env vars). Both courses' MDs ship in every build (minor leakage acceptable; mirror repo is public anyway).
- Domain: `kitbord.com` zone already at CF.

## Architecture target

### Per-Pages-project env vars (set in dashboard)
| Var | Jordan | Content Creator |
|---|---|---|
| `VITE_COURSE_SLUG` | `jordan-sports-betting` | `content-creator` |
| `VITE_STUDENT_NAME` | `Jordan` | TBD |
| `VITE_COURSE_TITLE` | `Sports Betting AI` | TBD |
| `GITHUB_PATH_PREFIX` | `jordan-sports-betting/` | `content-creator/` |
| `GITHUB_PAT` (secret) | same | same |
| `STORAGE` (R2 binding) | `coursework-assets` | `coursework-content-creator` |

### Repo layout
```
public/
  jordan-sports-betting.md   ← Jordan's course content (rename of coursework.md)
  content-creator.md         ← new course (to author from briefs after infra)
functions/
  _shared.js, _github.js     ← read env.GITHUB_PATH_PREFIX, RAW_BASE composed dynamically
  api/assets/...             ← unchanged structure
src/
  App.jsx                    ← fetch `/${VITE_COURSE_SLUG}.md`
  components/Header.jsx      ← title from VITE_STUDENT_NAME + VITE_COURSE_TITLE
  components/ClaudeLauncher.jsx  ← prompt template parameterized
  components/NotesThread.jsx ← author label parameterized
```

### Domain map
| Hostname | Pages project | Status |
|---|---|---|
| `coursework.rosenbaum.us` | `coursework` | detach |
| `jordan-sports-betting.kitbord.com` | `coursework` (rename project later) | attach |
| `content-creator.kitbord.com` | NEW Pages project | create + attach |

## Migration steps

### Phase G — Multi-course refactor (code)
- [ ] `src/App.jsx`: fetch `/${VITE_COURSE_SLUG}.md` instead of hardcoded `/coursework.md`
- [ ] `src/App.jsx`: replace `'jordan'` note author with `'student'`
- [ ] `src/components/Header.jsx`: read `VITE_STUDENT_NAME` + `VITE_COURSE_TITLE`
- [ ] `src/components/ClaudeLauncher.jsx`: parameterize prompt with VITE vars
- [ ] `src/components/NotesThread.jsx`: rename `isJordan` → `isStudent`, label from env var
- [ ] `index.html`: generic title; React sets document.title from env var on load
- [ ] `package.json`: rename `jordan-coursework` → `builder-coursework`
- [ ] `functions/_shared.js`: `GITHUB_OWNER`/`GITHUB_REPO` still hardcoded (constant), but `RAW_BASE` becomes a function `rawBase(env)` that includes `GITHUB_PATH_PREFIX`
- [ ] `functions/_github.js`: read `env.GITHUB_PATH_PREFIX`, prepend to all paths
- [ ] `functions/api/assets/[dayId].js`: pass env into mirror calls, compose raw URL with prefix
- [ ] `functions/api/assets/[dayId]/[category]/[filename].js`: pass env into mirror calls
- [ ] `functions/api/assets/index.js`: compose `mirror.url` with prefix
- [ ] Verify build still passes

### Phase H — Migrate Jordan's existing data
- [ ] Rename `public/coursework.md` → `public/jordan-sports-betting.md`
- [ ] GitHub mirror migration: clone `rosenbaumdev/coursework`, move `day-*/` to `jordan-sports-betting/day-*/`, commit + push. (Existing claude.ai project system prompts pointing at raw URLs will need updating once-off — short list since most uses are session-specific.)
- [ ] R2: no migration needed — Jordan's bucket `coursework-assets` keeps existing paths. The Pages project's `GITHUB_PATH_PREFIX` env var handles only GitHub.

### Phase I — Domain swap for Jordan (rosenbaum.us → kitbord.com)
- [ ] Pages project `coursework`: set env vars (Phase G) in dashboard → production
- [ ] Pages project `coursework`: attach custom domain `jordan-sports-betting.kitbord.com` (via API or dashboard)
- [ ] kitbord.com DNS: ensure no conflicting record on `jordan-sports-betting` (probably none)
- [ ] Detach `coursework.rosenbaum.us` from Pages
- [ ] Delete the `coursework` CNAME on rosenbaum.us in DNS
- [ ] Rename Pages project from `coursework` → `coursework-jordan-sports-betting` (cosmetic; optional but disambiguates)

### Phase J — Set up Content Creator Pages project
- [ ] Create Pages project `coursework-content-creator` pointing at same repo
- [ ] Create R2 bucket `coursework-content-creator`
- [ ] Set env vars in Pages dashboard (VITE_COURSE_SLUG=content-creator, VITE_STUDENT_NAME=TBD, VITE_COURSE_TITLE=TBD, GITHUB_PATH_PREFIX=content-creator/)
- [ ] Set R2 binding `STORAGE` → `coursework-content-creator`
- [ ] Add GITHUB_PAT secret (reuse the existing PAT)
- [ ] Attach custom domain `content-creator.kitbord.com`
- [ ] Deploy from main

### Phase K — Cloudflare Access (both subdomains)
- [ ] Add Access app: `jordan-sports-betting.kitbord.com/dad*` + `/dad` → email allowlist `joalro@yahoo.com`
- [ ] Add Access app: `jordan-sports-betting.kitbord.com/api/assets/*` → same allowlist
- [ ] Add Access app: `content-creator.kitbord.com/dad*` + `/dad` → same allowlist
- [ ] Add Access app: `content-creator.kitbord.com/api/assets/*` → same allowlist
- [ ] Delete any leftover Access apps on `coursework.rosenbaum.us` (if they were created earlier)

### Phase L — Author + upload Content Creator content
- [ ] Receive 15 instructor briefs from Jonathan
- [ ] Author `public/content-creator.md` with 16 day entries (Day 0 + Days 1-15) extracting title/description/week/body from each brief
- [ ] Upload each brief as `claude-prompt` via the new Pages API → R2 + GitHub mirror to `content-creator/day-N/<file>`
- [ ] Verify manifest, raw URLs, ClaudeLauncher

### Phase M — Cleanup + docs
- [ ] Delete `server/` directory (no longer needed since Pages cutover)
- [ ] Delete `~/.coursework-mirror-clone/` and `~/.coursework-mirror-state.json` (Worker handles mirror now)
- [ ] Update CLAUDE.md: multi-course architecture, env vars, per-project bindings, both domains
- [ ] Update tasks/decisions.md: add multi-course design decision + supersede old single-course assumptions
- [ ] Update tasks/state.md
- [ ] Update auto-memory: project_active_processes, project_arch_gotchas, reference_infra

## Risks + open questions
- **localStorage stranded on old domain**: per-domain isolation means notes + completions on `coursework.rosenbaum.us` won't follow to `jordan-sports-betting.kitbord.com`. Few notes exist; option is to manually re-add anything Jonathan cares about post-cutover, or accept the loss.
- **Existing Claude.ai project system prompts**: any prompt referencing `raw.githubusercontent.com/rosenbaumdev/coursework/main/day-N/<file>` will 404 after Phase H. Mitigation: update prompts post-migration; ClaudeLauncher generates fresh URLs each session.
- **Other course MD leakage**: both courses' MDs ship in every Pages build (different bandwidth concern is negligible). If course content should be private later → branch-per-course or private repo.
- **Subdomain-per-course doesn't scale past ~5 courses** without irritating dashboard work. Path-per-course refactor available later if needed.

## Out of scope this phase
- Path-per-course refactor (deferred unless multiple students materialize)
- Per-student authentication for student view (still wide open; CF Access only gates /dad)
- launchd persistence on jserver (jserver runtime gone)
- Engagement tracking
