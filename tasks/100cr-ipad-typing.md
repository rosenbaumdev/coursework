# 100cr — iPad-only chat composer typing lag

*Diagnosis only. No source files modified. Author pass: 2026-07-06.*

## Problem restated

Typing in the chat composer (`ChatInput.jsx`) is visibly laggy **on iPad Safari only** —
not iPhone Safari (same iOS), not desktop Chrome. Persists after three landed fixes.

**Device matrix (the discriminator):**

| Device | Width | Panes mounted | GPU/CPU | Lag |
|---|---|---|---|---|
| iPhone Safari | <768px | chat only (`SplitPane` narrow renders one pane) | weak | **no** |
| iPad Safari | ≥768px (both orientations) | chat **+ canvas** side-by-side (`SplitPane` wide renders both) | weak | **yes** |
| Desktop Chrome | ≥768px | chat + canvas | strong | **no** |

So the cause must be something that **exists only when the canvas pane is mounted** AND
**is expensive only on a weak GPU/CPU**. Anything present on iPhone too, or cheap on a
weak GPU, cannot be the primary.

## Prior fixes — verified present and correct

1. **Draft state local to `ChatInput`** — `ChatInput.jsx:20` `useState('')`. Confirmed:
   typing calls only `setDraft` (local). Parent (`SessionView`, `ChatMessages`, canvas)
   does **not** re-render per keystroke. `pendingSelection`/`attachment` are parent state
   but untouched by typing. ✓ React work per keystroke is confined to `ChatInput`.
2. **`Bubble` memoized** — `Bubble.jsx:67` `export default memo(Bubble)`. ✓
3. **Auto-grow moved to rAF + change-gated** — `ChatInput.jsx:35–60`. ✓ present — **but see
   Candidate B: rAF defers the reflow off the input *event*, it does not eliminate the
   per-keystroke forced layout; it still runs every forward keystroke.**

Because React re-render per keystroke is already confined to `ChatInput`, **the remaining
lag is browser-level: layout / paint / composite** that becomes expensive only when a heavy
canvas subtree is mounted on a weak GPU. That is the whole search space.

---

## Candidate table

Continuous = runs every frame regardless of typing. One-shot = fires once on an event.

| # | Candidate | Mechanism | Matrix fit | Conf. |
|---|---|---|---|---|
| **A** | **Continuous `animate-pulse` on Deck/Figure "Next" pill** (`DeckCanvas.jsx:283`, `FigureCanvas.jsx:644`, active while `pulseNext` = learner is at the frontier of a multi-page deck/figure) | Tailwind `animate-pulse` = infinite opacity keyframe → promotes a compositor layer and keeps Safari's compositor running at 60fps. On a weak GPU already near frame budget compositing a **large high-DPI canvas surface**, sustained compositor churn leaves no headroom; a keystroke's extra main-thread + paint work tips past frame budget → dropped frames → laggy typing. | Exists only with a deck/figure canvas mounted ✓. Weak-GPU-only ✓ (desktop eats it). iPhone: canvas unmounted ✓. **Strong fit.** | **45%** |
| **B** | **Per-keystroke forced reflow in auto-grow** (`ChatInput.jsx:47–53`: `height:'auto'` then read `scrollHeight`) | Every *forward* keystroke satisfies `mayGrow` (`draft.length > g.len`), so the rAF runs `height:auto` + `scrollHeight` read = a forced synchronous layout flush each keystroke, plus a follow-up paint/composite of the chat column. The reflow itself is **confined to the chat column** (canvas pane geometry is fixed by the 100dvh outer column, so the flex sibling is *not* re-laid-out — see Pass 2). Its cost is roughly equal iPad/iPhone; the iPad-only part is the **paint/composite** that follows, which is not isolated from the heavy canvas (no `contain` anywhere — see Fix 1). | Reflow cost: same both devices ✗. Composite-after-paint: canvas-gated ✓. **Partial fit; strong as an amplifier / cheapest lever, weak as sole cause.** | **30%** |
| **C** | **iframe mounted in canvas** (`BrowserCanvas.jsx:132–147`, `ArtifactCanvas.jsx:91` html-preview) | iOS Safari composites iframes on separate layers and re-composites them on parent repaints; an on-screen iframe is a documented source of parent-side input/scroll jank on iOS. Each keystroke repaint forces the iframe layer back through the compositor. | Canvas-gated ✓ **and** only when the current directive is `browser`/`artifact-html` (conditional). Weak-GPU ✓. As a *general* cause: lower, since not every session has an iframe up. | **30%** (cond.) / 20% general |
| **D** | **iOS caret scroll-into-view in nested overflow under `overflow-hidden` 100dvh root** (`SessionView.jsx:422`) | Typing moves the caret; iOS walks scroll ancestors to keep it visible, with layout work amplified by the soft keyboard shrinking the visual viewport under a 100dvh root. | Same nested structure + same textarea on iPhone ✗ (iPhone is the *fast* one). iPad differs only by more layout to consider. **Weak fit.** | **15%** |
| **E** | **Chat textarea has spellcheck/autocorrect/predictive-text ON** (`ChatInput.jsx:132–140` — no `spellCheck`/`autoCorrect`/`autoCapitalize`, unlike every canvas input) | iOS predictive text + spellcheck underline do per-keystroke work. | Identical on iPhone (same textarea, same missing attrs) ✗. Fails matrix. **Note:** this is the *prose* composer — disabling autocorrect would *hurt* UX. Reject as a fix. | **10%** |
| **F** | `ChatMessages` scroll listener + steering effect (`ChatMessages.jsx:20–53`) | — | Listener is passive/scroll-only; steering effect deps `[messages, streamingLastEmpty]` don't change on keystroke (draft is local). Does not run while typing. **Ruled out.** | **3%** |
| **G** | React key churn / remount | `key={directive.id}` (`ContentCanvas.jsx:198`), `key={tab}` (`SplitPane`) — remount on directive/tab change, never on keystroke. **Ruled out.** | — | **2%** |
| **H** | Leftover `setInterval` / runaway timer | Grep: **no `setInterval` anywhere.** All `setTimeout` are one-shot and cleared (BrowserCanvas hint 3.5s cleared on unmount/load; driver debounce; copy-reset). No continuous JS timer. **Ruled out.** | — | **2%** |
| **I** | SVG `filter: drop-shadow` compositing (`index.css:131,140` `.value-pop`) | drop-shadow forces a filter render path, but `.value-pop` is one-shot (350ms `both`), fires on value change, not during idle typing. | Not active while typing. **Ruled out as continuous.** | **3%** |
| **J** | `backdrop-blur-md` header (`SessionView.jsx:427`) | backdrop-filter is a known iOS perf sink — **but it is in the `isNarrow` (iPhone) branch only**; the wide/iPad header (`:478`) is plain `bg-white`. Present on the *fast* device, absent on the slow one. **Ruled out for iPad.** | — | **2%** |
| **K** | `<video>` element cost (`VideoCanvas.jsx`) | A mounted `<video>` is a compositor layer; `preload="metadata"` only. Possible minor amplifier when a video directive is up; not a general cause. | Canvas-gated ✓ but only for video directives. | **8%** |

