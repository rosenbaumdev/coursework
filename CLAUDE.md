# Coursework Platform — CLAUDE.md
*Last updated: 2026-07-09 — serverless multi-tenant rewrite of this doc*

---

## What This Is

A **multi-tenant, fully-serverless Cloudflare Pages app** that runs a 3-week "learn to build with AI"
coursework for multiple learners at once. Each learner lives at `coursework.kitbord.com/<slug>` and has
exactly one course. It began as Jordan's single-tenant progress tracker; it now also runs an AI
ingestion interview, AI-led daily lessons, a live cloud workshop, and an instructor console.

**Three learner surfaces per `<slug>`:**
1. **Tracker** (`/<slug>`) — the per-day checklist: arc selection, day completion, notes threads, and
   per-day course materials. State in localStorage (per-slug) + assets in R2. This is the original app,
   still live.
2. **Interview** (`/<slug>/interview`) — an AI ingestion interview that synthesizes a learner profile
   used to personalize the course.
3. **Session** (`/<slug>/session`) — the AI **Director**: a daily lesson with a live canvas (readings,
   decks, figures, browser, terminal) + chat, and on Day 2 a real cloud **workshop** (terminal + app
   viewer) on an isolated droplet account.

**Plus** an instructor console at `/admin` (roster, per-learner progress + transcripts, ask-AI about a
learner, invite/edit/suspend/deprovision).

Full PRD: `docs/PRD.md`. Current state/decisions: `tasks/state.md`, `tasks/decisions.md`, and the Claude
auto-memory. **If code contradicts this file, fix the code — but this file must track the code.**

---

## Run — the Dev → Commit → Release loop

**This is the mandatory workflow. Prod (`coursework.kitbord.com`) has live learners — never iterate there.**

