# Jordan's Coursework Tracker — CLAUDE.md
*Last updated: 2026-05-25 — phase 4 (public access + claude.ai launcher)*

---

## What This Is

A React single-page app + small Node/Express backend that tracks Jordan Rosenbaum's progress through a 3-week AI business building coursework. Two views: Jordan's (`/` — interactive: checks off days, adds notes) and Dad's (`/dad` — reads progress, leaves feedback, uploads course materials via a file CMS).

State split:
- **Tracker state** (completions, notes): localStorage, per-browser. No sync.
- **Course materials** (podcasts, slide decks): server-side filesystem at `storage/`. Uploaded via `/dad`, served at `/files/`.
- **Claude prompts** (`claude-prompt` category): auto-mirrored to `github.com/rosenbaumdev/coursework` so claude.ai's WebFetch (which has a domain allowlist) can read them via `raw.githubusercontent.com`.

Public access: `https://coursework.rosenbaum.us` via Cloudflare Tunnel → jserver:4174. No auth (yet). Tailnet still works as fallback: `http://jserver:4174`.

Full PRD: `docs/PRD.md` — read it before touching anything structural.

---

## Autonomy Rules — Read This First

- **Do not ask for approval on routine implementation steps.** Build, verify, move on.
- **Do stop and check in for:** any change to the localStorage schema, the coursework data structure, or the markdown parsing logic — these have downstream effects on existing user data.
- **Plan threshold:** touching 3+ files, or any structural decision → write plan to `tasks/todo.md` first, then execute.
- **Bug fixes:** fully autonomous. Fix it, prove it works, document what you did.
- **Default posture:** complete implementations only. No stubs, no TODOs left in place, no half-wired components.

---

## Session Memory System

Claude Code has no memory between sessions. These files are the solution.

### The Four Memory Files

| File | Purpose | When Updated |
|---|---|---|
| `tasks/todo.md` | Current plan + progress | Continuously during work |
| `tasks/lessons.md` | Mistake patterns + rules | After every correction |
| `tasks/state.md` | Current session state snapshot | End of every session |
| `tasks/decisions.md` | Architectural decisions + rationale | When any non-trivial decision is made |

### Session Start Protocol
1. Read `tasks/state.md` — where you left off
2. Read `tasks/lessons.md` — don't repeat past mistakes
3. Read `tasks/decisions.md` — understand why the code is the way it is
4. Read `tasks/todo.md` — pick up the next incomplete item
5. Only then begin work

### Session End Protocol
Update `tasks/state.md` with:
- What was completed this session
- What is in progress and its exact state
- What is next (first task of next session, unambiguous)
- Any open questions or blockers

### state.md Format
```
# Coursework Tracker — Session State
Last updated: [date + time]

## Completed This Session
- [specific item]

## In Progress
- [item]: [exact state]

## Next Session Starts Here
- [first task, no ambiguity]

## Open Questions / Blockers
- [if any]

## Temporary Notes
- [anything that would be confusing without context]
```

### decisions.md Format
```
## [Decision Title] — [Date]
**What:** [what was decided]
**Why:** [rationale]
**Alternatives considered:** [what was rejected and why]
**Confidence:** [%]
```

---

## Task Management

1. Write plan to `tasks/todo.md` before any non-trivial work
2. Mark items complete as you go — keep the file current
3. Capture corrections in `tasks/lessons.md` immediately — pattern-level rules, not just "I fixed X"
4. Never mark a task done without proving it works — run the app, click the thing, verify in localStorage

---

## Core Engineering Principles

**Simplicity First**
This is a small app. Keep it small. The right solution is almost always less code. If a fix requires a new abstraction, question the fix.

**No Tech Debt**
No temporary hacks left in place. No TODOs without a linked task. If it's not worth doing right, defer it cleanly.

**Minimal Surface Area**
Only touch what's necessary. No new dependencies unless there's no reasonable alternative. The stack is React + Tailwind + React Router + localStorage. That's it.

**Confidence Transparency**
State your confidence on any non-obvious decision. "I'm ~70% confident this is the right approach because X — alternative is Y" is correct. Feigning confidence is not.

**`100cr` — Full code review trigger.**
When Jonathan says `100cr`, run the full protocol on the referenced issue: enumerate every candidate problem across the entire relevant code path, resolve each, step through end-to-end twice. Report candidate list and walkthrough results. Pass is complete only when two consecutive walkthroughs find zero corrections.

