# Coursework Tracker — Session State
Last updated: 2026-05-25 (phase 4)

## Completed This Session (phase 4: public access + claude.ai integration)

### Public exposure via Cloudflare Tunnel
- App publicly reachable at **https://coursework.rosenbaum.us**
- Tunnel: cloudflared with HTTP/2 protocol (NOT QUIC — Comcast/home network drops UDP). Background task currently `bxsroxllp`.
- DNS: CF-managed CNAME → tunnel
- WAF Custom Rule "Allow AI fetchers on coursework" skips Super Bot Fight Mode + Browser Integrity Check for `coursework.rosenbaum.us` hostname
- Bot Fight Mode disabled zone-wide (no per-hostname scoping on Free plan)
- Cloudflare "Manage your robots.txt" set to allow AI bots (was auto-generating Disallow rules for ClaudeBot)

### Claude prompt launcher
- New asset category `claude-prompt` (md/txt files) — uploadable via /dad/files
- Per-day "Start with Claude" launcher (`ClaudeLauncher.jsx`) shows when prompts exist
- Two buttons per prompt: "Open in claude.ai" (URL pointer) and "Copy full prompt" (clipboard fallback)
- "view raw" link to inspect prompt source

### GitHub mirror (the critical fix)
- claude.ai's WebFetch tool has an implicit domain allowlist; coursework.rosenbaum.us isn't on it. raw.githubusercontent.com is.
- Auto-mirror: claude-prompt uploads sync to `github.com/rosenbaumdev/coursework` (public) via PAT
- Mirror clone at `~/.coursework-mirror-clone/`, PAT at `~/.coursework-github-token` (chmod 600), sync state at `~/.coursework-mirror-state.json`
- New module `server/githubMirror.js` handles sync/remove
- Launcher uses `mirror.url` (raw.githubusercontent.com) in pointer prompt when available; falls back to local URL
- Sync badge in UI: ✓ mirrored / ⏳ pending / ✗ failed
- Express request logging middleware added

### End-to-end verified
- Day 0 instructor briefing (30KB) → uploaded → mirrored → claude.ai successfully fetches via raw URL → session begins ✅

## In Progress
- Nothing. Both phase-3 work (auth + engagement tracking) and persistence (launchd) are still pending — see Next.

## Next Session Starts Here
Pick one of these:
1. **Phase 3: auth + engagement tracking** (laid out in commit history of tasks/todo.md but not started). Jordan login + Dad login, server-side per-user view counts, red/yellow/green indicators on assets and days.
2. **Persistence (launchd plists)** for both Express + cloudflared so they survive jserver reboots / claude code session ends.
3. **Sub-day content** — Jordan's Day 0.1 / 0.2 if Jonathan has the material to drop in. The data model + UI already support sub-days; just need frontmatter blocks added to `public/coursework.md`.

## Open Questions / Blockers
- Phase 3 (auth + engagement) was planned but never started. The plan is in earlier `tasks/todo.md` revisions if needed.
- Background tasks alive only for this session:
  - Express: `bceh913iw` (port 4174)
  - Cloudflared tunnel: `bxsroxllp` (HTTP/2 protocol)
- GitHub raw URLs cache at CF edge for ~5 min after deletion. If a prompt is renamed/replaced, raw URL may serve stale for that window. Not a problem in practice (users don't notice).

## Temporary Notes
- PAT scope: `rosenbaumdev/coursework` only, Contents R/W + Metadata R, no expiration. Token name in GitHub is "coursework-mirror".
- `~/.coursework-mirror-clone/` is a separate git working tree, NOT inside the project. Don't accidentally commit storage/ contents there.
- Bundle: 350 KB JS / 109 KB gzip. Acceptable.
- Active uploads on Day 0: podcast (66 MB m4a), deck pdf (650 KB), claude-prompt briefing (30 KB).
