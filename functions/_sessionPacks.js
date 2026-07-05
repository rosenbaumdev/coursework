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
- HARD RULE: never introduce a venture direction that isn't from his own slate or
  his own words in this session. The interview pilot proved fabricated examples
  break trust with him instantly.
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
- [ ] R artifact sizing.translator — A sizing memo for the AI Investing Translator exists and is HIS: worked out in chat, consolidated into a draft, then edited and owned by him — TAM/SAM/SOM with assumptions, 3 named competitors + the gap, top SWOT entries, first GTM move, gut score.
- [ ] R artifact sizing.gear — The same memo for slate slot 2 (default: the AI Gear Comparison Tool) — chat work consolidated into a draft he then edited and owns.
- [ ] R artifact sizing.community — The same memo for slate slot 3 (default: the Peer Finance Community) — chat work consolidated into a draft he then edited and owns.
- [ ] B check sizing.compare — He's said, unprompted structure aside, which memo surprised him — where the numbers came out different than his gut expected.

## 5. Decide
- [ ] R artifact decision.memo — The decision memo exists: chosen arc, top 3 reasons each tied to a number or fact from his sizing memos (not vibes), the switch condition ("what would have to be true for me to change to the runner-up"), and the first build step.
- [ ] R check decision.defended — He's answered a direct challenge to his decision (strongest counter-argument from his own memos) with sizing-grounded reasoning, not just restated preference.

## 6. Wrap
- [ ] R discuss wrap.recap — He's heard a playback of what he did today — the field explored, a slate sized, one decision, his reasons — and had the chance to correct it.
- [ ] B discuss wrap.next — He knows tomorrow starts building the chosen arc, and what the first concrete artifact will be.
`.trim(),

  canvasProgram: {
    'reading.brief': {
      type: 'reading',
      title: 'Day 1 — The Investing Decision',
      payload: {
        markdown: `# Day 1 — The Investing Decision

**Today you decide what the next six weeks build.** Three movements: explore, size, decide.

### 1. Explore the field

Your interview put three directions on the table:

1. **AI Investing Translator for Teens** — your idea, your words: "a simplified transy." Stock jargon → plain language + simple odds framing, for people your age who are curious but locked out.
2. **AI Gear Comparison Tool** — golf/soccer gear picks by skill level and budget, cutting through review noise.
3. **Peer Finance Community** — the translator plus a place where people your age actually track and talk about this together.

Before locking that list we look at the whole field honestly: your real interests (golf, soccer, the gym, investing, career) crossed with the **six ways people your age actually earn from building something**. Add or swap an arc if something beats the list — or keep it exactly as is. Your call.

### 2. Size the slate

Four sizing tools, like an investor uses — each spelled out and taught before we use it:

| Tool | What it answers |
|---|---|
| TAM / SAM / SOM — Total Addressable / Serviceable / Obtainable Market | How big is this, really? |
| Competitive landscape | Who's already there, and what's the gap? |
| SWOT — Strengths, Weaknesses, Opportunities, Threats | Where does *your* version win or lose? |
| GTM — Go-To-Market | How do the first 10 real users show up? |

### 3. Decide

By the end: **three sizing memos, one decision memo, one chosen arc.** Real numbers, written assumptions, a defensible pick — the kind of thing that makes real money AND looks serious on a college application.`,
      },
    },
    'reading.vectors': {
      type: 'reading',
      title: 'Six ways people your age actually earn',
      payload: {
        markdown: `# Six Ways People Your Age Actually Earn From Building

Every venture is an **interest × an earning vector**. You know your interests. Here's the full vector menu — each with a teen-real example and where the money actually comes from.

### 1. App / tool
Build a thing people use. **Money:** subscription, one-time price, or a parent pays for it.
*Example:* a study-tool site at $3/month — or your translator idea: investing jargon → plain English.

### 2. Influencer — faced
You, on camera, building an audience around something you actually do. **Money:** sponsors, ad revenue, affiliate links once the audience is real.
*Example:* a golf account testing budget clubs on camera — gear brands sponsor exactly this.

### 3. Influencer — faceless
The channel without your face: edits, voiceover, curation, AI-assisted production. Same money as faced — sponsors, ads, affiliate — without being the face.
*Example:* a soccer-highlights + gear-breakdown page run entirely behind the scenes.

### 4. Affiliate / social marketing
Send buyers to someone else's product; take a cut of every sale you cause. **Money:** commission per purchase you drove.
*Example:* gear pages with affiliate links — or parent-gated brokers (Greenlight, Fidelity Youth) paying for teen sign-ups they can't reach themselves.

### 5. Digital goods
Make it once, sell it forever: guides, templates, presets. **Money:** price per download, zero marginal cost.
*Example:* "Your first $100 in the market — legally, under 18": a $9 starter guide.

### 6. Services
Do the thing for money, now: editing, coaching, setups, tutoring. **Money:** paid per job. Fastest cash of all six — and the only one that never scales past your own hours.
*Example:* setting up AI study tools for classmates at $20 a setup.

---