---

## Architecture Constraints — Do Not Deviate Without Check-In

| Constraint | Rule |
|---|---|
| Tracker persistence | localStorage only. Two keys: `arc` (string), `days` (object keyed by string id, including sub-day ids like `"0.1"`). No external DB for tracker state. |
| Asset persistence | Filesystem at `storage/day-<id>/<category>/<filename>`. `storage/` is gitignored. No external object storage. |
| Backend scope | `server/index.js` only. Endpoints: `GET /api/assets`, `POST /api/assets/:dayId`, `DELETE /api/assets/:dayId/:category/:filename`, static `/files/`. Do not add other endpoints without checking in. |
| Asset categories | `podcast` (mp3/m4a/wav/ogg/aac), `deck-pdf` (pdf), `deck-pptx` (pptx/ppt/key), `claude-prompt` (md/txt), `other` (anything). Adding categories: update `CATEGORIES` + `CATEGORY_EXTS` in `server/index.js`, `EXT_CATEGORY` in `AssetUploader.jsx`, `CATEGORY_LABELS` + `CATEGORY_ORDER` in `AssetList.jsx`. |
| GitHub mirror | Only `claude-prompt` files. Auto-sync on upload via `server/githubMirror.js` → `github.com/rosenbaumdev/coursework`. PAT at `~/.coursework-github-token` (chmod 600), mirror clone at `~/.coursework-mirror-clone/`, state at `~/.coursework-mirror-state.json`. One-way: local is truth. Don't sync GitHub→local. Don't add other categories to mirror without checking in (repo size). |
| Public exposure | Cloudflare Tunnel (`cloudflared`) with `--protocol http2` (NEVER QUIC — Comcast drops UDP). Tunnel UUID: `48ca91e2-695f-4219-a96e-5da02e790728`. CF dashboard: rosenbaum.us zone has WAF Custom Rule "Allow AI fetchers on coursework" skipping Super Bot Fight Mode + Browser Integrity Check. Bot Fight Mode off zone-wide (Free plan limitation). robots.txt configured to allow AI bots. |
| Claude launcher | `ClaudeLauncher.jsx` renders per-day "Start with Claude" section when claude-prompt files exist. "Open in claude.ai" button uses GitHub raw URL (if mirrored) or local URL (fallback) in the pointer prompt. "Copy full prompt" always uses local URL. |
| Coursework data | `public/coursework.md` is the source of truth, edited directly. Parsed at runtime by `src/data/parseCourseWork.js`. `JORDAN_COURSEWORK.md` and `scripts/build-coursework.mjs` were the one-shot seed for the initial bulk import — do not re-run the script (it will overwrite). |
| Day IDs | Strings throughout. Top-level days = integers as strings (`"0"`, `"1"`). Sub-days = `<parent>.<n>` (`"0.1"`, `"0.2"`). The `numericId` field is for sorting only. |
| Sub-days | Nested under parent in the UI tree (computed via `buildDayTree`). Sub-day completion + notes use the same localStorage `days` map as top-level days. Top-level day count is what drives "X / N complete" and "current day" — sub-days don't participate in those calculations. |
| Routing | Two routes only: `/` (Jordan) and `/dad` (Jonathan). Role determined by route. |
| Role detection | `useLocation()` → `isDAD` boolean prop passed down. No other role mechanism. |
| Note authorship | Jordan's view posts `author: "jordan"`. Dad's view posts `author: "dad"`. No other authors. |
| Schema changes | Any change to the localStorage shape, the coursework frontmatter keys, or the asset directory layout requires a migration strategy and a check-in. |
| Auth | None. Tailnet-only deployment. Do not add password gating, sessions, or user accounts. |
| Arc selection | Arc stored in localStorage key `"arc"`. Set once on first load via arc selection screen. Changeable with confirmation dialog. |

---

## Coursework MD Parsing

The app loads `public/coursework.md` on startup and parses it into the day data structure. This is intentional — it allows the coursework to be updated (e.g. when Jordan picks his arc and an arc-specific version is generated) without touching the React code.

**Each day in the MD has a frontmatter block:**
```
---
day: 0
week: 1
title: Orientation + Dopamine
description: Pick your arc, build your first AI agent, vibe code a mini golf game
---
```

The parser reads frontmatter for structured data (id, week, title, description) and treats everything below it as the day's rich content (rendered in an expanded view if implemented).