---

## Two-pass end-to-end walkthrough log

### Pass 1 — keystroke path + continuously-running work

Keystroke path: `keydown` → textarea `onChange` → `setDraft` (local) → `ChatInput`
re-render (cheap; parent tree untouched — verified fix #1) → effect `[draft]` runs
(`ChatInput.jsx:36`) → `mayGrow` true on forward typing → `cancelAnimationFrame` +
`requestAnimationFrame` → in rAF: `height:'auto'` + read `scrollHeight` + set height
(**forced layout**) → browser paint → composite frame.

Continuously-running work while the canvas is mounted (idle, not typing): only the
**infinite `animate-pulse`** instances. Catalogued all 7 `animate-pulse` uses; the only
ones that (a) are continuous AND (b) exist in the wide/iPad canvas during idle are the
**Deck & Figure "Next" pills** (A). Bubble caret = streaming only; SessionView loading
pulse = loading phase; SessionView narrow dot (`:448`) = `isNarrow` only (iPhone);
Artifact "drafting" (`:75`) = mid-turn only; Browser loading bar = transient 3.5s.

Pass 1 surfaced: A, B, C, D, E, F, G, H, I, J, K.

### Pass 2 — corrections (added, not new candidates)

- **Correction to B (important):** re-walked the flex tree. The auto-grow reflow does
  **not** cascade into the canvas SVG. `height:auto` grows the textarea vertically inside
  the chat column; `ChatMessages` (`flex-1 min-h-0`) absorbs it. The `SplitPane` row's
  height is pinned by the outer `h-[100dvh] flex-col` (`SessionView.jsx:422`), and
  `canvasWrap`'s width is a fixed `flex-basis` %, so the canvas pane's box is **not
  dirtied** → not re-laid-out. B's per-keystroke *layout* cost is therefore chat-column-
  local and roughly equal on iPhone/iPad. **B is downgraded from "cascades into the SVG"
  to "cheapest lever + the follow-up paint/composite is what isn't isolated from the
  heavy canvas."** This shifts the primary toward A + missing paint isolation.
- **Correction to C:** conditional on the directive being `browser`/`artifact-html`, so it
  can't be the *general* cause the owner reports — reclassified as a strong *amplifier*
  when an iframe is up, not the base cause.
- **Key structural confirmation:** `grep` shows **no `contain` / `content-visibility`
  anywhere**. The canvas subtree has no layout or paint isolation, so a chat-side
  paint/composite is free to force re-flattening of the (large, high-DPI) canvas layers on
  iPad. This is the unifying weakness behind A, B-composite, C, and K.

Pass 2 added **corrections only — no new candidates.**

### Pass 3 — confirmation

Re-walked both the keystroke path and the continuous-work inventory against the full file
set (`ChatInput`, `ChatMessages`, `Bubble`, `chatMarkdown`, `SessionView`, `SplitPane`,
`ContentCanvas`, `OrientationToggle`, all 11 canvases, `useSessionDriver`, `describeCanvas`,
`index.css`, `index.html`, `tailwind.config.js`). **Zero new candidates, zero new
corrections.** Pass 2 and Pass 3 are two consecutive zero-new-candidate passes →
**walkthrough complete.**

---

## Top diagnosis

The strongest single explanation that fits the matrix without special-casing the directive
type: **on iPad's weak GPU, the compositor is already near frame budget sustaining a large
high-DPI canvas surface, and the canvas subtree has no paint/layout isolation (`contain`).
A continuous `animate-pulse` (Deck/Figure "Next") keeps the compositor hot every frame, and
each keystroke's paint+composite has to re-flatten the un-isolated canvas layers — so the
main thread's input handling loses the frame-budget race and typing lags.** iPhone escapes
it (canvas unmounted); desktop escapes it (GPU headroom).

Confidence in this being the dominant factor: **~55%.** It is most likely a *stack* (A +
missing isolation + the B reflow amplifier + iframe/video when present) rather than one
smoking gun — which is good news, because the recommended fixes are cheap, compounding, and
remove work rather than add machinery. **A 30-second Safari Web Inspector → Timeline capture
on the iPad while typing would settle which layer dominates** and is strongly recommended
before/after any fix.

---

## Ranked minimal solution set (no new machinery — all remove or gate work)

### Fix 1 — Isolate the canvas pane's layout & paint  *(primary, ~1 line, zero risk)*
Add `contain: layout paint` to the canvas pane wrapper (`SplitPane` `canvasWrap`, or the
`ContentCanvas` root). Tells WebKit the canvas subtree is self-contained so a chat-side
forced reflow/repaint cannot drag it into layout and, crucially, does **not** force
re-compositing/re-flattening the heavy canvas layers on every keystroke frame. This is the
single highest-leverage lever and covers B-composite, C, and K at once. No JS, no timers,
no observers.
*Expected impact:* large if the cost is composite-flattening (most likely). Low risk — pure
paint isolation; the pane already has fixed geometry.
*On-device check:* put a heavy directive up (figure/deck/iframe), type before/after. If
smooth after → composite coupling confirmed.

### Fix 2 — Make the "Next" pulse one-shot, not infinite  *(secondary, className/CSS only)*
Replace the continuous `animate-pulse` on the Deck/Figure "Next" pill
(`DeckCanvas.jsx:283`, `FigureCanvas.jsx:644`) with a **finite** attention cue (e.g. a
3-cycle pulse that then rests, or a static emphasized style). Removes the only continuous
compositor wakeup that exists while a canvas is idle in the wide layout. Pure CSS/class
swap — no machinery.
*Expected impact:* medium if continuous compositor churn is the dominant factor.
*On-device check:* type with a multi-page deck **at the frontier** (Next pulsing) vs. one
walked to the end (no pulse). If the pulsing state is measurably laggier → confirmed; then
this fix alone should close most of the gap.

### Fix 3 — Reduce auto-grow reflow frequency  *(optional; likely unnecessary if Fix 1 lands)*
The rAF still forces `height:auto` + `scrollHeight` every forward keystroke
(`ChatInput.jsx:47`). Gate it to only re-measure when a wrap/line boundary can actually
change height (e.g. skip the measure entirely while the current height already equals the
1-row height and no `\n` is present), so short single-line answers — the common case — do
zero forced layout. Keep the existing rAF. No new machinery.
*Expected impact:* small-to-medium; mainly trims the per-keystroke main-thread cost.
*On-device check:* type a long single-line answer; compare with Fix 3 gating the measure.

### Explicitly rejected (would be tech debt / wrong)
- **Disabling spellcheck/autocorrect on the chat textarea (E):** it's the human prose
  composer — autocorrect is wanted here (unlike the terminal/code inputs). Also fails the
  matrix (identical on iPhone). Do **not** copy the canvas inputs' `spellCheck={false}`.
- **Adding `will-change` / `translateZ(0)` layer-promotion hacks:** machinery that trades
  the problem for memory pressure; `contain` (Fix 1) is the clean primitive. Avoid.
- **Any new observer/timer/measurement abstraction:** the fixes above only remove or gate
  existing work, per the no-bloat directive.

**Recommended order:** Fix 1 → verify on device → add Fix 2 only if the profiler/observation
shows residual compositor churn → Fix 3 only if a residual per-keystroke main-thread cost
remains. Capture one iPad Timeline trace first; it will name the dominant layer and make the
choice deterministic.
