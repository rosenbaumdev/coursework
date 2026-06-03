---
day: 0
week: 1
title: Orientation + Dopamine
description: Pick your arc, build your first AI agent, vibe code a mini golf game
---

**Theme:** Excitement, demystification, early wins

**The pitch to Jordan:**
> "Today is not about coding. Today is about understanding the playing field and getting your first taste of what building with AI actually feels like."

### Learning Objectives
- Understand what modern AI-powered internet businesses actually are
- Get comfortable with the terminal and Claude Code
- See what an "AI agent" actually does
- Experience AI-assisted coding for the first time
- Choose your monetization arc

### Concepts Introduced
- Frontend vs backend (high level only)
- What an API is
- What an AI agent/automation is
- What a SaaS business model is
- The modern builder's workflow: describe → generate → test → iterate

### Build Task 1 — First AI Agent (~45 min)
Build a simple AI-powered automation that:
1. Fetches real data from a public API (sports scores, stock news, trending topics — based on chosen arc)
2. Sends it to the Anthropic API with a smart prompt
3. Returns a formatted AI summary to the terminal

**Tools:** Claude Code, terminal, Anthropic API (free $5 credit)
**Output:** Working script Jordan can run and see a real AI response

**Teaching moment:** "This four-step loop — trigger, fetch, AI process, output — is the foundation of almost every AI automation business."

### Build Task 2 — Mini Golf Vibe Coding (~60 min)
Build a playable browser-based mini golf hole using AI-assisted coding.

**Requirements:**
- Single HTML file
- Ball physics, walls, collisions
- A hole/cup — ball drops in when close
- Stroke counter
- At least one interesting obstacle (Jordan decides)

**Jordan drives:** colors, obstacles, difficulty, layout
**Teaching moment:** AI as collaborator, not replacement. Describe → generate → iterate.

### Arc Selection
Jordan picks his monetization arc from:
- Sports Betting AI
- AI Trading Assistant
- Faceless Content Machine
- Fantasy Sports AI
- AI Lead Gen Tool
- AI Research Assistant
- Affiliate Automation
- AI Creator Dashboard
- AI Social Clip Generator

### Environment Setup
- [ ] Terminal comfort — basic commands (cd, ls, mkdir, npm)
- [ ] Claude Code installed and running
- [ ] Node.js installed
- [ ] GitHub account created
- [ ] Anthropic API key obtained (console.anthropic.com)
- [ ] Arc selected and written down

### Likely Confusion Points
- "Is using AI to write code cheating?" — No. Directing AI is the skill.
- "Should I understand every line?" — Not yet. Understand the structure.
- "My API key is exposed, is that safe?" — Not in production. Fine for today. We fix this Day 5.

### Stretch Goals
- Modify the AI prompt to output in a different format
- Add a second obstacle to the mini golf hole
- Run the agent script twice with different prompts, compare outputs

---
day: 1
week: 1
title: Architecture Day
description: Map the full three-layer stack, lock in the sport, and build the project skeleton with Ollama running.
---

**Theme:** Architecture, scope, and a real project home

**The pitch to Jordan:**
> "You picked Sports Betting AI yesterday. The distiller was a toy that proved the loop. This is the real thing. Today we map the whole stack so Days 2–5 aren't a surprise."

### Session Goal
Jordan walks out with a complete mental model of the three-layer architecture (data → intelligence → delivery), a chosen target sport, and a working project skeleton with Ollama running.

### What You'll Build
1. **Arc Debrief** — Jordan pitches the product back, gaps get sharpened, three-layer framing locked in.
2. **System Architecture** — Full stack diagram drawn together; data, intelligence, and delivery layers explained.
3. **Data Sources Research** — Walk The Odds API, NewsAPI, ESPN injuries, Brave Search; sign up for The Odds API free tier and capture the key.
4. **Project Skeleton** — Create folder structure, `.env`, and `CLAUDE.md` so the project has a real home.
5. **Model Routing Framework** — Install Ollama, pull `phi3:mini`, lock the local-vs-cloud decision tree.
6. **Day 1 Close** — Update `CLAUDE.md` session log, review the Week 1 map.

### Tools / Setup
- The Odds API — foundation data source, 500 free requests/month
- NewsAPI — sports news headlines, 100 req/day free tier
- Ollama + `phi3:mini` — free local AI tier for grunt work
- Node.js + `dotenv` + `node-fetch` — runtime and HTTP client
- `CLAUDE.md` — the project's source of truth for stack, sport, and routing rules

### Teaching Moments
- "Data layer: dumb pipes. It fetches, stores, and normalizes. No AI here. Cheap and fast."
- "Prompts are files, not strings buried in code. Your prompts are your product. Treat them like code."
- "Does this actually require betting reasoning? If not, local. That habit is the difference between a $5/month API bill and a $200/month API bill."

