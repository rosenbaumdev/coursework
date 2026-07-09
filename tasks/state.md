# Coursework Tracker — Session State
Last updated: 2026-07-08 (late)

## Completed This Session
- `100cr` on Director terminal-watching. Root-caused: wiring was complete, but (a) the reactive channel only opened on a chat send (blind during terminal work) and (b) the proactive Sentinel fired on only permission/trust/long-prompt — ordinary activity/errors emitted nothing.
- Built the OBSERVER (Haiku): new `functions/[studentSlug]/api/session/glance.js` + `runObserver`/`loadGlance`/`saveGlance`/`glanceKey` in `_session.js`. Rolling situation stored in a SEPARATE R2 object (`glances/<slug>/<course>/day-<id>.json`) so glance writes never clobber the session.
- Two awareness channels now feed `buildSessionEnvelope`: reactive (situation + raw tail every turn) and proactive (settle → /glance → salient → proactive Director turn).
- `LiveTerminal.jsx`: settle detector (`WORKING_RE` + error-ish armer → `{kind:'settled'}` on quiet ≥3s). `SessionView.jsx`: `runObserverGlance` (throttle 5s + tail-change dedup), `fireProactive` with `GAP_EXEMPT` (permission/trust/error/learner-prompt bypass the 25s gap; only "activity" waits).
- Trimmed the Sentinel (`terminalEvents.js`) to fast/unambiguous triggers only (permission/trust/learner-prompt); activity/error interpretation is the Observer's job. Removed dead `onActivity`/`ERROR_RE`. Made `AFFORDANCE_LABELS` honest (dropped never-emitted `menu`/`claude-working`).
- Added WORK LANDED + ERROR bullets to the proactive prompt block; added the TERMINAL SITUATION envelope block.
- Built, deployed to prod, smoke-tested `/glance` on the pages.dev URL (real `npm ERR!` → `{salient:true,kind:error,oneLine:...}`). Cleaned the test's glance object from R2.

## In Progress
- (none) — feature is deployed. Awaiting Jonathan's live run with real Zachary to confirm behavior in a full session.

## Next Session Starts Here
- Watch a real Day-2 run: confirm the Director speaks on work-landed / errors / permission prompts / the learner's own prompt, and that the situation summary keeps it oriented between chat turns. Tune the 25s gap / 5s glance throttle / SETTLE_MS if it's too chatty or too quiet.
- If Claude Code's TUI wording differs from `WORKING_RE = /esc to (interrupt|cancel)/i`, that's the one place to fix (settle won't arm otherwise).

## Open Questions / Blockers
- Proactive-during-proactive is best-effort: a second proactive event while one is streaming is dropped (not queued). Rare (human-paced) but a learner-prompt could in theory be lost behind a still-streaming trust/permission turn. Left as best-effort; revisit only if observed.

## Temporary Notes
- Custom domain coursework.kitbord.com is behind CF Access (deliberate, see decisions.md) — in-app same-origin fetches carry the cookie and work; out-of-band curl 302s to the Access login. Test Functions against the pages.dev deploy URL to bypass Access.
- DEFAULT_VM_URL still the interim quick tunnel; flip to workshop.kitbord.com when the named tunnel is up.
