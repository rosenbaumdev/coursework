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

Jordan walks through the data → intelligence → delivery architecture and picks his target sport.
Researches The Odds API, NewsAPI, ESPN injuries, and Brave Search to know exactly where data comes from.
Creates the folder structure, .env, and CLAUDE.md so the project has a real home.
Installs Ollama with phi3:mini and learns the local-vs-cloud model routing framework.
Closes with a week map so nothing about Days 2–5 is a surprise.

---
day: 2
week: 1
title: Odds Data Collector
description: Build a working live odds fetcher that pulls from 40+ bookmakers and stores timestamped snapshots.
---

Jordan reads The Odds API response structure and learns moneylines, spreads, totals, and juice.
Builds list-sports.js to find his sport key and odds-collector.js to fetch and save raw JSON.
Writes normalize-odds.js to compute consensus, range, and line variance across books.
Adds track-movement.js to detect significant spread/total/moneyline shifts across snapshots.
Does the rate-limit math to understand free-tier budgets and when the paid tier pays for itself.

---
day: 3
week: 1
title: News + Injury Pipeline
description: Add the context layer with news fetching, ESPN injury scraping, and per-game data correlation.
---

Jordan learns why odds alone are ambiguous and how news plus injury timing creates exploitable lag.
Builds news-collector.js pulling NewsAPI plus optional Brave Search and flagging injury-related articles.
Writes injury-scraper.js using cheerio to parse ESPN injury tables with high-impact flagging.
Builds correlate.js to join odds, news, and injuries into a unified per-game context with a priority score.
Adds brave-search.js as a targeted real-time search utility with explicit cost logging.

---
day: 4
week: 1
title: Local Model Processing Layer
description: Use Ollama for free local AI to classify news, score injuries, and triage games before any paid call.
---

Jordan sees firsthand what phi3:mini can and cannot do, learning to scope it to narrow classification tasks.
Writes a news-classifier prompt as a versioned markdown file and builds classify-news.js to apply it.
Builds an injury-scorer prompt and score-injuries.js that rates line impact per injured player.
Writes triage.js to combine context, news, and injury data into a ranked send-to-cloud-AI list with cost estimates.
Learns prompt engineering rules for small models: strict JSON output, explicit categories, no creative latitude.

---
day: 5
week: 1
title: First Claude Sonnet Picks Analysis
description: Write the master picks prompt and ship the first real AI-generated betting analysis with confidence and reasoning.
---

Jordan co-authors the picks-analysis prompt that drives the whole product, including edge types and confidence scale.
Builds picks-engine.js to send top-triage games to Claude Sonnet and parse structured picks back.
Reads the first live output, critiques it, then iterates the prompt once and versions it as v1.
Measures actual token cost per call and projects spend at 100 and 1000 users.
Closes Week 1 with a complete data-plus-AI pipeline running end to end for under a dollar.

---
day: 6
week: 2
title: Accuracy Tracking + Historical Record
description: Build the immutable picks ledger, results fetcher, and performance metrics that make the product credible.
---

Jordan learns why untracked picks are worthless and why CLV is the metric that separates skill from luck.
Builds picks-ledger.js to record every pick (including NO_BETs) the moment it's generated.
Writes results-fetcher.js using The Odds API scores endpoint to auto-resolve wins, losses, and CLV.
Builds performance.js to compute win rate, ROI, CLV, and breakdowns by confidence and bet type.
Ships a formatted text dashboard that will later become the subscriber-facing report.

---
day: 7
week: 2
title: Scheduling + Full Pipeline Automation
description: Wire every script into one orchestrator and put it on a cron schedule that runs while Jordan sleeps.
---

Jordan learns cron syntax via node-cron and designs the daily morning, odds refresh, and results schedules.
Builds pipeline.js to run all twelve stages in order with timing, error handling, and abort-vs-continue logic.
Writes scheduler.js with cron jobs plus an HTTP trigger endpoint for manual runs and status checks.
Adds error alerting via Slack webhook or log file so failures surface immediately.
Sees the product cross from tool to product as the scheduler starts running on its own.

---
day: 8
week: 2
title: Prompt Engineering + Pick Quality
description: Audit every pick made so far, diagnose specific weaknesses, and ship a measurably better v2 prompt.
---