### Likely Confusion Points
- **"What sport should I pick?"** — 60 seconds to decide. If stuck: NFL. More data, bigger market, you can change later.
- **"Phi3:mini's answer was bad."** — Expected on complex tasks. That's the lesson — narrow it to one classification job and it nails it.
- **"Can we skip to the picks engine?"** — No. Picks with bad data are worse than no picks. The data pipeline is the foundation.

### Stretch Goals
- Pull up a sample Odds API response in the browser and identify line variance across books by eye.
- Run `phi3:mini` on both a classification task and an analysis task — feel the difference firsthand.

---
day: 2
week: 1
title: Odds Data Collector
description: Build a working live odds fetcher that pulls from 40+ bookmakers and stores timestamped snapshots.
---

**Theme:** Live odds on your laptop — the foundation layer

**The pitch to Jordan:**
> "By end of session you can run one command and have real betting data on your laptop. Open `data/raw/` in Finder — that's live odds. You just built the first layer of your product."

### Session Goal
Jordan ships a working odds collector that pulls live lines from The Odds API across 40+ bookmakers, stores timestamped snapshots, normalizes them into a consistent schema, and detects significant line movement.

### What You'll Build
1. **Data Source Deep Dive** — Read The Odds API response structure; learn `h2h`, `spreads`, `totals`, and juice.
2. **odds-collector.js** — Live fetcher with error handling for 401/422/429 and a logged `x-requests-remaining` counter.
3. **list-sports.js** — Utility to find Jordan's exact sport key.
4. **normalize-odds.js** — Raw → processed: consensus (median), range (best/worst), line variance, freshness.
5. **track-movement.js** — Cross-snapshot diff that flags spread moves > 1.5 pts, totals > 2 pts, moneyline > 15 cents.
6. **Cost + Rate Limit Awareness** — Math out the 500/mo free budget vs. paid $79/mo tier and the user count that justifies it.

### Tools / Setup
- The Odds API v4 (`/v4/sports`, `/v4/sports/{sport}/odds`)
- Claude Code (run from project folder)
- Node.js with `dotenv` + `node-fetch`

### Teaching Moments
- "The bookmakers array is the key. Multiple books in one response means you can spot line discrepancies immediately."
- "You don't need to be a betting expert to build this. You need to understand the data structure. The AI handles the analysis. You handle the pipeline."
- "A game where every book has the same line is a mature market. High variance is where you look first."

### Likely Confusion Points
- **"The API returns an empty array."** — Likely off-season or wrong sport key. Run `list-sports.js` and check `active: true`.
- **"Track-movement throws errors with one file."** — Expected. Add a check: if fewer than 2 snapshots, skip.
- **"How do I run this automatically?"** — That's Day 7. Build the manual version first so you understand what the scheduler is running.

### Stretch Goals
- Add a `--sport` flag to override the default sport key.
- Snapshot odds twice in one session and re-run `track-movement.js` to see real diffs.

---
day: 3
week: 1
title: News + Injury Pipeline
description: Add the context layer with news fetching, ESPN injury scraping, and per-game data correlation.
---

**Theme:** Context — the news and injury layer that gives line moves meaning

**The pitch to Jordan:**
> "You can't know what a line move means without context. Add: Mahomes was just listed questionable. Now that -7 to -9.5 move makes no sense — the injury hit after the line moved. That's an exploitable lag."

### Session Goal
Jordan builds the context layer: news fetcher, ESPN injury scraper, and a correlation engine that joins odds + news + injuries into per-game context with an analysis priority score.

### What You'll Build
1. **Why Context Matters** — Walk through the "line moved + QB hurt" scenario to ground why news/injury timing is the edge.
2. **news-collector.js** — NewsAPI + optional Brave Search, scoped to today's team names, last 48 hours, flagging injury keywords as HIGH PRIORITY.
3. **injury-scraper.js** — `cheerio`-based ESPN parser extracting player, position, status, injury type; flags HIGH_IMPACT (QB/PG/SP Out/Doubtful).
4. **correlate.js** — Joins all three streams into a unified context object per game with `context_score` and `analysis_priority` (HIGH/MEDIUM/LOW).
5. **brave-search.js** — Targeted real-time search utility with per-call cost logging (~$0.003/query).

### Tools / Setup
- NewsAPI (`/v2/everything`)
- ESPN injury page + `cheerio` for HTML parsing
- Brave Search API (optional, $3 per 1k queries)
- User-Agent header on scrape requests

### Teaching Moments
- "Data about what the line is — that's odds. Data about *why* it is — that's context. The AI can't reason about edges without it."
- "Web scraping is fragile. ESPN can change their HTML any time and your scraper breaks. That's not a failure — it's maintenance."
- "You want to feel every API call. Logging cost per query is how you avoid the accidental 5,000-call loop."

### Likely Confusion Points
- **"Scraper returns empty data."** — ESPN changed their HTML. Inspect the live page, paste the current structure into Claude Code, update the selectors.
- **"NewsAPI returns nothing for team names."** — Variants matter. "Chiefs" vs "Kansas City Chiefs" — add fuzzy matching.
- **"Is scraping legal?"** — Public data you can see in a browser is generally fine. ESPN injury reports are public.
- **"Correlation finds zero matches."** — Team name format mismatch across sources. Normalize by checking word overlap.

