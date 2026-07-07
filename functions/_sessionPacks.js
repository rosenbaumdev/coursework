// Per-day SESSION PACKS — the lesson-engine analog of _inventory.js's interview
// packs. A course = an ordered list of day packs. A pack is everything
// day-SPECIFIC the (coming) generic lesson engine _session.js needs; the engine
// stays content-agnostic and reads all specifics from the pack via getSessionPack.
//
// This is a SIBLING of the interview pack, not a fork: same markdown-checklist
// authoring, same parser/helper shape, same [TICK:]/[TABLE:] mechanics from
// _turnCore.js. What differs is exactly the parts a *lesson* needs that an
// *intake interview* does not — and only those:
//
//   - objectives are TYPED (discuss | check | artifact) so tick authority varies
//     (Fable review, finding #2 — verification integrity):
//       · discuss  — exposure ("he's seen TAM/SAM/SOM explained"). Model tick OK.
//       · check    — understanding. Tick MUST carry evidence (a learner quote);
//                    a Haiku verifier can reject it (engine, Step 3 / v1.1).
//       · artifact — a produced thing ("a sizing memo exists"). Tick is VALID
//                    ONLY IF the named session artifact exists with real content
//                    (server-checkable — the strongest, nearly-free gate).
//   - framing → masterPrompt: the day's instructional persona + method, written
//     in the INSTRUCTION register (teach + verify + drive a canvas), NOT the
//     interview's EXTRACTION register. Distinct prompt layers by design.
//   - canvasProgram: the authored content this session can put on the canvas,
//     addressable by the model via [SHOW: <target>] and by the server as the
//     per-objective default (deterministic spine; model adds judgment). Targets
//     are VALIDATED keys — the model sequences authored content, never invents it.
//   - pronouns: the interview envelope hardcoded "HIS words". Packs carry pronouns
//     so the engine prose is neither gendered nor name-interpolated.
//   - entry / exit: what to preload (from the durable learner record) and the
//     shape of what's written back at session end.
//
// A NEW DAY = add one pack entry here; zero engine changes.
//
// ── Objective line grammar (under a `## Phase` header) ────────────────────────
//   - [ ] <R|B> <discuss|check|artifact> <id> — <what "achieved" means>
// R = required (blocks day completion). B = bonus (achieved if it comes up; never
// drags the session). `id` is stable and used by [TICK: id] / [TABLE: id :: note].
// For an `artifact` objective, `id` IS the artifact key: the pack's `artifacts`
// map declares its gate (title/format/minChars, optional rubric), and the tick is
// only honored once session.artifacts[id] meets that gate.
//
// ── Grammar CONTRACT (engine rules Day packs are authored against) ────────────
// These are enforced by the engine (_session.js), declared here so authors write
// against them (Fable review #2):
//   1. CHECK TICKS REQUIRE EVIDENCE. A `check` objective's tick must be
//      `[TICK: id :: <learner quote>]`. A bare `[TICK: id]` on a check-type
//      objective is NOT honored — the box stays open and the next envelope says
//      why. Deterministic; no verifier needed for the rule itself.
//   2. ARTIFACT CONTENT IS LEARNER-AUTHORED ONLY (v1). The model never writes
//      into `session.artifacts` — it scaffolds by SHOWING a template/example as a
//      canvasProgram `reading` target for the learner to work from. Otherwise a
//      model-seeded template alone would clear `minChars` and the artifact gate
//      would gate nothing.
//   3. `tangent` IS A RESERVED TABLE TARGET. Lesson tangents mostly relate to no
//      objective; `[TABLE: tangent :: note]` parks them (surfaced at wrap-up).
//      No objective may claim the id `tangent` (validator enforces).
//   4. RESUME BEHAVIOR IS ENGINE-GENERIC. A multi-hour day gets resumed across
//      sittings; the engine re-renders the board, recaps, and continues. Do NOT
//      author resume choreography into `entry.context` — it describes the FRESH
//      start only.
//   5. PER-DAY BUDGET. `budget: { maxTurns, targetMinutes }` (optional) sets the
//      day's cost ceiling + pacing envelope; engine default applies when absent.
//      Day-length is a day-shaped fact — it lives here, not as an engine constant.
//   6. FIGURES BUILD IN STEPS (Fable review #3 §2). A `figure` canvasProgram entry
//      declares `payload.spec.steps` (ordered unique step ids); any spec element
//      may carry `step: <stepId>` = visible from that step onward. The model
//      advances a figure with [SHOW: <key>@<stepId>] (numeric index accepted,
//      clamped); plain [SHOW: <key>] resumes the last-shown step (else 0).
//      canvasDefaults / entry.canvas take BASE keys only — no `@` (validator
//      enforces; tier-2 resumes, never hard-jumps past the build-up).
//      RESERVED v1.1 grammar (do not implement yet): runtime value injection via
//      `[FIG: <key> :: ringId=value, ...]` — string values rendered verbatim,
//      merged over the authored spec at resolve time (`value: null` slots in the
//      ring spec exist for this).
//
// ── Deck Author contract (visual deck frames) ─────────────────────────────────
// Decks exist for what's best shown VISUALLY. The Director's chat carries the
// prose; each slide carries ONE idea with punch. A deck that restates what the
// chat says is regurgitory — text alone belongs in the chat, not on a slide.
// Frame kinds (DeckCanvas.jsx renders them; the validator enforces the budgets):
//   statement — { kind, kicker?, text (≤90 chars), sub? }. One big-type idea,
//               centered. Use for openers, closers, and pivots. If the text
//               needs a second sentence, it's a split, not a statement.
//   stat      — { kind, value (≤24), label (≤80), note? }. One huge number/value
//               worth staring at. ONLY real numbers — an invented stat is worse
//               than no slide.
//   split     — { kind, heading?, text (≤220)?, visual }. The workhorse: words
//               beside a visual. visual = { type:'image', src, alt } or
//               { type:'items', items (≤6): [{ icon?, title (≤40), text? }] }.
//               Halves stack vertically on narrow panes automatically.
//   figure    — { kind, figureKind, spec, step? }. A FigureCanvas figure FROZEN
//               at one build state (step = id or index; omitted = fully built).
//               Live step-advance belongs to a `figure` canvas target, not a
//               deck slide. Spec rules identical to figure canvas entries (same
//               validator). Kinds:
//                 concentric — nested rings (market-sizing shape)
//                 quadrant   — 2×2 grid (SWOT shape)
//                 funnel     — 3-5 tapering bands top→bottom, label+value each
//                              (+optional sub). The taper IS the message — use
//                              for magnitude cascades ($30M → $600K → $54K).
//                 iconrow    — 3-6 circled glyphs + label (+optional sub), the
//                              "here are the N things" overview row. Glyph
//                              names come from GLYPHS in FigureCanvas.jsx
//                              (ICON_GLYPHS below mirrors it).
//                 bars       — 2-6 horizontal bars: label + value + ratio
//                              (0–1 relative width, mono value at bar end).
//                 matrix     — side-by-side SCOREBOARD: 2-4 cols (e.g.
//                              competing arcs) × 1-8 rows (metrics), cells
//                              addressed "colId.rowId" — the compare/decide
//                              shape (several options sized on the same
//                              metrics at once, filled live via [FIG:]).
//               All figure kinds accept an optional spec.title (in-shape
//               heading) and inherit the staged-reveal layer (spec.steps).
//   image     — { kind, src, caption? }. Full-slide image.
//   columns   — { kind, heading?, columns (2-4): [{ title (≤40), icon?,
//               sections (≤4): [{ label (≤28), text (≤170) }], example? (≤90) }] }.
//               Parallel explainer cards compared in the SAME dimensions — the
//               researched "Cremades card row" pattern (per-tier card: labeled
//               definition rows + a mono worked-example line with real numbers,
//               e.g. "1.5B users × $30/yr = $45B"). Header tint ramps
//               automatically (accent opacity by index — echoes the concentric
//               rings); `example` is the punch line: real math or leave it off.
//   markdown  — escape hatch for tables/short structured text. The validator
//               WARNS above ~120 words: that's a text wall — split it into
//               statement/split/stat frames or move the prose to chat.
// Authoring rules: LEAD WITH A SHAPE — a deck where most slides are text
// rectangles is a failed deck; figure frames first, cards support. Every deck
// opens on or centers around a figure frame; if a beat has no natural shape,
// question the beat before reaching for another text card. ~5-10 frames per
// deck; close with a statement; one idea per frame; the word budgets are the
// validator's floor, not a target — shorter lands harder.
// `validateSessionPackFull(day)` returns { errors, warnings }; warnings are
// taste violations, errors are broken slides.
//
// Split rows may carry `glyph: <name>` (rendered from the built-in glyph map)
// instead of a text `icon` — shapes beat mono characters.
//
// RESEARCH-FIRST (Jonathan, 2026-07-05): the world is full of excellent visual
// explainers — never invent a weaker visual from scratch. Before authoring a
// concept's frames: (1) search the best existing treatments ("<concept>
// illustrated / infographic"), (2) extract the 2-3 strongest recurring patterns
// (layout, what makes the example land, how numbers are shown), (3) RECREATE
// those patterns inside this frame grammar and design system. Never embed
// third-party branded images. Log source names/URLs + the extracted patterns in
// a RESEARCH LOG comment near the pack that uses them — the audit trail that
// research-first authoring happened. Extend the grammar only when a researched
// pattern truly can't be expressed (at most one new frame kind, with validator
// rules + renderer).