Jordan grades every existing pick on specificity, edge clarity, reasoning depth, and confidence calibration.
Diagnoses each weakness back to a specific prompt root cause before changing anything.
Rewrites the picks-analysis prompt with forced citations, calibrated confidence examples, and tighter edge definitions.
Builds prompt-ab-test.js to run v1 and v2 head-to-head on the same game with a specificity score.
Creates a sport-specific prompt variant (weather, short week, home field) for deeper tuning.

---
day: 9
week: 2
title: Response Caching + Cost Optimization
description: Add an adaptive-TTL cache and event-driven invalidation so the product survives at 100+ user scale.
---

Jordan works through the cost math showing caching is what keeps margins healthy past 100 users.
Designs the cache key (game_id plus triage hash) and TTL rules that shorten as game time approaches.
Builds cache.js with get, set, invalidate, stats, and clean functions and wires it into picks-engine.
Adds event-driven invalidation so HIGH-impact injury news immediately busts the relevant cache entries.
Surfaces cache hit rate and dollar savings in the dashboard alongside running API spend.

---
day: 10
week: 2
title: Backtesting + Historical Validation
description: Run the picks prompt against past games to validate the methodology while staying honest about sample size.
---

Jordan learns what backtesting can and cannot prove and the overfitting trap of tuning to past data.
Reviews the collected odds history and discusses paid historical data and Kaggle as deeper options.
Builds backtest.js to run the picks prompt over historical context files with cost guardrails and a progress bar.
Interprets results honestly: small sample equals no statistical conclusion, but CLV is the signal to watch.
Recaps Week 2 and previews Week 3 as the product-and-launch sprint.

---
day: 11
week: 3
title: Web UI + Visual Dashboard
description: Ship the first real web dashboard showing today's picks, performance stats, and pick history.
---

Jordan does a spec interview describing his ideal dashboard, then locks a short PRD plus ASCII wireframe.
Builds delivery/index.html as a dark-mode dashboard with pick cards, confidence bars, and history table.
Writes delivery/server.js as an Express API serving /api/data, /api/picks, /api/performance, and /api/status.
Wires the dashboard to live pipeline output so data flows end to end from APIs to the browser.
Sees the project become a real web application for the first time.

---
day: 12
week: 3
title: Auth + Subscription Paywall
description: Add email-password auth, Stripe subscriptions, and a freemium paywall that gates the picks.
---

Jordan designs the pricing model: free tier shows NO_BETs and record, paid tier unlocks full picks.
Sets up a Stripe test-mode account, product, and price ID with all keys loaded into .env.
Builds JWT-based auth with bcrypt password hashing and a file-backed users.json store.
Adds requireAuth and requireSubscription middleware plus tiered responses on /api/data.
Wires Stripe checkout into the UI and tests the full register-to-subscribe flow with a test card.

---
day: 13
week: 3
title: Email Delivery System
description: Build the 8am morning digest so every subscriber receives today's picks in their inbox automatically.
---

Jordan designs the perfect-subscriber email and learns the table-based, inline-CSS constraints of email HTML.
Builds email-template.js to generate a mobile-responsive HTML digest with picks, record, and NO_BET summary.
Configures Nodemailer with Gmail SMTP using an app password and writes email-sender.js for per-subscriber delivery.
Adds get-subscribers.js to pull active and trialing users from the users store.
Hooks the digest into the scheduler at 8:45am so it runs right after morning picks generate.

---
day: 14
week: 3
title: Deployment
description: Push the product to Railway so the site stays up and the pipeline runs 24/7 without Jordan's laptop.
---

Jordan compares Railway, Render, DigitalOcean, and Vercel and picks Railway for persistent storage plus long-running processes.
Initializes git with a strict .gitignore that excludes .env and all data folders before pushing to GitHub.
Connects the repo to Railway, sets the start command, and moves every secret into Railway environment variables.
Updates server.js to boot the scheduler in production and verifies the deploy with a full smoke test.
Optionally points a custom domain at the Railway URL to make the product feel real.

---
day: 15
week: 3
title: Launch Day
description: Do a final product review, write a launch plan, and post publicly to acquire the first real users.
---

Jordan tests every flow as a fresh user: cold landing, signup, paywall, Stripe checkout, dashboard, and email.
Reviews the three-week build: data pipeline, intelligence layer, full product, all live on the internet.
Talks through the marketing channels he can actually use (Twitter, Reddit, Discord, word of mouth) given ad restrictions.
Writes and posts his first public announcement himself and sets a 30-day user goal.
Maps the post-Day-15 roadmap and closes the program with a final CLAUDE.md update.