### Stretch Goals
- Add a per-game "context summary" line of the top three signals to the correlate output.
- Configure `BRAVE_API_KEY` and re-run news collection to compare freshness vs. NewsAPI.

---
day: 4
week: 1
title: Local Model Processing Layer
description: Use Ollama for free local AI to classify news, score injuries, and triage games before any paid call.
---

**Theme:** Free intelligence — classify, score, and triage before you spend a cent

**The pitch to Jordan:**
> "Phi3:mini knows what betting is. But it can't give you sharp analysis. The trick with local models is asking them to do one narrow thing instead of one complex thing. That's what we're building today."

### Session Goal
Jordan stands up the Ollama processing layer: news classification, injury impact scoring, and a triage engine that ranks today's games so only the high-signal ones reach the paid API.

### What You'll Build
1. **Ollama Deep Dive** — Live demo contrasting where `phi3:mini` fails (open-ended analysis) vs. nails it (narrow classification).
2. **news-classifier.md prompt** — Strict JSON output: category, impact, affected_team, betting_relevance, summary.
3. **classify-news.js** — Reads prompt file, hits Ollama API, parses JSON robustly (strip markdown fences), saves enriched news.
4. **injury-scorer.md + score-injuries.js** — Rates each injured player's `line_impact_points` (0–7) and computes team_impact_total.
5. **triage.js** — Combines context_score, team impact, news impact, line variance, time-to-game into a TRIAGE_SCORE; sets `send_to_cloud_ai = true` above threshold; logs estimated API cost.
6. **Prompt Engineering for Local Models** — Teach the rules: strict JSON, explicit categories, no creative latitude, JSON cleanup one-liner.

### Tools / Setup
- Ollama API (`POST http://localhost:11434/api/generate`)
- `phi3:mini` (fallback: `mistral:7b` if instruction-following slips)
- Versioned prompt files in `intelligence/prompts/`

### Teaching Moments
- "Every IRRELEVANT classification is money in your pocket — that's an API call you didn't make."
- "You're trading creativity for reliability. Local models hallucinate more — tight constraints compensate."
- "The triage engine makes cost vs. coverage an explicit choice instead of an accident."

### Likely Confusion Points
- **"Ollama isn't responding."** — `ollama serve` in one terminal; `ollama run phi3:mini "test"` in another to verify.
- **"phi3:mini outputs prose with the JSON."** — Add "Output ONLY valid JSON" + strip markdown fences + extract from first `{` to last `}`.
- **"Classification is slow (~3s/article)."** — Expected on M2 Air. Acceptable for batch jobs; Week 3 it runs overnight.
- **"Why not send everything to Sonnet?"** — Do the math at 100 users: $180/mo for news classification alone vs. $0 local.

### Stretch Goals
- Add a `--dry-run` flag to `classify-news.js` that shows three classifications without saving.
- Tune the triage scoring weights and re-run to see how the cloud-AI list changes.

---
day: 5
week: 1
title: First Claude Sonnet Picks Analysis
description: Write the master picks prompt and ship the first real AI-generated betting analysis with confidence and reasoning.
---

**Theme:** First real AI picks — the prompt that is the product

**The pitch to Jordan:**
> "This prompt is your product's secret sauce. It's what separates your analysis from a guy with a Twitter account and an opinion. We're going to write it carefully — not paste something generic."

### Session Goal
Jordan co-authors the master picks-analysis prompt, ships `picks-engine.js`, sees the first live AI-generated betting analysis with confidence + reasoning, iterates the prompt once, and measures actual token cost.

### What You'll Build
1. **picks-analysis.md (v1)** — Master prompt: recommended_bet, edge_analysis (edge_type, edge_strength, market_efficiency), key_factors, risks, line_shopping, calibrated confidence scale, unit-size guide.
2. **picks-engine.js** — Reads triage output, filters to `send_to_cloud_ai`, calls Claude Sonnet with `temperature: 0`, parses JSON, saves per-game pick files, logs input/output tokens and cost.
3. **First Live Analysis** — Run on a real top-triage game; critique specificity, edge clarity, confidence calibration.
4. **Prompt Iteration** — Identify one weakness, edit `picks-analysis.md`, re-run, compare. Copy current to `picks-analysis-v1.md` for versioning.
5. **Token Cost Measurement** — Read `cost-tracker.json`, do the math: ~$0.01/game, ~$3/mo at 10 games/day solo, ~$300/mo at 100 users (intro caching as the Week 2 fix).
6. **Week 1 Close** — Take stock of the full pipeline running end to end for under a dollar.

### Tools / Setup
- Anthropic API (`claude-sonnet-4-5`)
- `intelligence/prompts/picks-analysis.md` versioned alongside code
- `cost-tracker.json` for running totals

### Teaching Moments
- "Naming the edge type is what makes the analysis auditable."
- "A system that always says 8/10 confidence is lying to you. NO_BET is the most valuable output."
- "You changed one file, not the code. The output changed. This is why prompts are files."