// ── Example skeleton pack ─────────────────────────────────────────────────────
// A GENERIC showcase day — NOT real course content. It exercises every construct
// (all three objective types, R and B, every canvas renderer, artifact gating,
// per-objective canvas defaults, pronouns, entry/exit) so the grammar + validator
// have something concrete to prove against and Fable has real code to review.
// Real day packs (e.g. Zachary Day 1) get authored the same way once the grammar
// is reviewed. Uses gender-neutral pronouns for a generic learner.
const SHOWCASE_DAY = {
  day: 0,
  title: 'Showcase Day — grammar exercise',
  oneLine: 'A non-course day that touches every pack construct so the engine can be tested.',

  pronouns: { subject: 'they', object: 'them', possessive: 'their', possessivePronoun: 'theirs', reflexive: 'themself' },

  // Optional per-day cost ceiling + pacing envelope (contract §5). Engine default
  // applies when absent; a long day (e.g. a 2-4hr Day 1) sets its own.
  budget: { maxTurns: 40, targetMinutes: 30 },

  // Instruction-register persona for the day — DAY-SPECIFIC ONLY: register,
  // subject-matter stance, and what this day emphasizes. All method scaffolding
  // (canvas control, tick discipline, evidence rules, tangent parking, pacing) is
  // engine-universal and lives in _session.js — do NOT restate it here; a second
  // copy in the pack would drift against the engine's.
  masterPrompt: `
Today is a showcase walkthrough, not a real lesson: the learner is trying out the
session tooling itself. Be plainspoken and quick — the material is deliberately
thin, so the interesting part is what the learner does with the panes, not the
concept. Treat their draft deliverable as a scratch exercise, not real work
product; care about whether they drove the tools, not about polish.`.trim(),

  // The authored objective inventory for the day.
  objectivesMd: `
## 1. Warm-up
- [ ] R discuss intro.frame — They've heard what today's session is for and said they're ready to start.

## 2. Learn
- [ ] R discuss concept.seen — They've been shown the core concept on the canvas and walked through it.
- [ ] R check concept.applied — They've correctly applied the concept to a fresh example in their own words (not just restated the definition).

## 3. Build
- [ ] R artifact deliverable.draft — A first-draft deliverable exists in the artifact pane with real, specific content (not a placeholder or one liner).
- [ ] B check build.explains — They can explain a choice they made in the draft and why.

## 4. Wrap
- [ ] R discuss wrap.recap — They've heard a short playback of what they did today and had a chance to correct it.
- [ ] B discuss wrap.next — They know what tomorrow builds toward.
`.trim(),

  // Content this session can put on the canvas. Keys are the [SHOW: <key>] targets
  // and the canvasDefaults values. Each entry is a CanvasDirective minus its runtime
  // id (the resolver injects id = key). Payload shapes match the client renderers.
  // `artifact:<id>` targets are dynamic (they read live session.artifacts) and are
  // NOT declared here.
  canvasProgram: {
    'reading.brief': {
      type: 'reading',
      title: "Today's brief",
      payload: { markdown: '# Showcase Day\n\nThis is where the reading material for the day would render.\n\n- point one\n- point two' },
    },
    'deck.concept': {
      type: 'deck',
      title: 'The core concept',
      payload: {
        frames: [
          { kind: 'markdown', markdown: '## The concept\n\nFrame one.' },
          { kind: 'markdown', markdown: '## Why it matters\n\nFrame two.' },
          { kind: 'markdown', markdown: '## An example\n\nFrame three.' },
        ],
      },
    },
    'video.walkthrough': {
      type: 'video',
      title: 'Walkthrough',
      payload: { label: 'Concept walkthrough', durationLabel: '4:12', poster: '/session-assets/sample-video-poster.jpg', src: '/session-assets/sample-video.mp4' },
    },
    'image.diagram': {
      type: 'image',
      title: 'Reference diagram',
      payload: { src: '/session-assets/sample-image.jpg', alt: 'A reference diagram', caption: 'How the pieces fit together.' },
    },
    'browser.reference': {
      type: 'browser',
      title: 'Reference site',
      payload: { mode: 'mock', url: 'https://example.com/reference', html: '<h1>Reference</h1><p>A stand-in for an embedded reference page.</p>' },
    },
  },

  // Server's tier-2 canvas fallback (Fable's 3-tier [SHOW:] design): when server
  // focus advances to an objective and the model did NOT emit its own [SHOW:], the
  // server shows this objective's default target. Tier 1 = model [SHOW:]; tier 3 =
  // keep current. Values are canvasProgram keys (or `artifact:<id>`).
  canvasDefaults: {
    'intro.frame': 'reading.brief',
    'concept.seen': 'deck.concept',
    'concept.applied': 'image.diagram',
    'deliverable.draft': 'artifact:deliverable.draft',
    'wrap.recap': 'reading.brief',
  },

  // Artifact gates for `artifact`-type objectives. Key = the objective id. The
  // engine (Step 3) honors an artifact tick only once session.artifacts[id] exists
  // and its LEARNER-AUTHORED content length ≥ minChars (contract §2). `rubric` is
  // one sentence of what a good one contains — not enforced in v1, but injected
  // into the envelope when focus reaches the artifact, and the future artifact-
  // verifier's input. Author it now; retrofitting rubrics is the N-day tax.
  artifacts: {
    'deliverable.draft': {
      title: 'Deliverable draft',
      format: 'markdown',
      minChars: 200,
      rubric: 'Has a stated goal, at least two concrete specifics, and a next step — not a restated template.',
    },
  },

  // What the session opens on and what to preload from the durable learner record.
  entry: {
    canvas: 'reading.brief', // first canvas target shown at session open
    // Prose the engine passes to the entry turn telling it what to highlight from
    // the learner record (the record itself is loaded by the engine, Step 5).
    context: 'Greet them by name, note anything relevant they built or decided previously, and open on the brief.',
  },

  // Session-end report shape: the engine uses DEFAULT_REPORT_SCHEMA (below) unless
  // a day declares `exit: { reportSchema }` as a whole-schema override. Most days —
  // including this one — should NOT override (per-day copies were the review's
  // "convention vs chore" catch). The durable learner-record update is
  // engine-defined and seeded from the same fields.
}

// Engine-default session report schema (Fable review #2, Q8: engine default +
// optional per-day override — never copy this into packs). _session.js (Step 3/5)
// reads pack.exit?.reportSchema ?? DEFAULT_REPORT_SCHEMA.
export const DEFAULT_REPORT_SCHEMA = `
---
## What They Did Today
## Objectives (achieved / partial / missed — with evidence)
## Artifacts Produced
## Where They Got Stuck
## Parked Threads
## Flags for the Instructor
## Instrument Retro (engine self-notes — separate from learner data)
`.trim()

// Reserved TABLE target for lesson tangents unrelated to any objective
// (contract §3). The engine whitelists it via applyTurnEffects
// opts.extraTableIds; the validator forbids objectives claiming it.
export const TANGENT_TABLE_ID = 'tangent'

// ── RESEARCH LOG — Day-1 visuals (research-first pass, 2026-07-05) ───────────
// Sources are plain-text names/URLs; patterns are what was extracted and
// recreated in-grammar below. No third-party images embedded anywhere.
//
// (a) TAM/SAM/SOM — sources: Alejandro Cremades "TAM SAM SOM illustrated"
//     infographic (nested semicircles + 3 color-coded columns: Definition /
//     How to Estimate / Why It Matters / worked example "1.5B users × $30/yr =
//     $45B"); slideworks.io/resources/market-sizing-slides-tam-sam-som-examples;
//     gustdebacker.com/tam-sam-som-market/; salesintel.io "How to Calculate TAM,
//     SAM, and SOM Accurately" infographic.
//     Patterns: (1) nested circles for the concept + per-tier color-coded cards
//     with the SAME labeled sections in each — definition, how-to-estimate,
//     why-it-matters, worked example; (2) numbers shown as visible bottom-up
//     multiplication with the assumption next to each factor ("1,352 × $1,000 =
//     $1.352M" — slideworks), never a bare total; (3) the magnitude CASCADE is
//     the message (€2B → €100M → €5M — gustdebacker): each tier visibly ~10-50×
//     smaller, which is what makes the example land.
//     Recreated as: figure.tamsamsom (nested circles, kept) + deck.tamsamsom
//     (per-ring slides ANCHORED by the concentric figure frozen at that ring's
//     step, Cremades teaching card beneath each, and a `funnel` figure carrying
//     the boba cascade $30M → $600K → $54K — the taper is the message).
//
// (b) SWOT — sources: asana.com/resources/swot-analysis;
//     wordstream.com/blog/ws/2017/12/20/swot-analysis; anychart.com SWOT
//     quadrant chart gallery; venngage.com/blog/swot-analysis-templates/.
//     Patterns: (1) 2×2 grid with Internal/External + Helpful/Harmful axis
//     labels (kept in figure.swot); (2) the strongest templates lead each
//     quadrant with ONE guiding question, not a blank box; (3) specificity
//     rule — generic entries that could apply to anyone are the #1 failure
//     mode; strong examples name the competitor they beat.
//     Recreated as: figure.swot (grid, kept) + deck.swot (the quadrant grid
//     figure itself as slide 1, then the guiding-question card row + a
//     "sounds nice ✗ / actually a strength ✓" comparative example row for
//     the named-competitor rule).
//
// (c) Teen/creator earning vectors — sources: fortune.com 2026-06-09 "22
//     million teenagers making pocket money" (10% livestream, 16% resell, 10%
//     Roblox); greenlight.com/learning-center/earning/online-jobs-for-teens;
//     whop.com/blog/make-money-online-as-a-teen/; theaffiliatemonkey.com
//     Greenlight affiliate page ($10-$52/signup; user referrals $50/friend).
//     Patterns: (1) card-per-stream with a concrete named example, not a
//     category label; (2) real dollar figures as honest RANGES (tutoring
//     $15-50/hr, Etsy shops $500-2K/mo, referral bounties $10-50); (3) the
//     honest time-to-first-dollar contrast — services pay this week, content
//     channels earn ~$0 for months — is what separates credible explainers
//     from hype.
//     Recreated as: deck.vectors opening on a six-vector `iconrow` figure
//     (the field at a glance), split slides each carrying a "First dollar"
//     row with an honest number or an honest "$0 for months", every row
//     glyph-led (vector glyph / circle-dollar / clock).
// ──────────────────────────────────────────────────────────────────────────────

// ── Zachary — Day 1: The Investing Decision ──────────────────────────────────
// Authored against his interview profile (R2: profiles/zachary/noob-to-ai-
// entrepreneur-profile.md, 2026-07-02) + Jonathan's dry-run feedback (Phase
// T.4). Shape: EXPLORE the field → SIZE the slate → DECIDE. His arc slate is
// HIS OWN from the interview: (1) AI Investing Translator for Teens — lead,
// self-generated, his word "a simplified transy"; (2) AI Gear Comparison Tool
// (golf/soccer) — runner-up; (3) Peer Finance Education / Community — natural
// extension he surfaced ("I know people my age into it"). Explore adds earning
// vectors as first-class literacy (app/tool, faced/faceless influencer,
// affiliate, digital goods, services) crossed with his interest areas; the
// slate defaults to his interview slate unless the exploration moves him.
// Profile calibration baked into the masterPrompt: direct questions over
// open-ended; brief-answer register is fine; money + college-impressive are
// his real win conditions; the translator idea is HIS (ownership matters);
// pilot hard rule — never introduce arcs not sourced from his own words.
// Shared figure specs — the live canvas figures AND the deck frames that freeze
// them at a ring/build step reference the SAME spec object (one source, no
// drift between the deck anchor and the live build-up).
const TAMSAMSOM_SPEC = {
  rings: [
    { id: 'tam', label: 'TAM', sublabel: 'everyone who could use it', value: null, step: 'tam' },
    { id: 'sam', label: 'SAM', sublabel: 'the slice you can reach', value: null, step: 'sam' },
    { id: 'som', label: 'SOM', sublabel: 'year-one winnable', value: null, step: 'som' },
  ],
  callouts: [
    { id: 'c1', ringId: 'tam', text: 'boba example: everyone who buys drinks in your city', step: 'values' },
    { id: 'c2', ringId: 'sam', text: '~2,000 kids within 10 min of your spot', step: 'values' },
    { id: 'c3', ringId: 'som', text: '200 pass daily × 1-in-4 stop × $6 average', step: 'values' },
  ],
  steps: ['base', 'tam', 'sam', 'som', 'values'],
}

// His slate (Explore movement, Phase T.5 "dynamic slate"): shared by
// deck.brief's slide-2 iconrow AND the live `figure.slate` canvas target so
// the two never drift. Live-injectable: a live [FIG: figure.slate :: add=
// "Label|sub"] appends an arc he adds/swaps mid-Explore (max 6 total); item
// `sub`s are also value-injectable if a live detail materializes for one.
const SLATE_SPEC = {
  title: 'Your slate — from your interview, in your own words',
  items: [
    { id: 'translator', glyph: 'chart', label: 'AI Investing Translator', sub: 'Your idea — "a simplified transy." Stock jargon in, plain language out.' },
    { id: 'gear', glyph: 'wrench', label: 'AI Gear Comparison', sub: 'Golf/soccer picks by skill level and budget, minus the review noise.' },
    { id: 'community', glyph: 'people', label: 'Peer Finance Community', sub: 'The translator plus people your age tracking and talking about it.' },
  ],
}

// Live sizing SCOREBOARD (Phase T.4h — replaces the document-first sizing
// flow): his three slate arcs as columns (ids match SLATE_SPEC's item ids —
// same arcs, one namespace), TAM/SAM/SOM/Gap/Gut as rows beneath each. Cells
// start empty ("—" placeholder client-side) and fill live as numbers/facts get
// agreed in chat, one [FIG: figure.scoreboard :: <col>.<row>=<value>] per
// agreed cell (masterPrompt Sizing rules, below). The per-arc memos become
// Director-drafted CONSOLIDATIONS of this board (see canvasDefaults + the
// masterPrompt), not documents worked up independently.
const SCOREBOARD_SPEC = {
  title: 'Sizing scoreboard — all three arcs, side by side',
  cols: [
    { id: 'translator', label: 'AI Investing Translator', sub: 'his idea — "a simplified transy"' },
    { id: 'gear', label: 'AI Gear Comparison', sub: 'golf / soccer picks' },
    { id: 'community', label: 'Peer Finance Community', sub: 'translator + his people' },
  ],
  rows: [
    { id: 'tam', label: 'TAM' },
    { id: 'sam', label: 'SAM' },
    { id: 'som', label: 'SOM' },
    { id: 'gap', label: 'Gap' },
    { id: 'gut', label: 'Gut' },
  ],
  cells: {},
}