**The move:** pick any interest, cross it with any vector, and you have an arc. Investing × app = your translator. Golf × faceless influencer = a gear channel you never appear on. Same interest, different vector = a different business.`,
      },
    },
    'figure.tamsamsom': {
      type: 'figure',
      title: 'TAM / SAM / SOM — sizing a market',
      payload: {
        kind: 'concentric',
        spec: {
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
        },
      },
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
</main>`,
      },
    },
    'figure.swot': {
      type: 'figure',
      title: 'SWOT — where your version wins or loses',
      payload: {
        kind: 'quadrant',
        spec: {
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
        },
      },
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
    'open.frame': 'reading.brief',
    'explore.vectors': 'reading.vectors',
    'explore.match': 'reading.vectors',
    'explore.lock': 'reading.brief',
    'tools.tam.seen': 'figure.tamsamsom',
    'tools.tam.applied': 'figure.tamsamsom',
    'tools.landscape.seen': 'browser.competitors',
    'tools.swot.seen': 'figure.swot',
    'tools.swot.applied': 'figure.swot',
    'tools.gtm.seen': 'reading.gtm',
    'sizing.translator': 'artifact:sizing.translator',
    'sizing.gear': 'artifact:sizing.gear',
    'sizing.community': 'artifact:sizing.community',
    'decision.memo': 'artifact:decision.memo',
    'decision.defended': 'artifact:decision.memo',
    'wrap.recap': 'reading.brief',
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
    canvas: 'reading.brief',
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
// stripped and ignored.
export function resolveShowTarget(pack, target, artifacts, figureState) {
  if (!target) return null
  const at = target.indexOf('@')
  const base = at === -1 ? target : target.slice(0, at)
  const stepRef = at === -1 ? null : target.slice(at + 1)
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
  const steps = entry.payload?.spec?.steps || []
  const last = Math.max(steps.length - 1, 0)
  // Resume-or-0, then an explicit step part overrides (id preferred; numeric
  // index accepted + clamped; unknown id → keep current).
  let step = Math.min(Math.max(figureState?.[base] ?? 0, 0), last)
  if (stepRef !== null) {
    if (/^\d+$/.test(stepRef)) {
      step = Math.min(Math.max(parseInt(stepRef, 10), 0), last)
    } else {
      const idx = steps.indexOf(stepRef)
      if (idx !== -1) step = idx
    }
  }
  return { type: 'figure', id: base, title: entry.title, payload: { ...entry.payload, step } }
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
// Figure kinds FigureCanvas routes (grows with renderers).
const FIGURE_KINDS = new Set(['concentric', 'quadrant'])
const ID_RE = /^[a-z0-9][a-z0-9.\-]*$/i // no commas (TICK comma-split) or ':' ('::' evidence delimiter)

// Returns a list of human-readable problems ([] = valid). Enforces the invariants
// the engine relies on so an authoring mistake fails loudly, not mid-session.
export function validateSessionPack(rawDay, courseSlug = '_validate') {
  const errors = []
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
    if (!CANVAS_TYPES.has(entry?.type)) errors.push(`canvasProgram["${key}"]: unknown canvas type "${entry?.type}"`)
    if (entry?.type === 'figure') validateFigureEntry(key, entry, errors)
  }

  // canvasDefaults must reference real targets and real objectives — BASE keys
  // only (contract §6: tier-2 resumes a figure's step, never hard-jumps).
  for (const [objId, target] of Object.entries(p.canvasDefaults || {})) {
    if (!seen.has(objId)) errors.push(`canvasDefaults["${objId}"]: no such objective`)
    if (String(target).includes('@')) errors.push(`canvasDefaults["${objId}"]: no "@" step suffix — base keys only (tier-2 resumes the figure's step)`)
    else if (!targetResolvable(p, target)) errors.push(`canvasDefaults["${objId}"]: unknown target "${target}"`)
  }

  // Every day opens on something: entry.canvas is required and must resolve.
  if (!p.entry?.canvas) errors.push('entry.canvas: required (every day opens on a canvas target)')
  else if (String(p.entry.canvas).includes('@')) {
    errors.push('entry.canvas: no "@" step suffix — base keys only (figures open at step 0)')
  } else if (!targetResolvable(p, p.entry.canvas)) {
    errors.push(`entry.canvas: unknown target "${p.entry.canvas}"`)
  }

  // Every declared artifact gate should back an artifact-type objective (catch typos).
  for (const id of Object.keys(p.artifacts || {})) {
    const o = parsed.objectives.find((x) => x.id === id)
    if (!o) errors.push(`artifacts["${id}"]: no objective with that id`)
    else if (o.type !== 'artifact') errors.push(`artifacts["${id}"]: objective "${id}" is type "${o.type}", not artifact`)
  }

  return errors
}

// Kind-aware figure spec checks (contract §6). The staged-reveal layer is
// generic: `steps` = ordered unique nonempty strings; every element `step`
// value must name a declared step; element ids unique within their collection.
function validateFigureEntry(key, entry, errors) {
  const err = (msg) => errors.push(`canvasProgram["${key}"]: ${msg}`)
  const kind = entry.payload?.kind
  if (!FIGURE_KINDS.has(kind)) { err(`unknown figure kind "${kind}"`); return }
  const spec = entry.payload?.spec
  if (!spec) { err('figure payload.spec required'); return }

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