### Likely Confusion Points
- **"Model not found error."** — It's `claude-sonnet-4-5` with hyphens, not dots.
- **"JSON parse fails."** — Strip markdown fences, extract first `{` to last `}` — same trick as Day 4.
- **"No qualifying games in triage."** — Lower the threshold in `triage.js` or use `--game` to force one for testing.
- **"Should I actually bet this?"** — No. You have no track record yet. Week 2 builds tracking. Untested picks are gambling.

### Stretch Goals
- Run v1 and a hand-edited v1.1 on the same game and compare specificity by eye.
- Add a per-edge-type comment in the prompt with one concrete example each.

---
day: 6
week: 2
title: Accuracy Tracking + Historical Record
description: Build the immutable picks ledger, results fetcher, and performance metrics that make the product credible.
---

**Theme:** Credibility — track every pick, prove the record

**The pitch to Jordan:**
> "Every sports bettor on Twitter says they're profitable. None of them are. Human memory is garbage at tracking performance objectively. Track every pick before the game, record the outcome after, calculate real numbers. No exceptions."

### Session Goal
Jordan builds the immutable picks ledger, an automated results fetcher, and a performance calculator that surfaces win rate, ROI, and CLV — the three metrics that actually matter.

### What You'll Build
1. **Why Tracking Matters** — Lock the three metrics: Win Rate (52.4% breakeven), ROI, CLV (the skill-vs-luck separator).
2. **picks-ledger.js** — RECORD mode appends every new pick (including NO_BETs) with prompt version and source files. STATUS mode summarizes pending/awaiting/completed.
3. **results-fetcher.js** — Pulls scores from The Odds API `/scores` endpoint, matches by game_id/teams, calculates WIN/LOSS/PUSH, profit_units (American-odds-aware), and CLV.
4. **performance.js** — Computes overall stats, breakdowns by confidence band and bet type, recent form, small-sample warnings.
5. **dashboard.js** — Formatted terminal report (record, ROI, CLV, last 5 picks) that becomes the subscriber-facing report later.

### Tools / Setup
- The Odds API scores endpoint (same key as odds)
- `data/ledger/picks.json` initialized as `[]`
- American odds → decimal conversion for profit math

### Teaching Moments
- "CLV is the metric that separates skill from luck. Positive CLV over time = you're beating the market."
- "The tracking layer is your competitive advantage. Verifiable track records are what people pay for."
- "Tracking what you DIDN'T bet is as important as what you did."

### Likely Confusion Points
- **"Scores endpoint returns empty."** — Off-season. Hand-add a test entry with `result: null` and run the fetcher against it.
- **"Profit math looks off on +150 lines."** — Use the American → decimal formula; have Claude Code add test cases.
- **"What's a good win rate to tell users?"** — Tell them nothing until 50+ tracked picks. Anyone launching a service with a claimed win rate from day one is lying.
- **"Can I add picks retroactively?"** — Hard no. The system's value is in the honest record.

### Stretch Goals
- Add a "by edge_type" breakdown to `performance.js`.
- Run the dashboard once with hypothetical results to see what the production view will look like.

---
day: 7
week: 2
title: Scheduling + Full Pipeline Automation
description: Wire every script into one orchestrator and put it on a cron schedule that runs while Jordan sleeps.
---

**Theme:** Automation — from tool to product while you sleep

**The pitch to Jordan:**
> "If you have to be awake at 6am to run the pipeline, it's a hobby. If it runs itself and emails you the results, it's a business. Today we automate everything."

### Session Goal
Jordan wires all twelve scripts into one orchestrator, puts the pipeline on a cron schedule, and adds failure alerting so the product runs reliably without him.

### What You'll Build
1. **The Automation Architecture** — Introduce `node-cron`; design morning, odds-refresh, and results schedules.
2. **pipeline.js** — Runs all 12 stages in order with per-stage timing, abort-on-failure for stages 1–4 (no data), continue-on-failure for 5–12. Flags: `--dry-run`, `--odds-only`, `--results-only`, `--force`.
3. **scheduler.js** — Long-running process: morning pipeline at 8:00, odds refresh every 2hrs 8am–8pm, results at 11pm, daily status log at 9:00. HTTP triggers on :3001 for manual runs and status.
4. **Error Alerting** — Either file-based (`data/logs/errors.log`) or Slack webhook (`SLACK_WEBHOOK_URL` in `.env`) — INFO on complete, ERROR on stage failure, CRITICAL on abort.

### Tools / Setup
- `node-cron` (timezone-aware via third argument)
- Slack incoming webhook (optional)
- HTTP server on :3001 for manual triggers

### Teaching Moments
- "What's happening right now in the background while we're talking? The scheduler is watching the clock. That's a product."
- "Every production system has alerting. When you have paying users depending on morning picks, you need to know if the pipeline died at 3am."
- "Automate what you understand. Build manual first."