const SWOT_SPEC = {
  rows: ['Inside — yours to control', 'Outside — the world'],
  cols: ['Helps you', 'Hurts you'],
  quadrants: [
    {
      id: 's', label: 'Strengths', step: 'grid',
      items: [
        { id: 's1', text: "You ARE the customer — Investopedia can't fake that", step: 'fill' },
        { id: 's2', text: 'Direct line to the exact audience: school, team, the friends who ask', step: 'fill' },
      ],
    },
    {
      id: 'w', label: 'Weaknesses', step: 'grid',
      items: [
        { id: 'w1', text: "No track record; hasn't put real money in the market yet", step: 'fill' },
        { id: 'w2', text: 'TikTok will always be more entertaining', step: 'fill' },
      ],
    },
    {
      id: 'o', label: 'Opportunities', step: 'grid',
      items: [
        { id: 'o1', text: 'Under-18s structurally locked out; nobody serves them at their level', step: 'fill' },
      ],
    },
    {
      id: 't', label: 'Threats', step: 'grid',
      items: [
        { id: 't1', text: 'A broker ships a "teen mode" — what is the answer if they do?', step: 'fill' },
      ],
    },
  ],
  callouts: [
    { id: 'rule', quadrantId: 's', text: 'Rule: a strength must beat a NAMED competitor', step: 'fill' },
  ],
  steps: ['grid', 'fill'],
}