1. **DEV — work locally on jserver:8788.** `npm run dev:full` builds + serves the SPA and Pages Functions
   at `http://jserver:8788` (= localhost on Jonathan's Mac, which *is* jserver) against a **LOCAL
   miniflare R2** — fully isolated from prod. `.dev.vars` (gitignored, never deployed) supplies
   `DEV_ADMIN_EMAIL` (so `/admin` works without a real Cloudflare Access JWT), `BOOTSTRAP_ADMINS`,
   `ANTHROPIC_API_KEY`, and the terminal/workshop vars.
2. **DATA — pull real prod data into local (preferred for verification).** `npm run sync:dev` snapshots
   prod R2 → the local store dev:full reads, so you test against **real learner sessions/lessons/
   profiles** in isolation (local writes never touch prod). Add `-- --assets` to also pull course
   files/media (STORAGE). It reads prod via the **Cloudflare REST R2 API** (token at
   `~/.coursework-cf-token`) and writes locally; purge-then-copy per bucket = exact mirror. Re-run to
   refresh. Real-data testing is now local — it is no longer a reason to deploy.
   (Do **not** use `getPlatformProxy` *remote* bindings — the token lacks Workers edge-preview perms, so
   they silently fall back to stale local data. See `tasks/lessons.md`.)
3. **VERIFY** on :8788 — drive the actual path against real data; don't assume from reading code.
4. **COMMIT** on the working branch, only once it works locally.
5. **RELEASE — deploy deliberately.** `npm run deploy` (= `vite build && wrangler pages deploy dist
   --project-name coursework --branch main`; **branch `main` = PRODUCTION**). Then spot-check prod in an
   authed browser (admin is behind CF Access).

To inspect/mutate the data a *deployed* Function sees, use `wrangler r2 object … --remote` (CLI defaults
to LOCAL state) or the CF REST R2 API — both authed by `~/.coursework-cf-token`.

---

## Autonomy Rules — Read This First

- **Do not ask approval for routine implementation steps.** Build, verify, move on.
- **Follow the Dev → Commit → Release loop above. NEVER iterate directly in prod.**
- **Stop and check in for:** changes to the localStorage tracker schema, R2 key layout, the
  interview/session **pack** authoring contract, the auth/isolation model, or the coursework markdown
  parsing — all have downstream effects on live data.
- **Plan threshold:** touching 3+ files, or any structural decision → write a plan to `tasks/todo.md`
  first, then execute.
- **Bug fixes:** fully autonomous. Fix it, prove it works locally, document what you did.
- **Complete implementations only.** No stubs, no orphan TODOs, no half-wired components.
- **`100cr`** — full code-review trigger: enumerate every candidate problem across the whole relevant
  path, resolve each, step through end-to-end twice. Pass = two consecutive walkthroughs, zero corrections.

---

## Architecture Map

### Frontend (`src/`, React + Vite + Tailwind + React Router)
- `App.jsx` — routes: `/` splash, `/admin`, `/<slug>` + `/<slug>/dad` (tracker), `/<slug>/dad/files`
  (asset CMS), `/<slug>/interview`, `/<slug>/session`. Role (`isDAD`) comes from the `/dad` path segment.
- `students.js` — learner + course config (mirror of `functions/_students.js`; **keep in sync**).
- `components/` — tracker (`DayCard`, `NotesThread`, `ClaudeLauncher`, `AssetUploader`, `FilesView`),
  `AdminView`, `InterviewView`, `session/` (SessionView, SplitPane, canvas renderers).
- `hooks/useTrackerData.js` (localStorage), `useAssets.js` (R2 via API), `useStudent.js` (resolves
  registry learners from the server).
- `data/parseCourseWork.js` — parses a course markdown file into the day tree.

### Backend (`functions/`, Cloudflare Pages Functions; `_`-prefixed files are NOT routes)
**The engine cast** (content-agnostic engines + per-course/day "packs"):
- `_turnCore.js` — shared turn mechanics for objective-tracked LLM sessions: LLM plumbing, control-tag
  parsing (`[TICK:]`/`[TABLE:]`/`[FIG:]`), server-authoritative tick/table application, R2 JSON helpers.
  Holds no prompt prose and no course specifics.
- `_interview.js` + `_inventory.js` (interview packs) — the **ingestion interview**: an objective
  inventory with drift control; ticks advance, off-topic depth is parked and resurfaced; synthesizes a
  profile.
- `_session.js` + `_sessionPacks.js` (session packs) — the **Director** (daily lesson): TYPED objectives
  (`discuss`/`check`/`artifact`) with per-type tick authority, a canvas program, master prompt, and token
  budget per day. `getSessionPack(courseSlug, dayId)` returns a cached pack; `personalizePack` clones it
  per-request to substitute the learner's name + pronouns.
- `_usher.js` — the **Usher**: per-turn reformer shared by both engines — resolves tappable reply
  **chips** and a **next-ask** so the learner is never stuck.
- `_scribe.js` — the **Scribe**: a cheap per-turn Haiku sweep that lands values the conversation clearly
  agreed onto canvas figures the Director's own `[FIG:]` tags missed.
- Terminal "**Observer**" read = `session/glance.js` (summarizes the live workshop terminal into the
  Director's context / fires proactive nudges). Runtime figure generation validated against the same pack
  rules ("Stagehand").

**Routes** (`functions/[studentSlug]/…` per-learner; `functions/api/…` platform):
- `[studentSlug]/api/session/*` — start, message, canvas, glance, artifact, ship, signoff,
  workshop-token, viewer-status.
- `[studentSlug]/api/interview/*` — start, message.
- `[studentSlug]/api/assets/*` + `[studentSlug]/files/[[path]].js` — course materials (upload/list/stream
  from R2).
- `[studentSlug]/api/student.js` — the learner's resolved profile (name, displayName, course).
- `api/admin/*` — `learners` (roster + invite), `learner/[slug]` (detail + edit + delete),
  `learner/[slug]/provision`, `ask` (AI about one learner). Admin-gated.
- `api/me.js` — identity probe (safe for anon).

**Cross-cutting:**
- `_middleware.js` — hostname front door (play-game host, legacy 301) + **app-side authorization**.
- `_access.js` — CF Access JWT verification, email→slug grants, admin resolution.
- `_students.js` — learner/course resolution (code-seeds ∪ R2 registry); name/pronoun helpers.
- `_provision.js` — droplet account provisioning **queue** (app writes R2; a root daemon acts).
- `_workshopToken.js` — signed short-lived workshop access tokens.
- `_github.js` — one-way mirror of `claude-prompt` files to GitHub (for claude.ai WebFetch).

---

## Multi-Tenant Model

- A **learner** = a slug. **Code-seed** learners live in `students.js` + `functions/_students.js` (kept in
  sync); **invited** learners live in the R2 registry (`admin/registry.json`) and resolve via
  `getStudent` after `primeStudents`. Each learner has one course (`courses[0]`).
- A **course** = `{ slug, title, mdFile, r2Prefix, mirrorPrefix, defaultArc? , workshop?{user} }`.
  `r2Prefix` namespaces that learner's assets in STORAGE (Jordan's is `''` = bucket root, legacy).
- Nothing addresses a learner by a hardcoded name or assumes gender. Address name = nickname ?? account
  name (`displayNameOf`); pronouns default to **neutral singular they**, a set is used only when known
  (admin-settable). See `_students.js`.

---

## Data & Persistence

| Store | Holds | Key shape |
|---|---|---|
| **localStorage** (per-slug) | tracker: `arc` (string) + `days` (completions + notes, incl. sub-day ids like `"0.1"`) | browser-local, no sync |
| **R2 `INTERVIEW`** (`coursework-interview`, binding `INTERVIEW`) | private learner data | `lessons/<slug>/<course>/day-<id>.json` (+ `…/artifacts/day-<id>/<id>.md`), `sessions/<slug>/<course>.json`, `profiles/<slug>/<course>-profile.md`, `glances/…`, `archive/…`, `admin/{registry,access}.json`, `admin/provision-{queue,status}/<slug>.json` |
| **R2 `STORAGE`** (`coursework-assets`, binding `STORAGE`) | course materials + shipped games | `<r2Prefix>day-<id>/<category>/<file>`; `ships/<…>.html` (served on the public `play` host) |

Asset categories: `podcast`, `deck-pdf`, `deck-pptx`, `claude-prompt`, `other`. Only `claude-prompt`
files mirror to GitHub. **Any change to the localStorage shape, R2 key layout, or a pack authoring
contract needs a migration plan + check-in.**

---

## Auth & Isolation (two layers)

- **CF Access** (edge) = the OUTER door: who reaches the app at all on `coursework.kitbord.com`. The
  `*.pages.dev` alias bypasses Access by design (used for local/anon probes).
- **App-side default-deny** (`_middleware.js`, gated by `AUTHZ_ENFORCE="1"`) = the INNER isolation:
  `/<slug>/(api|files)/*` → owning learner only (email→slug grant in `admin/access.json`), `/api/admin/*`
  → admins (`BOOTSTRAP_ADMINS` ∪ grants). Identity = verified CF Access JWT. Fail-closed (401/403);
  unauthorized learner HTML routes 302 to their own course.
- **Edge-cache caveat:** shared caches key on URL, not identity — so all learner-scoped API + HTML
  responses are forced `no-store`, and `/files/*` is `private` (browser-only). A gate in a Worker is
  bypassable by the edge cache unless sensitive responses are non-shared-cacheable.

---

## Workshop VM (Day-2 live surface)

- Droplet `146.190.131.15` (user `coder`) serves each learner an isolated terminal + app viewer via a
  **stable named** Cloudflare tunnel at `workshop.kitbord.com` (`--protocol http2`, never QUIC). A proxy
  path-routes `/u/<user>/` → that user's viewer (HTTP) + PTY bridge (WS). `DEFAULT_VM_URL` is hardcoded in
  `_session.js` so a failed `[vars]` binding can't strand the viewer.
- **Access** = signed short-lived tokens (`_workshopToken.js`, one shared `WORKSHOP_SIGNING_SECRET`
  matching the droplet); the OS account is the real isolation boundary.
- **Provisioning** = the app never runs privileged commands: it writes a request to R2
  (`admin/provision-queue/<slug>`); a root **daemon** on the droplet polls, runs the provision script,
  and writes back `admin/provision-status/<slug>`. Workshop Claude auth uses a shared long-lived
  setup-token via `CLAUDE_CODE_OAUTH_TOKEN` (dedicated account; regen yearly).

---

## Session Memory System (files that survive between sessions)

| File | Purpose |
|---|---|
| `tasks/todo.md` | current plan + progress |
| `tasks/state.md` | end-of-session snapshot: done / in-progress (exact) / next / blockers |
| `tasks/lessons.md` | pattern-level rules from past mistakes (update after every correction) |
| `tasks/decisions.md` | non-trivial decisions: what / why / alternatives / confidence |

**Session start:** read state → lessons → decisions → todo, then work. **Session end:** update `state.md`.
The Claude auto-memory (loaded each session) complements these.

---

## Design Rules (enforce in all UI work)

Light mode only. White background (#ffffff/#fafafa), near-black text (#111). Single accent deep blue
(`#1a3a5c`); Dad/instructor accent slate. DM/Space Mono for numbers+labels, DM Sans/Outfit for body.
Cards: 1px `#e5e7eb` border, subtle hover shadow. Current day: 3px left accent border. Completed: 0.6
opacity + strikethrough + green check. Notes inset (`#f8fafc`). No purple gradients, no Inter, no AI-slop
aesthetics. Smooth expand/collapse, subtle checkbox scale.

---

## Core Engineering Principles

**Simplicity first** — the right fix is usually less code; question a fix that needs a new abstraction.
**No tech debt** — no temporary hacks left in place; defer cleanly if it's not worth doing right.
**Minimal surface area** — touch only what's necessary; no new deps without a real reason (stack is
React + Tailwind + React Router + Cloudflare Pages Functions + R2 + the Anthropic API).
**Confidence transparency** — state confidence on non-obvious calls ("~70% because X; alternative Y").

---

## Out of Scope — Do Not Build

- Broader auth mechanisms beyond CF Access + the app grant model above (no passwords/sessions/accounts).
- An external database (localStorage + R2 cover everything).
- Push notifications; mobile-first layout (responsive is fine).
- Syncing GitHub → local (the mirror is one-way; local/R2 is truth).
- Reverting the workshop VM to `*.trycloudflare.com` quick tunnels (they churn — use the named tunnel).

---

*Infra pointers (account IDs, zones, tokens, file paths) live in the Claude auto-memory `reference_infra`
and `tasks/decisions.md`. This file is the source of truth for conventions.*