### Likely Confusion Points
- **"Cron fired at the wrong time."** — Default is system timezone. Add `{ timezone: "America/Los_Angeles" }` to `cron.schedule()`.
- **"Pipeline hangs forever."** — Add a 5-minute per-stage timeout via `Promise.race`.
- **"Can I deploy this to a server now?"** — Not yet. Two more days of improvements. Broken code deployed is broken code running 24/7.

### Stretch Goals
- Add a `/status` HTTP endpoint that returns the last pipeline run's per-stage timing.
- Wire a Slack channel and verify a fake stage failure surfaces immediately.

---
day: 8
week: 2
title: Prompt Engineering + Pick Quality
description: Audit every pick made so far, diagnose specific weaknesses, and ship a measurably better v2 prompt.
---

**Theme:** Prompt engineering as a systematic discipline

**The pitch to Jordan:**
> "Prompt engineering is iterative — you read the output, identify what's wrong, edit the prompt, run again, compare. The outputs are only as good as your prompts, and your prompts get better through iteration, not inspiration."

### Session Goal
Jordan audits every pick made so far, diagnoses specific weaknesses, ships a measurably better v2 picks prompt, and builds an A/B test framework to prove improvements numerically.

### What You'll Build
1. **Quality Audit** — Read every pick in `intelligence/outputs/`; score on specificity, edge clarity, reasoning depth, confidence calibration, actionability (1–5 each).
2. **Prompt Failure Analysis** — Map each issue to a root cause in the prompt before touching anything.
3. **picks-analysis v2** — Force specific citations ("from -3 to -5.5", "Mahomes impact 6.2 Questionable"), calibrated confidence examples, sharpened edge-type criteria.
4. **prompt-ab-test.js** — Runs two prompt files against the same game in parallel, prints side-by-side comparison + auto-calculated specificity score (counts numbers, names, books).
5. **Sport-Specific Variant** — `picks-analysis-nfl.md` with weather, short-week, home-field, QB-tier sections (or analog for chosen sport).

### Tools / Setup
- Anthropic API (cost: 2x for A/B runs — log clearly)
- Versioned prompts: `picks-analysis-v1.md`, current as v2

### Teaching Moments
- "We're diagnosing before fixing. Every prompt edit should address a specific diagnosed problem. Random edits make things worse. Be surgical."
- "You can't know if v2 is better than v1 by feeling. Run both on the same input and compare."
- "Outputs are only as good as your prompts, and prompts get better through iteration, not inspiration."

### Likely Confusion Points
- **"v2 confidence dropped."** — That can be the win. A more honest prompt rates lower, not higher, when signal is thin.
- **"Specificity score seems arbitrary."** — It is a heuristic. Useful signal, not truth — combine with eyeball review.

### Stretch Goals
- Build a `picks-analysis-totals.md` variant focused on weather/pace factors.
- Add a "what would change this" requirement to v2's `watch_for` field.

---
day: 9
week: 2
title: Response Caching + Cost Optimization
description: Add an adaptive-TTL cache and event-driven invalidation so the product survives at 100+ user scale.
---

**Theme:** Caching is the architecture decision that protects margins

**The pitch to Jordan:**
> "The difference between a profitable business and a money-losing one at scale is caching. It's not optional — it's the architecture decision that determines whether your margins hold as you grow."

### Session Goal
Jordan adds an adaptive-TTL response cache with event-driven invalidation, so the product can serve 100+ users at a fraction of the per-call cost.

### What You'll Build
1. **Cost Math at Scale** — Walk the numbers: $150/mo at 100 users without cache vs. $0.75/mo with 95% hit rate. 200x reduction.
2. **Cache Architecture** — Key = `game_id + triage_hash` (MD5). File-based storage in `data/cache/`. Adaptive TTL: 8h far out, 2h near tipoff, no cache once started.
3. **cache.js** — `getCached`, `setCached`, `invalidateGame`, `getCacheStats`, `cleanExpired`. Uses Node `crypto` for MD5.
4. **picks-engine integration** — Check cache before each Sonnet call, log HIT vs MISS, write on response. Add cache hits + dollars saved to the pipeline summary.
5. **Event-Driven Invalidation** — When `classify-news.js` flags `INJURY + HIGH`, call `invalidateGame()` for affected games; scheduler re-triggers `picks-engine.js` immediately for those games.
6. **Cost Tracker Dashboard** — Add API spend (today/week/month) and cache performance (hit rate, tokens saved, $ saved) to `dashboard.js`.

### Tools / Setup
- Node `crypto.createHash('md5')` for triage hashing
- `data/cache/` (auto-created)

### Teaching Moments
- "There are only two hard things in computer science: cache invalidation and naming things."
- "Don't invalidate based on time alone when you can invalidate based on relevant events."
- "Adaptive TTL — the cache lifetime adjusts to data volatility."

### Likely Confusion Points
- **"Second run still hit the API."** — Triage hash changed because input data changed. That's correct behavior — fresh data, fresh analysis.
- **"Cache file count is exploding."** — Wire `cleanExpired()` into the scheduler nightly.