const ZACHARY_DAY_1 = {
  day: 1,
  title: 'The Investing Decision',
  oneLine: 'Explore the field (his interests × the ways builders earn), learn the sizing toolkit, size his slate, then decide which arc the next six weeks build.',

  pronouns: { subject: 'he', object: 'him', possessive: 'his', possessivePronoun: 'his', reflexive: 'himself' },

  // Day 1 is the long outlier day (2-3 hrs, resumable across sittings).
  budget: { maxTurns: 150, targetMinutes: 150 },

  masterPrompt: `
Today you are running Zachary's Day 1: decision day, in three movements — EXPLORE
the field, SIZE the slate, DECIDE. He interviewed on 2026-07-02 and generated his
own venture idea — an AI investing translator for teens (his word:
"a simplified transy") — plus a runner-up (AI gear comparison for golf/soccer)
and a third direction (peer finance community). Today he first sees the field
honestly — his real interest areas (golf, soccer, weightlifting/the gym,
investing/career) crossed with the six ways people actually earn from a build —
then locks a slate of ~3 arcs, learns four sizing tools, sizes every arc on the
slate, and picks the one the next six weeks build.

Explore rules:
- The slate is HIS. Recap his interview slate first, then open the field wider —
  interests × earning vectors — so the decision is informed, not railroaded. He
  may add or swap an arc from this exploration; if nothing moves him, the
  interview slate stands unchanged and that is a fine outcome.
- The three sizing memo panes map to his locked slate in order; if he swapped an
  arc during Explore, that slot's memo sizes the swap instead of the original.
- If he adds or swaps an arc during Explore, put the change on the slate FOR
  REAL in the same turn: [FIG: figure.slate :: add="Label|one-line sub"] then
  [SHOW: figure.slate] — the slate is live now, not a static recap.

Teaching rules:
- Spell out every acronym on first use, and teach the idea in plain words BEFORE
  showing its framework figure. SWOT especially: explain the four words and why
  the grid exists before showing it. Same for TAM/SAM/SOM (Total Addressable /
  Serviceable / Obtainable Market) and GTM (Go-To-Market).
- Teach top-down vs bottom-up in chat before building the circles figure:
  top-down ("teen fintech is $2B, if we get 1%...") sounds big and proves
  nothing; bottom-up (count real people × real price, assumption written next to
  each number) is checkable. Round numbers are fine; wrong by 2x is normal;
  wrong by 100x means an assumption broke — find which one.

Sizing rules — work the LIVE SCOREBOARD, not a document:
- The boba example lives on figure.tamsamsom ONLY. The scoreboard columns are HIS three arcs — never park practice numbers there, and always name which arc a number belongs to before landing it.
- His three arcs (translator, gear, community) sit as side-by-side columns on
  one scoreboard figure, TAM/SAM/SOM/Gap/Gut rows beneath each. This REPLACES
  working one memo document at a time: the scoreboard is the shared workspace
  where the sizing actually happens; the memos come later, drawn from it.
- The instant a number or fact for an arc is agreed in chat, land it on the
  board THAT SAME TURN with [FIG: figure.scoreboard :: <col>.<row>=<value>]
  (col = translator|gear|community, row = tam|sam|som|gap|gut) — say-do, no
  exceptions. "Gap" is the one-line named-competitor gap from the landscape
  work; "Gut" is his 1-10 score for that arc plus one line why.
- Work the board in whatever order the conversation earns — don't force a
  rigid row-by-row or column-by-column march — but because three columns are
  live in parallel, ALWAYS name which arc you're asking about in the ask
  itself; an unnamed question is ambiguous the moment more than one is open.
- Once an arc's column reads complete (all five rows filled and he's
  confirmed them), CONSOLIDATE that arc's memo FROM the scoreboard: in the
  same turn, draft [ARTIFACT: sizing.<arc>] pulling the agreed scoreboard
  values plus the SWOT/GTM ground already covered in chat, then
  [SHOW: artifact:sizing.<arc>] so he sees the draft land. He edits it to make
  it his — the tick gate (edited-after-your-draft + ownership check) is
  unchanged; the scoreboard just means he never retypes a number already
  agreed live.

How to work with him, from his interview:
- Ask DIRECT questions, not open-ended ones. "How many kids at your school have
  asked you about stocks?" beats "what do you think about the market?" He answers
  direct questions well and goes quiet on vague ones.
- Short answers are his register, not disengagement. Don't fish for enthusiasm;
  push for specifics instead.
- His stated win conditions are real money first, college-impressive second. Keep
  both visible when sizing — revenue paths and "this looks serious on an
  application" are the frames that land.
- The translator idea is HIS. He surfaced it himself. Treat him as the founder
  evaluating his own idea honestly, not a student receiving one.
- HARD RULE (scoped precisely): never PITCH a venture direction as his, or imply
  he said something he didn't — the interview pilot proved fabricated "his" arcs
  break trust instantly. But this rule is about OWNERSHIP, not information:
  bringing in outside data as EXPLORATION FUEL is allowed and encouraged — lists
  of what people his age are into, market categories, competitor facts, "here
  are ten common directions, react to them." That IS the research skill this
  course teaches. Present outside material as a menu he reacts to; ownership
  comes from HIS pick and HIS stated reason, never from the menu's origin. If he
  ASKS you to widen the field ("what else is out there?", "look up what teens
  are into"), do it from your knowledge, clearly framed as outside data — refusing
  a legitimate research request is rigidity, not discipline.
- Numbers over vibes. When he estimates, make him write the assumption next to
  the number. Wrong-by-2x is fine; unexamined is not.
- He said he finishes things when expectations are external, interest is live, or
  his own bar is engaged. Today, be the external expectation — hold the deadline
  energy of "we decide TODAY," warmly.`.trim(),

  objectivesMd: `
## 1. Opening — the slate and the stakes
- [ ] R discuss open.frame — He's heard the shape of today (explore the field, size the slate, decide), seen his own interview slate played back — translator (his idea), gear tool, peer community — and said go.

## 2. Explore the field
- [ ] R discuss explore.vectors — He's seen the six earning vectors on canvas — app/tool, faced influencer, faceless influencer, affiliate/social marketing, digital goods, services — each with a teen-real example and how the money actually shows up.
- [ ] R check explore.match — He's matched at least one earning vector to one of HIS interest areas (golf, soccer, the gym, investing/career) in his own words — what the thing would be and who pays.
- [ ] R discuss explore.lock — The sizing slate is locked at ~3 arcs — his interview slate by default, plus anything he added or swapped from the exploration — and he's said it's his list.

## 3. The sizing toolkit
- [ ] R discuss tools.tam.seen — TAM/SAM/SOM spelled out (Total Addressable / Serviceable / Obtainable Market) and taught in plain words FIRST, then the circles figure built up step by step through the boba worked example.
- [ ] R check tools.tam.applied — He's bottom-up sized a fresh example that is NOT one of his arcs (e.g. a boba stand at his school) in his own numbers, with the assumption stated next to each number.
- [ ] R discuss tools.landscape.seen — He's seen the competitive landscape frame (direct / indirect / substitute-incl-doing-nothing) and clicked through the four player types in his space: parent-gated accounts, jargon-heavy content sites, finfluencers, and school.
- [ ] R discuss tools.swot.seen — SWOT spelled out (Strengths, Weaknesses, Opportunities, Threats) and taught BEFORE the grid figure appears, with the comparative-strength rule (a strength must beat a named competitor, not just sound nice).
- [ ] R check tools.swot.applied — He's produced at least one genuine entry per SWOT quadrant for ONE of his arcs, out loud, before writing anything.
- [ ] R discuss tools.gtm.seen — GTM spelled out (Go-To-Market): channel, first-10-users plan, and why-they-pay — grounded in distribution he already has (his school, his team, the friends who ask him about stocks).

## 4. Size the slate
- [ ] R artifact sizing.translator — A sizing memo for the AI Investing Translator exists and is HIS: TAM/SAM/SOM/Gap/Gut worked out live on the sizing scoreboard, then consolidated into a draft and edited/owned by him — assumptions on every number, 3 named competitors + the gap, top SWOT entries, first GTM move.
- [ ] R artifact sizing.gear — The same memo for slate slot 2 (default: the AI Gear Comparison Tool) — scoreboard work consolidated into a draft he then edited and owns.
- [ ] R artifact sizing.community — The same memo for slate slot 3 (default: the Peer Finance Community) — scoreboard work consolidated into a draft he then edited and owns.
- [ ] B check sizing.compare — Looking at the filled scoreboard side by side, he's said which arc surprised him — where the numbers came out different than his gut expected.

## 5. Decide
- [ ] R artifact decision.memo — The decision memo exists: chosen arc, top 3 reasons each tied to a number or fact from his sizing memos (not vibes), the switch condition ("what would have to be true for me to change to the runner-up"), and the first build step.
- [ ] R check decision.defended — He's answered a direct challenge to his decision (strongest counter-argument from his own memos) with sizing-grounded reasoning, not just restated preference.

## 6. Wrap
- [ ] R discuss wrap.recap — He's heard a playback of what he did today — the field explored, a slate sized, one decision, his reasons — and had the chance to correct it.
- [ ] B discuss wrap.next — He knows tomorrow starts building the chosen arc, and what the first concrete artifact will be.
`.trim(),

  canvasProgram: {
    // Visual deck (Deck Author contract, header). The Director's chat carries the
    // full prose for each beat; these slides carry the punch. Slate items are HIS
    // interview slate verbatim — never invent arcs (masterPrompt HARD RULE).
    // SHAPE-LED (Deck Author contract): the slate and the toolkit are ICONROW
    // figures — the text-card versions were the "rectangular text boxes" fail.
    'deck.brief': {
      type: 'deck',
      title: 'Day 1 — The Investing Decision',
      payload: {
        frames: [
          {
            kind: 'statement',
            kicker: 'Day 1 — Decision Day',
            text: 'Today you decide what the next six weeks build.',
            sub: 'Three movements: explore the field, size the slate, decide.',
          },
          {
            kind: 'figure',
            figureKind: 'iconrow',
            spec: SLATE_SPEC,
          },
          {
            kind: 'figure',
            figureKind: 'iconrow',
            spec: {
              title: 'Movement 2 — the four sizing tools',
              items: [
                { id: 'tam', glyph: 'circle-dollar', label: 'TAM / SAM / SOM', sub: 'Total Addressable / Serviceable / Obtainable Market — how big, really?' },
                { id: 'landscape', glyph: 'people', label: 'Landscape', sub: "Who's already there, and what's the gap?" },
                { id: 'swot', glyph: 'grid', label: 'SWOT', sub: 'Strengths, Weaknesses, Opportunities, Threats.' },
                { id: 'gtm', glyph: 'cart', label: 'GTM', sub: 'Go-To-Market: the first 10 users, and why anyone pays.' },
              ],
            },
          },
          {
            kind: 'stat',
            value: '3 → 1',
            label: 'Three sized arcs go in. One decision comes out.',
            note: 'By end of day: three sizing memos, one decision memo, one chosen arc.',
          },
          {
            kind: 'statement',
            kicker: 'The bar',
            text: 'Real money first. College-impressive second.',
            sub: 'Your win conditions, your words. Every number you write today serves them.',
          },
        ],
      },
    },
    // SHAPE-LED: opens on the six-vector ICONROW (the field at a glance); each
    // per-vector slide keeps the researched card rows but every row carries a
    // GLYPH — the vector's own shape on the example, circle-dollar on Who pays,
    // clock on First dollar (time-to-money is the honest contrast).
    'deck.vectors': {
      type: 'deck',
      title: 'Six ways people your age actually earn',
      payload: {
        frames: [
          {
            kind: 'figure',
            figureKind: 'iconrow',
            spec: {
              title: 'Six ways builders your age actually make money',
              items: [
                { id: 'app', glyph: 'phone', label: 'App / tool', sub: 'Build a thing people use.' },
                { id: 'faced', glyph: 'video', label: 'Faced', sub: 'You, on camera.' },
                { id: 'faceless', glyph: 'mask', label: 'Faceless', sub: 'The channel, minus your face.' },
                { id: 'affiliate', glyph: 'tag', label: 'Affiliate', sub: 'A cut of sales you cause.' },
                { id: 'goods', glyph: 'cart', label: 'Digital goods', sub: 'Make once, sell forever.' },
                { id: 'services', glyph: 'wrench', label: 'Services', sub: 'Do the job, cash now.' },
              ],
            },
          },
          {
            kind: 'split',
            heading: '1 · App / tool',
            text: 'Build a thing people use. Your translator idea lives here — investing jargon in, plain English out.',
            visual: {
              type: 'items',
              items: [
                { glyph: 'phone', title: 'Teen-real example', text: 'A study-tool site at $3/month, built and run by a high schooler.' },
                { glyph: 'circle-dollar', title: 'Who pays', text: 'Subscribers — or a parent pays for it.' },
                { glyph: 'clock', title: 'First dollar', text: 'Honestly weeks away — one classmate paying $3/month is the real first milestone.' },
              ],
            },
          },
          {
            kind: 'split',
            heading: '2 · Influencer — faced',
            text: 'You, on camera, building an audience around something you actually do.',
            visual: {
              type: 'items',
              items: [
                { glyph: 'video', title: 'Teen-real example', text: 'A golf account testing budget clubs on camera — gear brands sponsor exactly this.' },
                { glyph: 'circle-dollar', title: 'Who pays', text: 'Sponsors, ad revenue, affiliate links — once the audience is real.' },
                { glyph: 'clock', title: 'First dollar', text: 'Honestly: months of $0. Most channels earn nothing until the audience is real — affiliate links pay before sponsors ever call.' },
              ],
            },
          },
          {
            kind: 'split',
            heading: '3 · Influencer — faceless',
            text: 'The channel without your face: edits, voiceover, curation, AI-assisted production.',
            visual: {
              type: 'items',
              items: [
                { glyph: 'mask', title: 'Teen-real example', text: 'A soccer-highlights + gear-breakdown page run entirely behind the scenes.' },
                { glyph: 'circle-dollar', title: 'Who pays', text: 'Same money as faced — sponsors, ads, affiliate — without being the face.' },
                { glyph: 'clock', title: 'First dollar', text: 'Same honest $0 stretch as faced — the edge is you can run more than one channel at once.' },
              ],
            },
          },
          {
            kind: 'split',
            heading: '4 · Affiliate / social',
            text: "Send buyers to someone else's product; take a cut of every sale you cause.",
            visual: {
              type: 'items',
              items: [
                { glyph: 'tag', title: 'Teen-real example', text: "Parent-gated brokers (Greenlight, Fidelity Youth) pay for teen sign-ups they can't reach themselves." },
                { glyph: 'circle-dollar', title: 'Who pays', text: 'The company — commission per purchase you drove.' },
                { glyph: 'clock', title: 'First dollar', text: 'Fast if the audience exists: finance-app referral bounties run $10–$50 per signup. One link, one friend, this week.' },
              ],
            },
          },
          {
            kind: 'split',
            heading: '5 · Digital goods',
            text: 'Make it once, sell it forever: guides, templates, presets. Zero marginal cost.',
            visual: {
              type: 'items',
              items: [
                { glyph: 'cart', title: 'Teen-real example', text: '"Your first $100 in the market — legally, under 18": a $9 starter guide.' },
                { glyph: 'circle-dollar', title: 'Who pays', text: 'Buyers, per download — every copy after the first is pure margin.' },
                { glyph: 'clock', title: 'First dollar', text: 'A $9 guide can sell on day one. The hard part is buyer #100, not buyer #1.' },
              ],
            },
          },
          {
            kind: 'split',
            heading: '6 · Services',
            text: 'Do the thing for money, now. Fastest cash of all six — and the only one that never scales past your own hours.',
            visual: {
              type: 'items',
              items: [
                { glyph: 'wrench', title: 'Teen-real example', text: 'Setting up AI study tools for classmates at $20 a setup.' },
                { glyph: 'circle-dollar', title: 'Who pays', text: 'The person you did the job for — paid per job, cash now.' },
                { glyph: 'clock', title: 'First dollar', text: 'This week. $20 for one setup, cash in hand — the fastest first dollar of all six.' },
              ],
            },
          },
          {
            kind: 'statement',
            kicker: 'The move',
            text: 'Most real businesses stack two or three vectors.',
            sub: 'Investing × app = your translator. Golf × faceless influencer = a gear channel you never appear on. Same interest, different vector = a different business.',
          },
        ],
      },
    },
    // Research-first (see RESEARCH LOG above): Cremades per-tier card pattern —
    // every ring gets Definition / How to estimate / Why it matters / worked
    // example WITH NUMBERS, then a 3-column recap row carrying the cascade.
    // All numbers are the boba example already in figure.tamsamsom's callouts,
    // extended consistently: $6 average, ~2,000 kids in reach, 200 pass daily.
    'deck.tamsamsom': {
      type: 'deck',
      title: 'TAM / SAM / SOM — the sizing tool',
      payload: {
        frames: [
          {
            kind: 'statement',
            kicker: 'Tool 1 — Market sizing',
            text: 'How big is this — really?',
            sub: 'TAM / SAM / SOM: Total Addressable, Serviceable, and Obtainable Market. Three circles, one honest answer.',
          },
          {
            kind: 'columns',
            heading: 'Two ways to size — only one survives questions',
            columns: [
              {
                title: 'Top-down',
                icon: '↓',
                sections: [
                  { label: 'The move', text: 'Start from a giant industry report and claim a sliver: "teen fintech is $2B — if we get just 1%…"' },
                  { label: 'The problem', text: "Sounds huge, proves nothing. Nobody can check the 1% — it's a wish wearing a number." },
                ],
                example: '"$2B × 1% = $20M" — zero checkable assumptions',
              },
              {
                title: 'Bottom-up',
                icon: '↑',
                sections: [
                  { label: 'The move', text: 'Count real people, multiply by a real price, and write the assumption next to every number.' },
                  { label: 'The test', text: 'Wrong by 2× is normal. Wrong by 100× means one assumption broke — and you can find which one.' },
                ],
                example: 'real count × real price = a number you can defend',
              },
            ],
          },
          // Each ring slide is ANCHORED by the concentric figure frozen at that
          // ring's build step (shared TAMSAMSOM_SPEC — same shape the live
          // figure builds later), then its teaching card follows.
          { kind: 'figure', figureKind: 'concentric', spec: TAMSAMSOM_SPEC, step: 'tam' },
          {
            kind: 'split',
            heading: 'TAM — Total Addressable Market',
            text: 'Everyone who could ever use the thing, with zero limits on reach. The ceiling, not the plan.',
            visual: {
              type: 'items',
              items: [
                { icon: '≡', title: 'How to estimate', text: 'Count every possible customer, times what each one is worth per year.' },
                { icon: '?', title: 'Why it matters', text: 'Tells you if the ceiling is worth standing under — "is this pond big enough."' },
                { icon: '$', title: 'Boba stand math', text: '~100,000 drink-buyers in your city × ~$300 a year on drinks ≈ a $30M ceiling.' },
              ],
            },
          },
          { kind: 'figure', figureKind: 'concentric', spec: TAMSAMSOM_SPEC, step: 'sam' },
          {
            kind: 'split',
            heading: 'SAM — Serviceable Available Market',
            text: 'The slice of TAM you can actually reach — your geography, your age group, your channel. Real limits applied.',
            visual: {
              type: 'items',
              items: [
                { icon: '≡', title: 'How to estimate', text: 'Apply your real constraints to the TAM count: who can physically get to you — and would.' },
                { icon: '?', title: 'Why it matters', text: 'This is your actual playing field. If SAM is tiny, no product genius fixes it.' },
                { icon: '$', title: 'Boba stand math', text: '~2,000 kids within 10 minutes of your spot × ~$300 a year ≈ $600K reachable.' },
              ],
            },
          },
          { kind: 'figure', figureKind: 'concentric', spec: TAMSAMSOM_SPEC, step: 'som' },
          {
            kind: 'split',
            heading: 'SOM — Serviceable Obtainable Market',
            text: 'What you can realistically win in year one, against the competition, with the hours you actually have.',
            visual: {
              type: 'items',
              items: [
                { icon: '≡', title: 'How to estimate', text: 'Count who shows up: foot traffic × stop rate × price. Every factor is a written assumption.' },
                { icon: '?', title: 'Why it matters', text: "The only number that pays you — the honest year-one revenue guess, and your first target." },
                { icon: '$', title: 'Boba stand math', text: '200 walk past daily × 1-in-4 stop × $6 = $300 a day — ≈ $54K over a school year.' },
              ],
            },
          },
          // The cascade recap IS the shape: a funnel — each band visibly ~50×
          // smaller than the last (the gustdebacker magnitude-cascade pattern).
          {
            kind: 'figure',
            figureKind: 'funnel',
            spec: {
              title: 'The boba stand, sized end to end',
              bands: [
                { id: 'tam', label: 'TAM', value: '100,000 × $300 ≈ $30M', sub: 'everyone in your city who buys drinks — the ceiling' },
                { id: 'sam', label: 'SAM', value: '2,000 × $300 ≈ $600K', sub: 'kids close enough to actually come — your reach' },
                { id: 'som', label: 'SOM', value: '50/day × $6 × 180 ≈ $54K', sub: '200 pass, 1-in-4 stop — the plan' },
              ],
            },
          },
          {
            kind: 'statement',
            kicker: 'The rule',
            text: 'Every number gets its assumption written next to it.',
            sub: "Wrong by 2× is normal and fixable. A number with no assumption behind it can't even be wrong.",
          },
        ],
      },
    },
    'figure.tamsamsom': {
      type: 'figure',
      title: 'TAM / SAM / SOM — sizing a market',
      payload: { kind: 'concentric', spec: TAMSAMSOM_SPEC },
    },
    'browser.competitors': {
      type: 'browser',
      title: 'Who is already in the space',
      payload: {
        mode: 'mock',
        url: 'https://research.local/teen-investing-landscape',
        html: `<style>
body{font-family:system-ui;margin:0;color:#111;background:#fff}
nav{position:sticky;top:0;background:#1a3a5c;padding:10px 16px;display:flex;gap:10px;flex-wrap:wrap}
nav a{color:#fff;font-size:12px;text-decoration:none;border:1px solid rgba(255,255,255,.35);border-radius:99px;padding:3px 10px}
main{padding:16px;max-width:720px}
section{border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:14px 0;scroll-margin-top:56px}
b.tag{font-size:11px;background:#e6edf3;color:#1a3a5c;border-radius:4px;padding:2px 6px;letter-spacing:.04em}
h3{margin:8px 0 4px}
table{border-collapse:collapse;font-size:12.5px;margin:8px 0}
td,th{border:1px solid #e5e7eb;padding:4px 8px;text-align:left}
p{font-size:13.5px;line-height:1.5}
.miss{color:#b91c1c;font-weight:600}.nail{color:#15803d;font-weight:600}
</style>
<nav><a href="#greenlight">Greenlight / Fidelity Youth</a><a href="#investopedia">Investopedia</a><a href="#finfluencers">Finfluencers</a><a href="#school">School</a><a href="#gap">The gap</a></nav>
<div style="padding:8px 16px;background:#e6edf3;font-size:12.5px">
  Real sites (open in a new tab — they don't allow embedding):
  <a href="https://greenlight.com" target="_blank" rel="noopener">greenlight.com ↗</a> ·
  <a href="https://www.fidelity.com/go/youth-account/overview" target="_blank" rel="noopener">Fidelity Youth ↗</a> ·
  <a href="https://www.investopedia.com" target="_blank" rel="noopener">investopedia.com ↗</a>
</div>
<main>
<h1>Teen investing — who's already in the space</h1>
<p>Four player types. Click through each; for every player ask: <b>what do they nail, and what do they miss?</b></p>
<section id="greenlight"><b class="tag">PARENT-GATED ACCOUNTS</b><h3>Greenlight · Fidelity Youth</h3>
<p>Real brokerage accounts for minors — real money, real trades.</p>
<table><tr><th>Pricing</th><td>Greenlight: $5.99–14.98/mo (the parent pays). Fidelity Youth: free with a parent account.</td></tr>
<tr><th>Built for</th><td>The PARENT. Parent opens it, parent monitors it, the app markets to the parent.</td></tr></table>
<p><span class="nail">Nails:</span> legitimacy, real money, parental trust.<br>
<span class="miss">Misses:</span> nobody explains anything at the teen's level — the teen is a passenger in their own account.</p></section>
<section id="investopedia"><b class="tag">JARGON CONTENT</b><h3>Investopedia · broker "education" pages</h3>
<p>Millions of accurate articles, written for adults who already half-know the vocabulary — the average one assumes you know what "expense ratio" means by paragraph two.</p>
<p><span class="nail">Nails:</span> accuracy, depth, SEO — it owns every search result.<br>
<span class="miss">Misses:</span> a 16-year-old bounces off the third sentence. Zero odds-framing, zero "what would this mean for someone with $50."</p></section>
<section id="finfluencers"><b class="tag">FINFLUENCERS</b><h3>TikTok / YouTube finance</h3>
<p>Teen-native, entertaining, free — and unreliable. The solid explainer and the pump-and-dump look identical in the feed.</p>
<p><span class="nail">Nails:</span> reach, tone, the actual attention of your age group.<br>
<span class="miss">Misses:</span> trust. No way to verify anything; parents distrust it wholesale — which kills the "parent pays" path.</p></section>
<section id="school"><b class="tag">SCHOOL</b><h3>The econ class, maybe</h3>
<p>One unit, if that. Almost nobody leaves school knowing what an index fund is. The institution with the audience has no product.</p>
<p><span class="nail">Nails:</span> captive audience, built-in trust with parents.<br>
<span class="miss">Misses:</span> everything else — content, timing, relevance.</p></section>
<section id="gap"><b class="tag">THE GAP</b><h3>Simple + trustworthy + actually for teens</h3>
<p>Nobody holds all three. Parent-gated apps are trustworthy but not for teens. Content sites are trustworthy but not simple. Finfluencers are for teens but not trustworthy. School is none of the above, consistently.</p></section>
</main>
<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest('a[href^="#"]')
  if (!a) return
  e.preventDefault()
  var el = document.getElementById(a.getAttribute('href').slice(1))
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>`,
      },
    },
    // Research-first (see RESEARCH LOG above): the strongest SWOT templates
    // lead each quadrant with ONE guiding question, and the #1 failure mode is
    // generic entries — so the deck teaches the named-competitor rule with a
    // concrete weak-vs-strong example row before the grid figure appears.
    'deck.swot': {
      type: 'deck',
      title: 'SWOT — the honest-mirror tool',
      payload: {
        frames: [
          // SHAPE-LED: slide 1 IS the quadrant grid (shared SWOT_SPEC, frozen at
          // the empty 'grid' step — axes + four labeled boxes, no entries yet).
          // The filled version stays the live figure.swot's job.
          { kind: 'figure', figureKind: 'quadrant', spec: SWOT_SPEC, step: 'grid' },
          {
            kind: 'columns',
            heading: 'Four boxes, one guiding question each',
            columns: [
              {
                title: 'Strengths',
                icon: 'S',
                sections: [{ label: 'Ask', text: "What do you have that a named competitor can't copy?" }],
                example: "You ARE the customer — Investopedia can't fake 16",
              },
              {
                title: 'Weaknesses',
                icon: 'W',
                sections: [{ label: 'Ask', text: 'Where does a named competitor honestly beat you today?' }],
                example: 'TikTok will always be more entertaining than you',
              },
              {
                title: 'Opportunities',
                icon: 'O',
                sections: [{ label: 'Ask', text: "What's changing out in the world that opens a door you didn't build?" }],
                example: 'Under-18s are locked out — nobody serves them',
              },
              {
                title: 'Threats',
                icon: 'T',
                sections: [{ label: 'Ask', text: 'What outside move could hurt you even if you play perfectly?' }],
                example: 'A broker ships "teen mode" — what\'s your answer?',
              },
            ],
          },
          {
            kind: 'columns',
            heading: 'The strength test: it must beat a NAMED competitor',
            columns: [
              {
                title: 'Sounds nice ✗',
                sections: [
                  { label: 'The entry', text: '"I\'m passionate about investing and good with people."' },
                  { label: 'Why it fails', text: 'Every founder says it. It names nobody and beats nobody — a vibe, not a strength.' },
                ],
              },
              {
                title: 'Actually a strength ✓',
                sections: [
                  { label: 'The entry', text: '"I\'m 16 and I invest — Investopedia writes for adults and can\'t fake my age."' },
                  { label: 'Why it works', text: "It names the competitor and states the thing they structurally can't copy." },
                ],
              },
            ],
          },
          {
            kind: 'statement',
            kicker: 'The bar',
            text: 'A strength that beats nobody in particular is a hobby.',
            sub: 'One genuine entry per box, every entry aimed at a named player — then the grid earns its place in your memo.',
          },
        ],
      },
    },
    'figure.swot': {
      type: 'figure',
      title: 'SWOT — where your version wins or loses',
      payload: { kind: 'quadrant', spec: SWOT_SPEC },
    },
    // Live sizing scoreboard (Phase T.4h) — the sizing-phase default canvas.
    // Cells fill in real time via [FIG: figure.scoreboard :: col.row=value]
    // as numbers/facts get agreed per arc; the memos are consolidations OF
    // this board (see canvasDefaults + masterPrompt Sizing rules).
    'figure.scoreboard': {
      type: 'figure',
      title: 'Sizing scoreboard',
      payload: { kind: 'matrix', spec: SCOREBOARD_SPEC },
    },
    // Live, updatable slate (dynamic slate, Phase T.5) — same SLATE_SPEC as
    // deck.brief's slide 2, but addressable directly with [SHOW: figure.slate]
    // and updatable in real time with [FIG: figure.slate :: add="Label|sub"]
    // when he adds or swaps an arc during Explore (masterPrompt rule below).
    'figure.slate': {
      type: 'figure',
      title: 'Your slate',
      payload: { kind: 'iconrow', spec: SLATE_SPEC },
    },
    'reading.gtm': {
      type: 'reading',
      title: 'Go-To-Market (GTM) — how the first 10 users show up',
      payload: {
        markdown: `# Go-To-Market (GTM) — the honest version

GTM answers three questions. If a memo can't answer them, the arc has a problem no clever product fixes.

### 1. What's the channel?
Where do the first users actually come from? Not "social media" — a place you can name and reach **this month**. Your real channels: your school, your soccer team, the group chat, the specific friends who already ask you about stocks.

### 2. Who are the first 10 users — by name-ish?
If you can't picture 10 real people trying it in week one, the SOM number upstairs is fiction. "The 6 guys who asked me about stocks + 4 from the team" is a real answer.

### 3. Why would anyone pay — and who pays?
Free is a feature, not a business. Options worth one line each: subscription (teen pays? parent pays?), freemium, affiliate (parent-gated brokers pay for referrals — they NEED teen demand). You don't have to pick today — you have to show there's at least one credible path to real money. That's your win condition, on paper.`,
      },
    },
    'reading.memo-template': {
      type: 'reading',
      title: 'Sizing memo — the template',
      payload: {
        markdown: `# Sizing Memo — [ARC NAME]

*Write yours in the artifact pane. One memo per arc. Short is fine; specific is mandatory.*

### One-line pitch
What it is, for whom, in one sentence.

### TAM / SAM / SOM (bottom-up)
- TAM: [number] — (assumption: ...)
- SAM: [number] — (assumption: ...)
- SOM year 1: [number] — (assumption: ...)

### Landscape
- 3 named competitors and which player type each is
- **The gap**: what none of them do

### SWOT — top row of each quadrant
- S (must beat a named competitor):
- W (name who beats you):
- O:
- T:

### First GTM move
Channel + the first 10 users + one credible payment path.

### Gut score: __ / 10
One line on why.`,
      },
    },
    'reading.decision-template': {
      type: 'reading',
      title: 'Decision memo — the template',
      payload: {
        markdown: `# Decision Memo — Day 1

*The output of today. This is what the next six weeks execute.*

### The pick
[Arc name]

### Three reasons — each tied to a NUMBER or FACT from your sizing memos
1.
2.
3.
*(Vibes don't count. "SOM was 3× the gear tool's" counts.)*

### The switch condition
What would have to turn out TRUE for you to move to the runner-up? Write it now, while you're honest.

### First build step
The first concrete thing tomorrow's session builds.`,
      },
    },
  },

  canvasDefaults: {
    'open.frame': 'deck.brief',
    'explore.vectors': 'deck.vectors',
    'explore.match': 'deck.vectors',
    'explore.lock': 'figure.slate',
    // Teach-first (masterPrompt rule): the concept deck is the tier-2 default
    // for the *.seen objective; the model advances to the live figure with
    // [SHOW: figure.*@step] during the build-up; *.applied defaults to the figure.
    'tools.tam.seen': 'deck.tamsamsom',
    'tools.tam.applied': 'figure.tamsamsom',
    'tools.landscape.seen': 'browser.competitors',
    'tools.swot.seen': 'deck.swot',
    'tools.swot.applied': 'figure.swot',
    'tools.gtm.seen': 'reading.gtm',
    // Sizing phase defaults to the LIVE SCOREBOARD (Phase T.4h), not a memo
    // pane — the artifact only comes up when the Director explicitly
    // consolidates a completed column and [SHOW: artifact:sizing.<arc>]s it.
    'sizing.translator': 'figure.scoreboard',
    'sizing.gear': 'figure.scoreboard',
    'sizing.community': 'figure.scoreboard',
    'sizing.compare': 'figure.scoreboard',
    'decision.memo': 'artifact:decision.memo',
    'decision.defended': 'artifact:decision.memo',
    'wrap.recap': 'deck.brief',
  },

  artifacts: {
    'sizing.translator': {
      title: 'Sizing memo — AI Investing Translator',
      format: 'markdown',
      minChars: 400,
      rubric: 'Bottom-up TAM/SAM/SOM with an assumption written next to each number, 3 named competitors + the gap, one genuine entry per SWOT quadrant, a nameable channel + first-10 plan, and a gut score — not a restated template.',
    },
    'sizing.gear': {
      title: 'Sizing memo — slate slot 2 (default: AI Gear Comparison)',
      format: 'markdown',
      minChars: 400,
      rubric: 'Same bar as the translator memo — and the numbers must be its OWN (gear-buyer counts, not investing counts recycled). If he swapped this slot in Explore, the memo sizes the swapped arc.',
    },
    'sizing.community': {
      title: 'Sizing memo — slate slot 3 (default: Peer Finance Community)',
      format: 'markdown',
      minChars: 400,
      rubric: 'Same bar; for the community arc it must engage the honest weakness that a community needs the translator to exist first (or explain why not). If he swapped this slot in Explore, the memo sizes the swapped arc.',
    },
    'decision.memo': {
      title: 'Decision memo — Day 1',
      format: 'markdown',
      minChars: 300,
      rubric: 'A named pick, three reasons each tied to a number/fact from his own sizing memos, an honest switch condition, and a concrete first build step.',
    },
  },

  entry: {
    canvas: 'deck.brief',
    context:
      "Greet Zachary by name. Recall that the investing translator was HIS idea from the interview — his words, 'a simplified transy' — and that today has three movements: explore the field (his interests crossed with the ways builders actually earn), size the slate, decide. Frame the stakes his way: which of these can actually make real money and look serious on a college application. Then open on the brief.",
  },
  // exit: engine DEFAULT_REPORT_SCHEMA — no per-day override needed.
}