**To update the coursework:** replace `public/coursework.md` and reload. No code changes needed.

---

## localStorage Schema

```json
{
  "arc": "Sports Betting AI",
  "days": {
    "0": {
      "completed": false,
      "completedAt": null,
      "notes": []
    },
    "1": {
      "completed": true,
      "completedAt": "2026-05-23T14:32:00.000Z",
      "notes": [
        {
          "id": "crypto.randomUUID()",
          "author": "jordan",
          "timestamp": "2026-05-23T14:32:00.000Z",
          "text": "Got the agent working"
        }
      ]
    }
  }
}
```

Days not yet interacted with default to `{ completed: false, completedAt: null, notes: [] }` — no entry needed until first interaction.

---

## Project Structure

```
coursework/
  public/
    coursework.md          ← source of truth for day content (edit directly)
  storage/                 ← uploaded assets (gitignored)
    day-<id>/
      podcast/*.mp3|m4a|wav|ogg
      deck-pdf/*.pdf
      deck-pptx/*.pptx|ppt
      other/*
  server/
    index.js               ← Express: /api/assets, /files/*, static dist/
    githubMirror.js        ← auto-sync claude-prompt files to github.com/rosenbaumdev/coursework
  src/
    App.jsx
    main.jsx
    components/
      Header.jsx
      ArcSelector.jsx
      DayCard.jsx          ← recursive (sub-days nest)
      NotesThread.jsx
      ProgressBar.jsx
      AssetList.jsx        ← shows uploaded materials per day
      AssetUploader.jsx    ← /dad-only file uploader (drag-drop, auto-detect category)
      FilesView.jsx        ← /dad/files CMS view (all days at once)
      ClaudeLauncher.jsx   ← "Start with Claude" buttons per day
    hooks/
      useTrackerData.js    ← all localStorage read/write
      useAssets.js         ← fetch/upload/delete via backend API
    data/
      parseCourseWork.js   ← MD parser + buildDayTree (sub-day nesting)
    styles/
      index.css
  scripts/
    build-coursework.mjs   ← one-shot seed import (don't re-run)
  docs/
    PRD.md
  tasks/
    todo.md
    lessons.md
    state.md
    decisions.md
  index.html
  vite.config.js           ← /api + /files proxied to localhost:4174 in dev
  package.json
  tailwind.config.js
```

## Run

- **Production (the actual deploy on jserver):** `npm run start` (= `npm run build && npm run server`). Express on port 4174 (override with `PORT=`).
- **Public access:** start cloudflared tunnel with `cloudflared tunnel --protocol http2 run --token <TOKEN>`. Tunnel token in CF dashboard. URL: https://coursework.rosenbaum.us.
- **Dev with HMR:** `npm run server` in one terminal, `npm run dev` in another. Vite proxies `/api` + `/files` to the Express server.
- **Asset CMS:** `/dad/files` for the full file manager, or `/dad` for per-day inline uploads.
- **Persistence:** neither Express nor cloudflared currently run as launchd services. Each Claude Code session must start them. Pending: launchd plist setup.

---

## Design Rules (enforce in all UI work)

- Light mode only
- White background (#ffffff or #fafafa), near-black text (#111)
- Single accent: deep blue (#1a3a5c)
- Dad accent: slate (#64748b)
- Fonts: DM Mono or Space Mono for day numbers/labels, DM Sans or Outfit for body — imported from Google Fonts
- Cards: 1px border (#e5e7eb), subtle shadow on hover
- Current day card: 3px left border in accent blue, slightly elevated shadow
- Completed days: 0.6 opacity, title strikethrough, green checkmark
- Notes thread: slightly inset (#f8fafc), left border
- Jordan note pill: blue background, white text
- Dad note pill: slate background, white text
- No purple gradients. No Inter. No AI slop aesthetics.
- Animations: smooth expand/collapse on notes thread, subtle scale on checkbox

---

## Out of Scope — Do Not Build

- Authentication of any kind (tailnet identity is the gate)
- External database (filesystem + localStorage cover everything)
- External object storage (S3, R2, etc.)
- Push notifications
- Multiple student support
- Admin dashboard beyond the per-day uploader on `/dad`
- Mobile-first layout (responsive is fine, mobile-first is not the priority)

---

*This file is the source of truth for project conventions. If code contradicts this file, fix the code.*