### Stretch Goals
- Add a `--no-cache` flag to `picks-engine.js` for forced re-analysis.
- Surface the top 5 cached games by `cache_hits` in the dashboard.

---
day: 10
week: 2
title: Backtesting + Historical Validation
description: Run the picks prompt against past games to validate the methodology while staying honest about sample size.
---

**Theme:** Backtesting — what it proves and what it doesn't

**The pitch to Jordan:**
> "Backtesting sounds powerful. It's also where most people fool themselves. Before we run it, I want you to understand what it can and can't tell you."

### Session Goal
Jordan runs the current picks prompt against historical context files to validate the methodology end to end, while staying honest about what small samples can and cannot prove.

### What You'll Build
1. **Why Backtesting (and its limits)** — What it can show (consistency, CLV signal). What it can't (future profitability, overfitting-proofness).
2. **Historical Data Collection** — Inventory existing `data/raw/odds_*` files. Discuss paid Odds API historical ($79/mo) and Kaggle datasets as the next step.
3. **backtest.js** — Loops historical context files, calls Sonnet via the current prompt, records pick + actual outcome + CLV. Cost guardrail prompts confirmation above 20 games. Progress bar.
4. **Backtest Results Analysis** — Read numbers with skepticism: 10 games proves nothing; CLV positive rate is the metric to watch.
5. **Week 2 Recap** — Full ledger of what shipped: tracker, scheduler, prompts v2, A/B, cache, backtest.

### Tools / Setup
- `data/raw/odds_*` snapshots accumulated so far
- Optional Kaggle historical datasets (normalize to schema)
- Anthropic API with `--max-games` guardrail

### Teaching Moments
- "If you run 50 variations and pick the one that performs best on past data, you've found the one that happened to work. It means nothing about the future."
- "Does the system flag games with positive CLV above 50%? That's the one metric that would indicate genuine skill at this stage."
- "The backtest proved the pipeline mechanics work. Sample size prevents statistical conclusions. That's the correct answer — not a failure."

### Likely Confusion Points
- **"Win rate looks great / terrible."** — Either way, 10 games is variance. Don't update your priors yet.
- **"Cost spiked."** — Run `--max-games 5`. The point is the methodology, not a full historical study.
- **"Should I tune the prompt to backtest results?"** — No. That's overfitting. One pass, one prompt, honest read.

### Stretch Goals
- Pull a small Kaggle dataset for one sport and write a one-off normalizer to your schema.
- Compare CLV distribution across confidence bands in the backtest output.

---
day: 11
week: 3
title: Web UI + Visual Dashboard
description: Ship the first real web dashboard showing today's picks, performance stats, and pick history.
---

**Theme:** The product becomes visible

**The pitch to Jordan:**
> "Open your laptop. You have a real web application serving live AI-generated sports betting analysis. That's a product. Tomorrow we put a paywall on it."

### Session Goal
Jordan builds the first visual dashboard — pick cards, performance stats, history table — and wires it to live pipeline output via an Express API.

### What You'll Build
1. **UI Design Interview** — Jordan describes his ideal dashboard. Dark mode, first number, full vs. high-confidence, real-time elements.
2. **PRD + ASCII Wireframe** — Lock the spec: header, today's picks, performance summary, pick history, cost tracker.
3. **delivery/index.html** — Single file, dark theme, embedded CSS/JS. Pick cards color-coded by confidence, confidence bars animated, history table with WIN/LOSS badges, auto-refresh every 5 minutes.
4. **delivery/server.js** — Express server: `/`, `/api/data`, `/api/picks`, `/api/performance`, `/api/status`. CORS enabled. Port 3000.
5. **Wire the Data** — Replace mock data with `fetch('/api/data')`. Run pipeline `--dry-run`, verify the dashboard reflects fresh state end to end.

### Tools / Setup
- `express` + `cors` (+ `nodemon` for dev)
- CSS Grid for layout, inline styles for the cards
- `npm start` runs the server

### Teaching Moments
- "Same spec → PRD → wireframe → build workflow you used on mini golf. The methodology generalizes."
- "Data flows from APIs through the pipeline through the server to the browser. That's the product working as a whole."

### Likely Confusion Points
- **"Dashboard is empty."** — Pipeline hasn't produced new picks yet. Run `node scripts/pipeline.js --dry-run` or seed with a prior pick file.
- **"CORS errors in browser console."** — Confirm `cors()` middleware is mounted before routes.

### Stretch Goals
- Add a per-pick "Open at DraftKings" deep link from the line-shopping data.
- Add a countdown timer on pick cards showing time until kickoff.

---
day: 12
week: 3
title: Auth + Subscription Paywall
description: Add email-password auth, Stripe subscriptions, and a freemium paywall that gates the picks.
---

**Theme:** Putting a paywall on real value

**The pitch to Jordan:**
> "You need to decide what people pay for. What's free? What's paid? How much? Today the product requires payment to access picks — that's the line between a website and a business."

### Session Goal
Jordan ships email-password auth with JWT, a Stripe subscription paywall, and a freemium model where NO_BETs + record are free and full picks gate behind the subscription.