// Registry: courseSlug → ordered array of day packs. getSessionPack resolves a
// (courseSlug, dayId) pair. The `_showcase` course exists only to exercise the
// grammar.
const SESSION_PACKS = {
  _showcase: [SHOWCASE_DAY],
  'noob-to-ai-entrepreneur': [ZACHARY_DAY_1],
}

const OBJECTIVE_TYPES = new Set(['discuss', 'check', 'artifact'])
const LINE_RE = /^- \[ \]\s+([RB])\s+(discuss|check|artifact)\s+(\S+)\s+—\s+(.+)$/

// Parse the authored objectivesMd into { sections, objectives }. Mirrors
// _inventory.js's parseInventory but carries the objective TYPE.
function parseObjectives(md) {
  const sections = []
  let cur = null
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      cur = { name: line.slice(3).trim(), objectives: [] }
      sections.push(cur)
      continue
    }
    const m = line.match(LINE_RE)
    if (m && cur) {
      cur.objectives.push({
        id: m[3],
        required: m[1] === 'R',
        type: m[2],
        need: m[4].trim(),
        section: cur.name,
      })
    }
  }
  return { sections, objectives: sections.flatMap((s) => s.objectives) }
}

const CACHE = {}

// Resolve a day's session pack: parsed objectives + all authored fields, cached.
// Null if the course/day has no pack configured.
export function getSessionPack(courseSlug, dayId) {
  const days = SESSION_PACKS[courseSlug]
  if (!days) return null
  const day = days.find((d) => String(d.day) === String(dayId))
  if (!day) return null
  const cacheKey = `${courseSlug}#${dayId}`
  if (!CACHE[cacheKey]) {
    const parsed = parseObjectives(day.objectivesMd)
    CACHE[cacheKey] = {
      courseSlug,
      day: day.day,
      title: day.title,
      oneLine: day.oneLine,
      pronouns: day.pronouns,
      budget: day.budget,
      masterPrompt: day.masterPrompt,
      canvasProgram: day.canvasProgram,
      canvasDefaults: day.canvasDefaults,
      artifacts: day.artifacts,
      entry: day.entry,
      exit: day.exit,
      sections: parsed.sections,
      objectives: parsed.objectives,
    }
  }
  return CACHE[cacheKey]
}

