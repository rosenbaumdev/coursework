# Coached Session — UX v2 Task List

Live tracker for the round-2 improvements on the two-pane coached session. Check
boxes flip as work lands. Monitor here.

**Status:** ALL PHASES (A–D) done + validated. Ready for interactive review.
**How to run the full thing:** `npm run preview` → open `http://jserver:8788/session` (Functions
+ live chat). Plain `npm run dev` (5173) runs the scripted demo but the typed/live chat needs 8788.
**Runtime:** Phases A–C use `npm run dev` (vite HMR). Phase D needs the backend, so it
runs under `wrangler pages dev` (Functions + build).

## Decisions locked (2026-07-04)
- **Slide-away:** when pane 2 has no material, it slides away and the chat takes the
  full width; it slides back when the session next drives content.
- **Auto-orientation:** on slide-in, the system picks L/R vs T/B from viewport
  aspect + content type. A manual toggle overrides it; the override persists across
  browser sessions **until the next slide-away**, which resets to auto.
- **Divider ("pane footer"):** user-draggable; the size persists the same way as the
  orientation override (across sessions, reset on slide-away). *(Interpreting "pane
  footer" = the resize divider between panes — correct me if you meant something else.)*
- **Terminal:** simulated, real-feeling, syntax-aware; a small virtual FS with files +
  an in-pane editor; no real execution/persistence (training sandbox). Real PTY later =
  SSH-authed, non-persistent, re-login each session.
- **Browser:** real URL bar + iframe navigation to whatever's entered (note: many sites
  refuse framing; a header-stripping proxy is a later option).
- **Artifact:** genuinely editable with live preview, behaving like the tool it emulates
  (markdown / html / code). "Collab" here = user-editable in-session (multi-user sync later).
- **Live chat model:** real, default **Haiku** (`claude-haiku-4-5`), provider abstracted
  so a local Ollama model (llama/Gemma) can be swapped in.

---

## Phase A — Canvas presence & layout intelligence (items 1, 2, 3)
- [x] A1. Derive `hasCanvas`; track open↔closed transitions (prevHasCanvasRef).
- [x] A2. Slide-away: `!hasCanvas` collapses pane 2 (flex-basis→0 + fade transition), chat
      fills; retains last directive so it slides out WITH its content. L/R + T/B.
- [x] A3. `decideOrientation(vw,vh,type)` — aspect≥1.25→lr, ≤0.9→tb, squarish→content nudge.
- [x] A4. Slide-in auto-applies orientation unless overridden; manual toggle sets override.
- [x] A5. Override lifecycle: persisted across sessions, **cleared on slide-away**.
- [x] A6. Divider ratio: persisted + reset-on-slide-away, default 0.6.
- [x] A7. Narrow: Canvas tab hidden when empty, reappears with content + dirty dot.
- [x] A8. Verified headless: wide→lr, tall→tb auto-orientation confirmed. (Slide-away in
      final interactive walk.)

## Phase B — Real image & video assets (item 5)
- [x] B1. Real raster image `public/session-assets/sample-image.jpg` (800×500); image +
      deck turns point at it.
- [x] B2. Real `sample-video.mp4` (6s moving pattern + 440Hz tone) + poster; VideoCanvas is
      now a real `<video controls>`.
- [x] B3. Assets serve 200 (jpg/mp4/poster).

## Phase C — Functional panes (item 4)
- [x] C1. BrowserCanvas: editable URL bar, real iframe nav, back/forward/reload, loading
      bar + "site refused embedding" hint, search-fallback for non-URLs.
- [x] C2. ArtifactCanvas: Edit/Preview toggle; markdown → live render, html → live iframe,
      code → editable source; external (driver) updates flow in for the live-update demo.
- [x] C3. TerminalCanvas: interactive simulated shell (`src/session/vsh.js` + UI).
    - [x] C3a. Virtual filesystem (nested dirs + files, hidden files, seeded content).
    - [x] C3b. Commands ls/cd/pwd/cat/echo(+`>`/`>>`)/mkdir/touch/rm(-r)/mv/head/whoami/
          date/clear/help with flags + real error messages. Validated via node harness.
    - [x] C3c. Input line: history (↑/↓), prompt reflects cwd.
    - [x] C3d. `edit <file>` opens an in-pane editor (⌘S save · Esc exit).
- [x] C4. Terminal renders headlessly; interpreter verified by node harness; browser +
      artifact build clean. Full interactive check in the final walk.

## Phase D — Context-aware chat + marquee + real model (item 6)
- [x] D1. `describeCanvas(directive, liveState)` — compact "what's on screen" summary;
      terminal/browser/artifact report live state (cwd+output / URL / edited content).
- [x] D2. Marquee select tool: "◲ Point" toggle → drag a rectangle on the canvas; best-
      effort text extraction (caretRangeFromPoint) for text panes, regional note otherwise.
- [x] D3. Composer attachment chip ("Pointing at: …", clearable); attaches to next turn.
- [x] D4. `functions/[studentSlug]/api/session/message.js` — SSE, stateless, provider-
      abstracted (Haiku default; Ollama via `SESSION_LLM_PROVIDER=ollama`). VALIDATED: real
      Haiku turn answered correctly about the terminal contents AND about a marquee'd region.
- [x] D5. Hybrid driver (`useScriptedSessionDriver` + live): chips advance the scripted
      tour; free text → real model turn with canvas context. Graceful 404 note under vite.
- [x] D6. Ran under `wrangler pages dev` (8788); real context-aware + selection-aware turns
      streamed correctly.
- [ ] D7. (stretch, deferred) model emits `[SHOW:]` to drive the canvas from chat.

## Verify / wrap
- [x] Headless/curl verification: layout auto-orientation, real assets, terminal + shell
      interpreter, live context-aware + selection-aware chat. Build clean (324 modules).
- [ ] Jonathan's interactive walk (the real test) — slide-away/in, all panes, marquee→chat.
- [ ] Update `tasks/state.md`; nothing committed yet — commit gate is Jonathan's call.

## Known follow-ups (not blocking)
- Local model: set `SESSION_LLM_PROVIDER=ollama` + `OLLAMA_MODEL` in `.dev.vars` to use
  llama/Gemma (works under local `wrangler pages dev`; edge→localhost won't work deployed).
- Browser pane: real sites that send X-Frame-Options refuse embedding (hint shown); a
  header-stripping proxy is the fix if we want arbitrary sites.
- Marquee text extraction is empty for image/video/iframe regions (falls back to a note).
- D7 `[SHOW:]` (model drives canvas). Real PTY terminal (SSH-authed, non-persistent).