### What You'll Build
1. **Monetization Design** — Free: NO_BETs, record, performance stats. Paid ($19–29/mo): full picks, reasoning, line shopping, email digest, full history.
2. **Stripe Setup** — Create test-mode account, product, recurring price; store `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` in `.env`.
3. **Auth Layer** — File-backed `data/users.json` store. `bcrypt` hashing (saltRounds 10). JWT tokens (7-day expiry, `JWT_SECRET` in `.env`). Routes: `POST /auth/register` (creates Stripe customer + 7-day trial), `POST /auth/login`, `GET /auth/me`.
4. **Middleware** — `requireAuth` (401 if missing/invalid JWT) and `requireSubscription` (402 if not active/trialing).
5. **Paywall Integration** — Tiered `/api/data` responses. Login/register modal in `index.html`. Stripe checkout via `POST /create-checkout-session`. Test the full register → subscribe → unlock flow with card `4242 4242 4242 4242`.

### Tools / Setup
- `stripe`, `jsonwebtoken`, `bcryptjs`
- Test card: `4242 4242 4242 4242`
- Stripe webhook endpoint (URL added Day 14 post-deploy)

### Teaching Moments
- "Showing NO_BETs is counterintuitive but powerful — it proves the system isn't picking everything."
- "Free tier shows proof of concept. Paid tier delivers the actual value. The freemium split justifies the cost."
- "Use test mode for now. We switch to live mode on launch day."

### Likely Confusion Points
- **"This is a lot — am I overdoing it?"** — No. Auth + payments is the standard product surface. Adjust pace; don't rush auth.
- **"Where does the JWT live?"** — `localStorage` on the client; sent as `Authorization: Bearer <token>` on API calls.
- **"User store as JSON file?"** — Fine for launch. Migrate to SQLite later if usage justifies.

### Stretch Goals
- Add a "magic link" alternative login (optional, only if extra time).
- Add a per-user `last_seen_at` timestamp to power churn analysis later.

---
day: 13
week: 3
title: Email Delivery System
description: Build the 8am morning digest so every subscriber receives today's picks in their inbox automatically.
---

**Theme:** The 8am inbox moment — service, not just website

**The pitch to Jordan:**
> "You're a subscriber. You wake up Sunday at 7:45am. You open an email from this service. What does the perfect email look like? Today we build that."

### Session Goal
Jordan ships the morning email digest: a mobile-responsive HTML template, Nodemailer-via-Gmail delivery, a subscriber list pulled from the users store, and an 8:45am scheduler hook that runs right after picks generate.

### What You'll Build
1. **Email Design** — Jordan describes the perfect Sunday-morning email. Header, record bar, per-pick block, NO_BET summary, footer.
2. **delivery/email-template.js** — Table-based layout, inline CSS, max-width 600px, mobile responsive, dark/light client compatible. Exports `generateEmail(data)`.
3. **delivery/email-sender.js** — Nodemailer with Gmail SMTP (`smtp.gmail.com:587`, app password). `sendPicksDigest(emails, picksData)` — sends individually (not BCC) for personalized unsubscribe + better deliverability.
4. **scripts/get-subscribers.js** — Returns emails where `subscription_status === 'active'` or `trial_ends_at` is in the future.
5. **Scheduler Integration** — Add 8:45am job to `scheduler.js` that reads latest picks, fetches subscribers, sends digest, logs count.

### Tools / Setup
- `nodemailer`
- Gmail App Password (2-Step Verification → App Passwords → "Mail")
- `.env`: `EMAIL_FROM`, `EMAIL_APP_PASSWORD`

### Teaching Moments
- "Email HTML is stuck in 2005. Gmail strips CSS classes. No flexbox. No grid. Table-based layouts only. It sounds terrible — it is terrible — but Claude Code handles it."
- "Personalized unsubscribe links + per-recipient sends = better deliverability than one big BCC."

### Likely Confusion Points
- **"Gmail blocks the send."** — Use an App Password, not your account password. 2-Step Verification must be on first.
- **"Looks broken in Outlook."** — Email rendering quirks. Test in browser then in Litmus/mail-tester if needed.
- **"Should I send if no picks?"** — Decision: still send the NO_BET summary + record. Consistency builds the habit.

### Stretch Goals
- Add a one-tap unsubscribe route that flips a user flag.
- Add a "yesterday's results" section so subscribers see picks resolve.

---
day: 14
week: 3
title: Deployment
description: Push the product to Railway so the site stays up and the pipeline runs 24/7 without Jordan's laptop.
---

**Theme:** Live on the internet, running without you

**The pitch to Jordan:**
> "Your laptop can be closed. The pipeline runs on Railway's servers. Picks generate every morning. Email goes out to subscribers. Anyone with the URL can subscribe and pay you. That's a live product."

### Session Goal
Jordan deploys the product to Railway with persistent storage, every secret moved to platform env vars, the scheduler booted in production, and the live URL smoke-tested end to end.