// --- objective helpers (mirror _inventory.js so the engine reuses them 1:1) ---

export function newObjectiveState(pack) {
  const state = {}
  for (const o of pack.objectives) {
    state[o.id] = { ticked: false, tickedAtTurn: null, evidence: null }
  }
  return state
}

// The next required, un-ticked objective in document order — the current focus.
// Null when every required box is ticked (→ wrap-up).
export function focusObjective(pack, state) {
  return pack.objectives.find((o) => o.required && !state[o.id]?.ticked) || null
}

export function requiredCounts(pack, state) {
  const req = pack.objectives.filter((o) => o.required)
  const ticked = req.filter((o) => state[o.id]?.ticked).length
  return { ticked, total: req.length }
}

export function isComplete(pack, state) {
  return pack.objectives.filter((o) => o.required).every((o) => state[o.id]?.ticked)
}

export function progressInfo(pack, state) {
  const { ticked, total } = requiredCounts(pack, state)
  const f = focusObjective(pack, state)
  return { ticked, totalRequired: total, focus: f ? f.section : 'Wrapping up' }
}

// Is an artifact-type objective's gate satisfied? True for non-artifact objectives
// (their tick authority lives elsewhere). For artifact objectives, requires a stored
// artifact whose content meets the declared minChars. The engine (Step 3) calls this
// before honoring an artifact [TICK:]; exported here because the bar is pack-defined.
export function isArtifactSatisfied(pack, artifacts, id) {
  const obj = pack.objectives.find((o) => o.id === id)
  if (!obj) return false // unknown id: defensive — callers should have filtered already
  if (obj.type !== 'artifact') return true
  const gate = pack.artifacts?.[id]
  if (!gate) return false
  const art = artifacts?.[id]
  const content = art?.content ?? ''
  return typeof content === 'string' && content.trim().length >= (gate.minChars ?? 1)
}

// Figure element ids a [FIG:] tag may target, by kind — the apply-time
// validation set (unknown ids are dropped silently) and also surfaced in the
// system prompt's targets list so the model knows what it can inject onto.
export function figureElementIds(kind, spec) {
  if (!spec) return []
  if (kind === 'concentric') return (spec.rings || []).map((r) => r.id).filter(Boolean)
  if (kind === 'quadrant') return (spec.quadrants || []).map((q) => q.id).filter(Boolean)
  if (kind === 'iconrow') return (spec.items || []).map((i) => i.id).filter(Boolean)
  if (kind === 'funnel') return (spec.bands || []).map((b) => b.id).filter(Boolean)
  if (kind === 'bars') return (spec.bars || []).map((b) => b.id).filter(Boolean)
  if (kind === 'matrix') {
    const colIds = (spec.cols || []).map((c) => c.id).filter(Boolean)
    const rowIds = (spec.rows || []).map((r) => r.id).filter(Boolean)
    return colIds.flatMap((c) => rowIds.map((r) => `${c}.${r}`))
  }
  return []
}

// Merge runtime [FIG:] values + additions over an authored figure spec at
// resolve time (never mutates the authored spec — returns a new object).
// `values` = { [elementId]: string }; `added` = [{ id, label, sub, glyph? }]
// (iconrow only — the [FIG: key :: add="Label|sub"] mechanism, capped at 6
// total items). Per-kind slot (Fable review #3 §2.4, promoted + extended):
//   concentric — ringId sets that ring's `value`
//   funnel     — bandId sets that band's `value`
//   bars       — barId sets that bar's `value`
//   quadrant   — quadrantId APPENDS a new item to that quadrant (a live entry
//                landing in real time, not an overwrite of an authored one)
//   iconrow    — itemId sets that item's `sub`; `added` appends new items
//   matrix     — "colId.rowId" sets that cell's value (overlays spec.cells;
//                `added` unused — matrix has no runtime add-column mechanism)
export function mergeFigureValues(kind, spec, values, added) {
  if (!values && !(added && added.length)) return spec
  const v = values || {}
  if (kind === 'concentric') {
    return { ...spec, rings: (spec.rings || []).map((r) => (r.id && v[r.id] != null ? { ...r, value: v[r.id] } : r)) }
  }
  if (kind === 'funnel') {
    return { ...spec, bands: (spec.bands || []).map((b) => (b.id && v[b.id] != null ? { ...b, value: v[b.id] } : b)) }
  }
  if (kind === 'bars') {
    return { ...spec, bars: (spec.bars || []).map((b) => (b.id && v[b.id] != null ? { ...b, value: v[b.id] } : b)) }
  }
  if (kind === 'quadrant') {
    return {
      ...spec,
      quadrants: (spec.quadrants || []).map((q) => {
        if (!q.id || v[q.id] == null) return q
        const items = [...(q.items || []), { id: `${q.id}.live.${(q.items || []).length}`, text: v[q.id] }]
        return { ...q, items }
      }),
    }
  }
  if (kind === 'iconrow') {
    let items = (spec.items || []).map((it) => {
      if (!it.id || v[it.id] == null) return it
      // "New Label|new sub" RENAMES the item (arc swap); a plain value is sub-only.
      const val = String(v[it.id])
      if (val.includes('|')) {
        const [label, sub, glyph] = val.split('|').map((x) => x.trim())
        return {
          ...it,
          label: label || it.label,
          sub: sub != null ? sub : it.sub,
          ...(glyph && ICON_GLYPHS.includes(glyph) ? { glyph } : {}),
        }
      }
      return { ...it, sub: val }
    })
    if (added && added.length) {
      items = [...items, ...added.map((a) => ({ id: a.id, glyph: a.glyph || 'spark', label: a.label, sub: a.sub || '' }))].slice(0, 6)
    }
    return { ...spec, items }
  }
  if (kind === 'matrix') {
    // Dotted keys (col.row) are cell values; a bare col-id key RENAMES that
    // column — "New Label|new sub" or label-only (keeps the scoreboard
    // consistent after an arc swap on the slate).
    const cells = {}
    const cols = (spec.cols || []).map((c) => ({ ...c }))
    for (const [k, val] of Object.entries(v)) {
      if (k.includes('.')) {
        cells[k] = val
        continue
      }
      const col = cols.find((c) => c.id === k)
      if (!col) continue
      const cv = String(val)
      const bar = cv.indexOf('|')
      if (bar !== -1) {
        col.label = cv.slice(0, bar).trim()
        col.sub = cv.slice(bar + 1).trim()
      } else {
        col.label = cv
      }
    }
    return { ...spec, cols, cells: { ...(spec.cells || {}), ...cells } }
  }
  return spec
}

// Element ids that are STILL EMPTY on an (already-merged) figure spec, by kind
// — the read side of mergeFigureValues' write side, reused so "empty" means
// exactly what "fillable via [FIG:]" means, per kind, with zero pack-specific
// knowledge (T.4g, Fix 2):
//   concentric/funnel/bars — a ring/band/bar whose `value` is still nullish
//     (the authored `value: null` placeholder hasn't been overridden yet).
//   quadrant   — a quadrant with no items yet (mergeFigureValues APPENDS a
//     live item; zero items means nothing has landed on that box at all).
//   iconrow    — an item with no `sub` yet (mergeFigureValues OVERRIDES an
//     item's `sub`; an empty/absent sub means that item's detail hasn't
//     materialized in conversation yet).
// Called against the MERGED spec (post mergeFigureValues), so an id already
// filled by a live [FIG:] naturally drops out — the caller doesn't need to
// separately track "was this just filled".
export function unfilledFigureElementIds(kind, spec) {
  if (!spec) return []
  if (kind === 'concentric') return (spec.rings || []).filter((r) => r.id && (r.value === null || r.value === undefined || r.value === '')).map((r) => r.id)
  if (kind === 'funnel') return (spec.bands || []).filter((b) => b.id && (b.value === null || b.value === undefined || b.value === '')).map((b) => b.id)
  if (kind === 'bars') return (spec.bars || []).filter((b) => b.id && (b.value === null || b.value === undefined || b.value === '')).map((b) => b.id)
  if (kind === 'quadrant') return (spec.quadrants || []).filter((q) => q.id && (!q.items || q.items.length === 0)).map((q) => q.id)
  if (kind === 'iconrow') return (spec.items || []).filter((i) => i.id && !i.sub).map((i) => i.id)
  if (kind === 'matrix') {
    const cells = spec.cells || {}
    return figureElementIds('matrix', spec).filter((id) => cells[id] === null || cells[id] === undefined || cells[id] === '')
  }
  return []
}

// Instance id charset (Phase T.4f Tier 2 — instantiation): learner/model-chosen,
// short, filesystem-safe-ish. A malformed id degrades to the BASE figure (never
// throws, never blanks the canvas) — same "typo can't break the canvas" posture
// as the unknown-step-id degrade below.
export const INSTANCE_ID_RE = /^[a-z0-9-]{1,24}$/

// [SHOW: compare(targetA, targetB)] — Tier 2 compare view. Each side is any
// resolvable target string (key, key#instance, key@step, or key#instance@step).
// No nested compare() — a compare side is a plain target, not another compare.
const COMPARE_RE = /^compare\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)$/

// Resolve a [SHOW: <target>] / canvasDefault target to a CanvasDirective the client
// renders. Authored targets come from canvasProgram (id injected = key). Dynamic
// `artifact:<id>` targets read live session.artifacts. Unknown target → null (the
// engine then falls through to tier 3: keep current).
//
// Figure step grammar (contract §6): `<key>@<stepId>` — split on the FIRST `@`.
// For a figure target the directive's `id` is the BASE key (no `@`) so the client
// re-renders in place (same pane key, elements animate in) instead of remounting.
// `figureState` ({ [baseKey]: stepIndex }) supplies resume semantics: plain
// `[SHOW: key]` = last-shown step else 0; an UNKNOWN step id keeps the current
// step (a typo must never blank the canvas). `@` on a non-figure target is
// stripped and ignored. `figureValues`/`figureAdditions` ({ [baseKey]: ... }) are
// the live [FIG:] state merged over the authored spec (mergeFigureValues).
//
// Instantiation (Phase T.4f Tier 2): `<key>#<instanceId>[@<step>]` — an authored
// figure used as a TEMPLATE. The instance's directive id is `<key>#<instanceId>`
// (a distinct canvas identity from the base figure and from every other
// instance — the client remounts BETWEEN instances, same as any new target, but
// re-renders IN PLACE within one, exactly like a base figure's step advances).
// Per-instance state lives in `figureInstances` ({ [`${key}#${id}`]: { step,
// values } }) — completely independent of the base figure's own figureState/
// figureValues. A malformed instance id is dropped (degrades to the base figure).
//
// Compare (Phase T.4f Tier 2): `compare(a, b)` resolves BOTH sides recursively
// (through this same function) and returns a `compare` directive whose payload
// is `{ a: <CanvasDirective>, b: <CanvasDirective> }`. If either side fails to
// resolve, the whole compare fails (null) — tier-3 keeps whatever was already
// showing rather than rendering a half-broken compare.
export function resolveShowTarget(pack, target, artifacts, figureState, figureValues, figureAdditions, figureInstances) {
  if (!target) return null

  const cm = target.match(COMPARE_RE)
  if (cm) {
    const a = resolveShowTarget(pack, cm[1].trim(), artifacts, figureState, figureValues, figureAdditions, figureInstances)
    const b = resolveShowTarget(pack, cm[2].trim(), artifacts, figureState, figureValues, figureAdditions, figureInstances)
    if (!a || !b) return null
    return { type: 'compare', id: `compare(${a.id},${b.id})`, title: `${a.title} vs ${b.title}`, payload: { a, b } }
  }

  const at = target.indexOf('@')
  const beforeStep = at === -1 ? target : target.slice(0, at)
  const stepRef = at === -1 ? null : target.slice(at + 1)

  const hash = beforeStep.indexOf('#')
  const base = hash === -1 ? beforeStep : beforeStep.slice(0, hash)
  let instanceId = hash === -1 ? null : beforeStep.slice(hash + 1)
  if (instanceId && !INSTANCE_ID_RE.test(instanceId)) instanceId = null // malformed → degrade to the base figure

  if (base.startsWith('artifact:')) {
    const id = base.slice('artifact:'.length)
    const gate = pack.artifacts?.[id]
    const art = artifacts?.[id]
    if (!gate && !art) return null
    return {
      type: 'artifact',
      id: base,
      title: gate?.title || art?.title || id,
      payload: {
        format: gate?.format || art?.format || 'markdown',
        title: gate?.title || art?.title || id,
        content: art?.content ?? '',
      },
    }
  }
  const entry = pack.canvasProgram?.[base]
  if (!entry) return null
  if (entry.type !== 'figure') {
    return { type: entry.type, id: base, title: entry.title, payload: entry.payload }
  }
  const instKey = instanceId ? `${base}#${instanceId}` : base
  const steps = entry.payload?.spec?.steps || []
  const last = Math.max(steps.length - 1, 0)
  // Resume-or-0, then an explicit step part overrides (id preferred; numeric
  // index accepted + clamped; unknown id → keep current). Instances resume
  // from their OWN step, never the base figure's.
  let step = instanceId
    ? Math.min(Math.max(figureInstances?.[instKey]?.step ?? 0, 0), last)
    : Math.min(Math.max(figureState?.[base] ?? 0, 0), last)
  if (stepRef !== null) {
    if (/^\d+$/.test(stepRef)) {
      step = Math.min(Math.max(parseInt(stepRef, 10), 0), last)
    } else {
      const idx = steps.indexOf(stepRef)
      if (idx !== -1) step = idx
    }
  }
  const values = instanceId ? figureInstances?.[instKey]?.values : figureValues?.[base]
  const additions = instanceId ? undefined : figureAdditions?.[base] // add= not supported per-instance in v1
  const mergedSpec = mergeFigureValues(entry.payload?.kind, entry.payload.spec, values, additions)
  const title = instanceId ? `${entry.title} — ${instanceId}` : entry.title
  return { type: 'figure', id: instKey, title, payload: { ...entry.payload, spec: mergedSpec, step } }
}

// Render the objective board as a live markdown checklist for the envelope — shows
// tick state, type, per-objective canvas default, logged evidence, and the FOCUS
// marker. The engine drops this into every turn's envelope.
export function renderObjectiveBoard(pack, state, focusId) {
  const lines = [`# Session Objectives — Day ${pack.day}: ${pack.title}`]
  for (const s of pack.sections) {
    lines.push('', `## ${s.name}`)
    for (const o of s.objectives) {
      const box = state[o.id]?.ticked ? '[x]' : '[ ]'
      const tag = o.required ? 'R' : 'B'
      const canvas = pack.canvasDefaults?.[o.id] ? `  {canvas: ${pack.canvasDefaults[o.id]}}` : ''
      const rawEv = state[o.id]?.evidence
      // Sanitize: a quote containing `"` or newlines must not garble the board.
      const ev = rawEv ? `\n    evidence: "${String(rawEv).replace(/\s+/g, ' ').replace(/"/g, "'").trim()}"` : ''
      const focus = o.id === focusId ? '   ← FOCUS NOW' : ''
      lines.push(`- ${box} ${tag} ${o.type} ${o.id} — ${o.need}${canvas}${focus}${ev}`)
    }
  }
  return lines.join('\n')
}

// --- pack validation (author-time guardrail; run in tests + engine boot) ---

// Canvas types the client actually renders (src/components/session/canvas/*).
const CANVAS_TYPES = new Set(['reading', 'deck', 'video', 'image', 'browser', 'terminal', 'artifact', 'figure'])
// Figure kinds FigureCanvas routes (grows with renderers). Exported: the
// Stagehand (Phase T.4f Tier 3) validates a runtime-generated spec against the
// SAME set + rules as authored packs.
export const FIGURE_KINDS = new Set(['concentric', 'quadrant', 'funnel', 'iconrow', 'bars', 'matrix'])
// Mirrors GLYPHS in FigureCanvas.jsx — the validator's half of the glyph map.
// Adding a glyph: draw it there, name it here.
export const ICON_GLYPHS = new Set(['ball', 'trophy', 'dice', 'circle-dollar', 'phone', 'cart', 'people', 'chart', 'clock',
  'video', 'wrench', 'mask', 'tag', 'spark', 'grid',])
const ID_RE = /^[a-z0-9][a-z0-9.\-]*$/i // no commas (TICK comma-split) or ':' ('::' evidence delimiter)
// matrix col/row id charset — deliberately excludes '.' (unlike ID_RE above):
// a [FIG:] cell key joins "colId.rowId" on the dot, so a dot INSIDE either id
// would make that join ambiguous to split back apart.
const MATRIX_ID_RE = /^[a-z0-9-]+$/i

// Legacy shape: returns the ERRORS array only ([] = valid). Delegates to the
// full validator; callers that care about authoring-taste WARNINGS (e.g. a deck
// frame that reads as a text wall) use validateSessionPackFull.
export function validateSessionPack(rawDay, courseSlug = '_validate') {
  return validateSessionPackFull(rawDay, courseSlug).errors
}

// Full validation: { errors, warnings }. Errors are broken packs (engine relies
// on these invariants — fail loudly, not mid-session). Warnings are Deck Author
// contract violations that still render (fix them anyway).
export function validateSessionPackFull(rawDay, courseSlug = '_validate') {
  const errors = []
  const warnings = []
  const p = rawDay
  // Day ids are strings app-wide ("0", "0.1"); a number is accepted for authoring
  // convenience. Anything else (or a non-numeric string) is a mistake.
  if (!(typeof p.day === 'number' || (typeof p.day === 'string' && /^\d+(\.\d+)?$/.test(p.day)))) {
    errors.push('day: must be a number or numeric string ("0", "0.1")')
  }
  if (!p.title) errors.push('title: required')
  if (!p.masterPrompt) errors.push('masterPrompt: required')
  if (!p.pronouns?.subject || !p.pronouns?.object || !p.pronouns?.possessive) {
    errors.push('pronouns: must include subject/object/possessive')
  }
  if (p.budget !== undefined) {
    if (!(Number.isFinite(p.budget?.maxTurns) && p.budget.maxTurns > 0)) {
      errors.push('budget.maxTurns: must be a positive number')
    }
    if (p.budget?.targetMinutes !== undefined && !(Number.isFinite(p.budget.targetMinutes) && p.budget.targetMinutes > 0)) {
      errors.push('budget.targetMinutes: must be a positive number when present')
    }
  }

  const parsed = parseObjectives(p.objectivesMd || '')
  if (parsed.objectives.length === 0) errors.push('objectivesMd: no parseable objectives')
  if (!parsed.objectives.some((o) => o.required)) errors.push('objectivesMd: at least one R (required) objective needed')

  // THE SILENT-DROP GUARD (review #2, blocking A): any line that LOOKS like an
  // objective (`- [...]`) but doesn't match LINE_RE would otherwise just vanish
  // from the parse — an em-dash typed as a hyphen, `artefact`, `- [x]`, etc.
  const mdLines = (p.objectivesMd || '').split('\n')
  mdLines.forEach((raw, i) => {
    const line = raw.trim()
    if (/^- \[.?\]/.test(line) && !LINE_RE.test(line)) {
      errors.push(
        `objectivesMd line ${i + 1}: looks like an objective but doesn't parse — check "- [ ] <R|B> <discuss|check|artifact> <id> — <need>" (em-dash, exact type token): "${line.slice(0, 60)}"`
      )
    }
  })

  const seen = new Set()
  for (const o of parsed.objectives) {
    if (seen.has(o.id)) errors.push(`objective id "${o.id}": duplicate`)
    seen.add(o.id)
    if (!ID_RE.test(o.id)) errors.push(`objective id "${o.id}": invalid — letters/digits/dots/hyphens only (no commas or colons)`)
    if (o.id === TANGENT_TABLE_ID) errors.push(`objective id "${TANGENT_TABLE_ID}": reserved as the tangent TABLE target (contract §3)`)
    if (!OBJECTIVE_TYPES.has(o.type)) errors.push(`objective "${o.id}": unknown type "${o.type}"`)
    if (o.type === 'artifact' && !p.artifacts?.[o.id]) {
      errors.push(`objective "${o.id}": artifact type but no artifacts["${o.id}"] gate declared`)
    }
  }

  // canvasProgram entries must use renderable types; keys must not shadow the
  // dynamic artifact: namespace. `@` is the figure-step delimiter — keys may not
  // contain it (a key with `@` would be unreachable: the resolver splits it off).
  for (const [key, entry] of Object.entries(p.canvasProgram || {})) {
    if (key.startsWith('artifact:')) errors.push(`canvasProgram["${key}"]: keys may not start with "artifact:" (shadowed by the dynamic artifact branch)`)
    if (key.includes('@')) errors.push(`canvasProgram["${key}"]: keys may not contain "@" (reserved as the figure-step delimiter)`)
    if (key.includes('#')) errors.push(`canvasProgram["${key}"]: keys may not contain "#" (reserved as the instance-id delimiter)`)
    if (!CANVAS_TYPES.has(entry?.type)) errors.push(`canvasProgram["${key}"]: unknown canvas type "${entry?.type}"`)
    if (entry?.type === 'figure') validateFigureEntry(key, entry, errors)
    if (entry?.type === 'deck') validateDeckEntry(key, entry, errors, warnings)
  }

  // canvasDefaults must reference real targets and real objectives — BASE keys
  // only (contract §6: tier-2 resumes a figure's step, never hard-jumps; instances
  // and compare() are runtime-only, never a tier-2 default).
  for (const [objId, target] of Object.entries(p.canvasDefaults || {})) {
    if (!seen.has(objId)) errors.push(`canvasDefaults["${objId}"]: no such objective`)
    if (String(target).includes('@') || String(target).includes('#')) {
      errors.push(`canvasDefaults["${objId}"]: no "@"/"#" suffix — base keys only (tier-2 resumes the figure's step)`)
    } else if (!targetResolvable(p, target)) errors.push(`canvasDefaults["${objId}"]: unknown target "${target}"`)
  }

  // Every day opens on something: entry.canvas is required and must resolve.
  if (!p.entry?.canvas) errors.push('entry.canvas: required (every day opens on a canvas target)')
  else if (String(p.entry.canvas).includes('@') || String(p.entry.canvas).includes('#')) {
    errors.push('entry.canvas: no "@"/"#" suffix — base keys only (figures open at step 0, on the base figure)')
  } else if (!targetResolvable(p, p.entry.canvas)) {
    errors.push(`entry.canvas: unknown target "${p.entry.canvas}"`)
  }

  // Every declared artifact gate should back an artifact-type objective (catch typos).
  for (const id of Object.keys(p.artifacts || {})) {
    const o = parsed.objectives.find((x) => x.id === id)
    if (!o) errors.push(`artifacts["${id}"]: no objective with that id`)
    else if (o.type !== 'artifact') errors.push(`artifacts["${id}"]: objective "${id}" is type "${o.type}", not artifact`)
  }

  return { errors, warnings }
}