### What You'll Build
1. **Deployment Architecture** — Compare Railway ($5, persistent storage, long-running OK), Render, DigitalOcean, Vercel (no persistent storage — won't work). Pick Railway.
2. **Git Initialization** — `git init`, strict `.gitignore` excluding `.env`, `node_modules/`, `data/raw/`, `data/processed/`, `data/cache/`, `data/ledger/`, `intelligence/outputs/`. Push to GitHub.
3. **Railway Project** — Sign in with GitHub, connect the repo, set start command `node delivery/server.js`.
4. **Environment Variables** — Move every `.env` key to Railway variables (Anthropic, Odds, News, Brave, Stripe, JWT, email). Set `NODE_ENV=production`.
5. **Production Scheduler Boot** — In `server.js`: if `NODE_ENV === 'production'`, require `scripts/scheduler.js` after `app.listen()`. Also use `process.env.PORT || 3000`.
6. **Deploy + Smoke Test** — Push, watch build logs, hit live URL, register, test checkout, trigger pipeline via `/run-pipeline`. Update Stripe webhook to `https://<railway-url>/webhook/stripe`. Optional: custom domain via Namecheap.

### Tools / Setup
- Railway (GitHub-linked auto-deploy)
- `.gitignore` excluding all data folders and `.env`
- Namecheap (optional, $8–15/year for a real domain)

### Teaching Moments
- "Data folders are gitignored. On the server, the pipeline will recreate these from scratch. We're only deploying the code, not the data."
- "Environment variables on the server replace your .env file. Stored encrypted, never visible in code. This is how production apps handle secrets."
- "'edgefinder.ai' is a product. 'railway-app-abc123.up.railway.app' is a demo."

### Likely Confusion Points
- **"Build fails: missing module."** — A package wasn't in `package.json`. Add it, commit, push.
- **"Port issue."** — Railway injects `PORT`. Use `process.env.PORT || 3000` in `server.js`.
- **"Stripe webhook signature fails."** — Update `STRIPE_WEBHOOK_SECRET` to match the new production webhook endpoint's signing secret.

### Stretch Goals
- Point a custom domain at the Railway URL.
- Add an uptime ping (e.g. UptimeRobot) on the live URL.

---
day: 15
week: 3
title: Launch Day
description: Do a final product review, write a launch plan, and post publicly to acquire the first real users.
---

**Theme:** Launch — real users, real product, real internet

**The pitch to Jordan:**
> "Three weeks ago you hadn't opened a terminal. Today you have a live AI product with a paywall on the internet. The hardest part — building something real from nothing — is done. Today you put it in front of people."

### Session Goal
Jordan does a fresh-user smoke test of every flow, writes and posts his own first public announcement, sets a 30-day user goal, and maps the post-Day-15 roadmap.

### What You'll Build
1. **Full Product Review** — Cold visit → understand-in-10-seconds → register → free tier value → paywall prompt → Stripe checkout → unlocked picks → dashboard with real data → email digest → mobile. Fix bugs before features.
2. **What We Built (Retrospective)** — Recap Week 1 (data), Week 2 (intelligence + automation), Week 3 (product). Total API spend: $15–30. Working LOC: 2,000+. Jordan-typed LOC: ~0.
3. **Launch Strategy** — Channels Jordan can actually use given ad restrictions: Twitter/X (daily public picks + paid teaser), Reddit (r/sportsbook track record posts), Discord (genuine value first), word of mouth (free trials to friends who bet).
4. **First Posts** — Jordan writes and posts his own announcement. What it does, free to follow the record, building in public. One post, posted today.
5. **30-Day User Goal** — Pick a number. That's the target. Talk through how to hit it.
6. **Ongoing Roadmap** — Next 2 weeks: track record + first 5 users + bug fixes. Month 2: multi-sport, historical odds upgrade, prompt tuning on real accuracy, referral system. Month 3: trend analytics, Discord bot, email preferences. Final `CLAUDE.md` update closes the program.

### Tools / Setup
- Stripe test card for one final flow check
- Twitter/X account for the public launch post
- Mobile browser for the responsive pass

### Teaching Moments
- "The strongest marketing asset you'll have in 3 months is a verified track record. Not screenshots — a link to your dashboard where people can see the full record."
- "The NO_BET transparency builds credibility. The teaser builds curiosity."
- "Every AI product anyone is going to build in the next decade uses the same loop: data pipeline → AI intelligence layer → delivery interface. You've built all three."

### Likely Confusion Points
- **"Should I claim a win rate yet?"** — No. Wait for 50+ tracked picks. Honest beats hype.
- **"Can't I run paid ads?"** — Google/Facebook ban sports betting products. Organic only. Twitter/Reddit/Discord/word of mouth.
- **"What if the picks lose this week?"** — Track them anyway. Consistency is the asset. Inconsistency is the biggest risk going forward.

### Stretch Goals
- Set up UptimeRobot on the live URL so any downtime alerts Jordan.
- Write a second post in a different format (Reddit-style, with track record link) to compare engagement.