// Kind-aware figure spec checks (contract §6). The staged-reveal layer is
// generic: `steps` = ordered unique nonempty strings; every element `step`
// value must name a declared step; element ids unique within their collection.
// Called for figure CANVAS entries and reused for figure DECK FRAMES.
function validateFigureEntry(key, entry, errors) {
  const err = (msg) => errors.push(`canvasProgram["${key}"]: ${msg}`)
  const kind = entry.payload?.kind
  if (!FIGURE_KINDS.has(kind)) { err(`unknown figure kind "${kind}"`); return }
  const spec = entry.payload?.spec
  if (!spec) { err('figure payload.spec required'); return }
  validateFigureSpec(kind, spec, err)
}

// Exported: the Stagehand (Phase T.4f Tier 3) validates a runtime-generated
// figure spec through this SAME function — one set of shape rules, authored or
// generated. `err` is a plain `(msg) => void` collector (callers own the array).
export function validateFigureSpec(kind, spec, err) {
  let stepSet = new Set()
  if (spec.steps !== undefined) {
    if (!Array.isArray(spec.steps) || spec.steps.length === 0 || spec.steps.some((s) => typeof s !== 'string' || !s.trim())) {
      err('spec.steps must be a nonempty array of nonempty strings')
    } else {
      stepSet = new Set(spec.steps)
      if (stepSet.size !== spec.steps.length) err('spec.steps contains duplicate step ids')
    }
  }
  // Shared element checks: unique ids within the collection, step ∈ steps.
  const checkEls = (els, label) => {
    const ids = new Set()
    for (const el of els || []) {
      if (el?.id && ids.has(el.id)) err(`duplicate ${label} id "${el.id}"`)
      if (el?.id) ids.add(el.id)
      if (el?.step !== undefined && !stepSet.has(el.step)) err(`${label} "${el?.id}" step "${el?.step}" not in spec.steps`)
    }
    return ids
  }
  if (kind === 'concentric') {
    if (!Array.isArray(spec.rings) || spec.rings.length === 0) err('concentric spec.rings must be a nonempty array')
    const ringIds = checkEls(spec.rings, 'ring')
    checkEls(spec.callouts, 'callout')
    for (const c of spec.callouts || []) {
      if (!ringIds.has(c?.ringId)) err(`callout "${c?.id}" ringId "${c?.ringId}" is not a declared ring`)
    }
  }
  if (kind === 'quadrant') {
    if (!Array.isArray(spec.quadrants) || spec.quadrants.length !== 4) err('quadrant spec.quadrants must be exactly 4 (order TL,TR,BL,BR)')
    const qIds = checkEls(spec.quadrants, 'quadrant')
    for (const q of spec.quadrants || []) checkEls(q?.items, `quadrant "${q?.id}" item`)
    checkEls(spec.callouts, 'callout')
    for (const c of spec.callouts || []) {
      if (!qIds.has(c?.quadrantId)) err(`callout "${c?.id}" quadrantId "${c?.quadrantId}" is not a declared quadrant`)
    }
  }
  if (kind === 'funnel') {
    if (!Array.isArray(spec.bands) || spec.bands.length < 3 || spec.bands.length > 5) {
      err('funnel spec.bands must be an array of 3-5 bands (order TOP → BOTTOM)')
    }
    checkEls(spec.bands, 'band')
    for (const b of spec.bands || []) {
      if (!b?.label) err(`band "${b?.id}" needs a label`)
      if (b?.value == null || b.value === '') err(`band "${b?.id}" needs a value (the magnitude cascade IS the message)`)
    }
  }
  if (kind === 'iconrow') {
    if (!Array.isArray(spec.items) || spec.items.length < 3 || spec.items.length > 6) {
      err('iconrow spec.items must be an array of 3-6 items')
    }
    checkEls(spec.items, 'item')
    for (const it of spec.items || []) {
      if (!it?.label) err(`item "${it?.id}" needs a label`)
      if (!ICON_GLYPHS.has(it?.glyph)) err(`item "${it?.id}" glyph "${it?.glyph}" is not a built-in glyph`)
    }
  }
  if (kind === 'bars') {
    if (!Array.isArray(spec.bars) || spec.bars.length < 2 || spec.bars.length > 6) {
      err('bars spec.bars must be an array of 2-6 bars')
    }
    checkEls(spec.bars, 'bar')
    for (const b of spec.bars || []) {
      if (!b?.label) err(`bar "${b?.id}" needs a label`)
      if (b?.value == null || b.value === '') err(`bar "${b?.id}" needs a value (mono, at the bar's end)`)
      if (!(typeof b?.ratio === 'number' && b.ratio > 0 && b.ratio <= 1)) {
        err(`bar "${b?.id}" ratio must be a number in (0, 1] (relative width of the widest bar)`)
      }
    }
  }
  if (kind === 'matrix') {
    if (!Array.isArray(spec.cols) || spec.cols.length < 2 || spec.cols.length > 4) {
      err('matrix spec.cols must be an array of 2-4 columns')
    }
    if (!Array.isArray(spec.rows) || spec.rows.length < 1 || spec.rows.length > 8) {
      err('matrix spec.rows must be an array of 1-8 rows')
    }
    const colIds = checkEls(spec.cols, 'col')
    const rowIds = checkEls(spec.rows, 'row')
    for (const c of spec.cols || []) {
      if (!c?.label) err(`col "${c?.id}" needs a label`)
      else if (c.label.length > 24) err(`col "${c?.id}" label is ${c.label.length} chars — max 24`)
      if (c?.id && !MATRIX_ID_RE.test(c.id)) {
        err(`col id "${c.id}" invalid — lowercase letters/digits/hyphens only (cell keys join "col.row" on a dot)`)
      }
    }
    for (const r of spec.rows || []) {
      if (!r?.label) err(`row "${r?.id}" needs a label`)
      if (r?.id && !MATRIX_ID_RE.test(r.id)) err(`row id "${r.id}" invalid — lowercase letters/digits/hyphens only`)
    }
    for (const [key, val] of Object.entries(spec.cells || {})) {
      const dot = key.indexOf('.')
      const cId = dot === -1 ? key : key.slice(0, dot)
      const rId = dot === -1 ? '' : key.slice(dot + 1)
      if (!colIds.has(cId) || !rowIds.has(rId)) err(`cells["${key}"]: must reference a real col.row id`)
      if (val != null && String(val).length > 60) err(`cells["${key}"]: value is ${String(val).length} chars — max 60`)
    }
  }
}

// Deck frame checks (Deck Author contract, header). Word/char budgets are the
// enforcement half of "slides carry the punch"; the >120-word markdown wall is a
// WARNING because it still renders — it's just a bad slide.
const DECK_FRAME_KINDS = new Set(['markdown', 'image', 'statement', 'stat', 'split', 'figure', 'columns'])
const MD_WALL_WORDS = 120

// Exported: the Stagehand (Phase T.4f Tier 3) validates a runtime-generated deck
// (frames array) through this SAME function, wrapping it in a throwaway entry
// shape ({ type: 'deck', payload: { frames } }) — one set of budgets/shape
// rules, authored or generated.
export function validateDeckEntry(key, entry, errors, warnings) {
  const frames = entry.payload?.frames
  if (!Array.isArray(frames) || frames.length === 0) {
    errors.push(`canvasProgram["${key}"]: deck payload.frames must be a nonempty array`)
    return
  }
  frames.forEach((f, i) => {
    const err = (msg) => errors.push(`canvasProgram["${key}"] frame ${i + 1}: ${msg}`)
    if (!DECK_FRAME_KINDS.has(f?.kind)) { err(`unknown frame kind "${f?.kind}"`); return }
    switch (f.kind) {
      case 'markdown': {
        const words = String(f.markdown || '').trim().split(/\s+/).filter(Boolean).length
        if (!words) err('markdown frame needs markdown')
        else if (words > MD_WALL_WORDS) {
          warnings.push(
            `canvasProgram["${key}"] frame ${i + 1}: ${words} words — deck frame reads as a text wall; split into statement/split/stat frames or move the prose to chat`
          )
        }
        break
      }
      case 'image':
        if (!f.src) err('image frame needs src')
        break
      case 'statement':
        if (!f.text) err('statement frame needs text')
        else if (f.text.length > 90) err(`statement text is ${f.text.length} chars — max 90 (one big-type idea)`)
        break
      case 'stat':
        if (!f.value) err('stat frame needs value')
        else if (String(f.value).length > 24) err(`stat value is ${String(f.value).length} chars — max 24`)
        if (!f.label) err('stat frame needs label')
        else if (f.label.length > 80) err(`stat label is ${f.label.length} chars — max 80`)
        break
      case 'split': {
        const v = f.visual
        if (!v || (v.type !== 'image' && v.type !== 'items')) err('split frame needs visual of type "image" or "items"')
        else if (v.type === 'image' && !v.src) err('split image visual needs src')
        else if (v.type === 'items') {
          const items = Array.isArray(v.items) ? v.items : []
          if (items.length === 0) err('split items visual needs at least one item')
          if (items.length > 6) err(`split has ${items.length} items — max 6`)
          items.forEach((it, j) => {
            if (!it?.title) err(`split item ${j + 1} needs a title`)
            else if (it.title.length > 40) err(`split item ${j + 1} title is ${it.title.length} chars — max 40`)
            if (it?.glyph !== undefined && !ICON_GLYPHS.has(it.glyph)) err(`split item ${j + 1} glyph "${it.glyph}" is not a built-in glyph`)
          })
        }
        if (f.text && f.text.length > 220) err(`split text is ${f.text.length} chars — max 220 (move the prose to chat)`)
        break
      }
      case 'columns': {
        const cols = Array.isArray(f.columns) ? f.columns : []
        if (cols.length < 2 || cols.length > 4) err(`columns frame needs 2-4 columns (got ${cols.length})`)
        if (f.heading && f.heading.length > 80) err(`columns heading is ${f.heading.length} chars — max 80`)
        cols.forEach((c, j) => {
          if (!c?.title) err(`column ${j + 1} needs a title`)
          else if (c.title.length > 40) err(`column ${j + 1} title is ${c.title.length} chars — max 40`)
          const secs = Array.isArray(c?.sections) ? c.sections : []
          if (secs.length === 0 && !c?.example) err(`column ${j + 1} needs sections or an example line`)
          if (secs.length > 4) err(`column ${j + 1} has ${secs.length} sections — max 4`)
          secs.forEach((s, k) => {
            if (!s?.label) err(`column ${j + 1} section ${k + 1} needs a label`)
            else if (s.label.length > 28) err(`column ${j + 1} section ${k + 1} label is ${s.label.length} chars — max 28`)
            if (!s?.text) err(`column ${j + 1} section ${k + 1} needs text`)
            else if (s.text.length > 170) err(`column ${j + 1} section ${k + 1} text is ${s.text.length} chars — max 170 (move the prose to chat)`)
          })
          if (c?.example && c.example.length > 90) err(`column ${j + 1} example is ${c.example.length} chars — max 90 (one worked line)`)
        })
        break
      }
      case 'figure': {
        if (!FIGURE_KINDS.has(f.figureKind)) { err(`unknown figure kind "${f.figureKind}"`); break }
        if (!f.spec) { err('figure frame needs spec'); break }
        validateFigureSpec(f.figureKind, f.spec, err)
        if (typeof f.step === 'string' && !(Array.isArray(f.spec.steps) && f.spec.steps.includes(f.step))) {
          err(`figure frame step "${f.step}" not in spec.steps`)
        } else if (typeof f.step === 'number' && !(Number.isInteger(f.step) && f.step >= 0)) {
          err('figure frame numeric step must be a non-negative integer')
        }
        break
      }
    }
  })
}

// A target is resolvable if it's a canvasProgram key or an artifact:<declared-id>.
function targetResolvable(p, target) {
  if (!target) return false
  if (target.startsWith('artifact:')) {
    const id = target.slice('artifact:'.length)
    return Boolean(p.artifacts?.[id])
  }
  return Boolean(p.canvasProgram?.[target])
}

// Expose the raw registry for tooling/tests (validate-all-packs on boot).
export function allSessionPacks() {
  return SESSION_PACKS
}
