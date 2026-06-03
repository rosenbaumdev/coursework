# Day 1 — Instructor Briefing
## Sports Betting AI — Architecture Day

---

## Session Goal

Jordan leaves today with a complete mental model of what he's building and a working project skeleton. No guessing what comes next — the whole three-week map is visible from Day 1.

---

## What Jordan Built Yesterday (Context)

- A Sports Intelligence Distiller agent (fetch → process → output loop)
- A playable mini golf game using the spec → PRD → wireframe → CLAUDE.md → build workflow
- Chose his arc: Sports Betting AI

Today we go deeper on the arc. The distiller was a toy that proved the loop. This is the real thing.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Arc Debrief | Jordan can articulate what he's building and why it could make money |
| 2 | System Architecture | Full stack diagram drawn in chat |
| 3 | Data Sources Research | Jordan knows exactly where his data comes from |
| 4 | Project Skeleton | Folder structure created, CLAUDE.md written |
| 5 | Model Routing Framework | Jordan understands local vs. cloud decision logic |
| 6 | Day 1 Close | CLAUDE.md updated, week map reviewed |

---

## Phase 1 — Arc Debrief (10 min)

**Open with:**

> "You picked Sports Betting AI yesterday. Before we build anything, I want to know: what do you think this product actually does? Walk me through it like you're pitching it to a friend."

Let him talk. Don't correct — listen for gaps. Common gaps:
- Vague on the data source ("it just knows the odds somehow")
- Unclear on the value prop (summarizing news vs. actually surfacing edges)
- No monetization model in mind yet

After he pitches:

> "Good. Here's how I'd sharpen that. The product has three layers: data (where you get odds, news, injury reports), intelligence (where AI analyzes that data and finds edges), and delivery (how users get the output and pay for it). Everything we build for three weeks lives in one of those three layers. Today we map the whole thing."

---

## Phase 2 — System Architecture (20 min)

**Draw the architecture together in chat:**

```
┌─────────────────────────────────────────────────────┐
│                  DATA LAYER                          │
│                                                      │
│  The Odds API    NewsAPI    Injury Reports (scrape)  │
│       ↓              ↓              ↓                │
│           Raw data collector (Node.js)               │
│                      ↓                               │
│              data/raw/ (JSON files)                  │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│               INTELLIGENCE LAYER                     │
│                                                      │
│  Ollama (local)          Claude Sonnet (API)         │
│  - Data cleaning         - Edge analysis             │
│  - Sentiment scoring     - Pick reasoning            │
│  - News summarization    - Confidence rating         │
│                      ↓                               │
│              picks/output/ (JSON + MD)               │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│               DELIVERY LAYER                         │
│                                                      │
│     Web dashboard (Week 3)                           │
│     Email digest (Week 3)                            │
│     Paywall / subscription (Week 3)                  │
└─────────────────────────────────────────────────────┘
```

Explain each layer:

> "Data layer: dumb pipes. It fetches, stores, and normalizes. No AI here. Cheap and fast."

> "Intelligence layer: where the value is created. Two tiers — local models handle the grunt work for free, cloud model handles the analysis that users actually pay for."

> "Delivery layer: we build this in Week 3. It's what turns a working tool into a product someone pays for."

**Ask Jordan:**

> "What sport are we starting with? Pick one. We'll expand later, but day one is one sport."

Common answers: NFL, NBA, MLB, college football. All work. Lock it in — every data source and prompt we write this week will be scoped to that sport.

---

## Phase 3 — Data Sources Research (20 min)

**Introduce the task:**

> "Before writing a single line of code, we need to know exactly where our data comes from. I want you to actually pull up these APIs right now. We're going to understand what data they have, what the free tier gives us, and what we'd need to pay for if this becomes real."

**Walk through each source together:**

### The Odds API (theoddsapi.com)
- Free tier: 500 requests/month
- Has: live odds from 40+ bookmakers, spreads, moneylines, totals
- Endpoint to know: `/v4/sports/{sport}/odds`
- Key insight: **line movement** (how odds shift over time) is where edges hide

> "This is your foundation. Odds from multiple books at once means you can see where the market is moving. That movement is signal."

### NewsAPI (newsapi.org)
- Free tier: 100 requests/day, no commercial use
- Has: sports news headlines and descriptions from major outlets
- Good enough for learning; upgrade path to GNews API or Brave Search for production

### Injury Reports
- No clean API for free — this is a scraping problem
- ESPN has structured HTML: `espn.com/nfl/injuries` (or NBA, MLB equivalent)
- Week 2 we build the scraper

### Brave Search API (api.search.brave.com)
- $3 per 1,000 queries
- Use for: breaking news, player-specific searches, real-time context
- Better than NewsAPI for freshness

**Have Jordan actually sign up for The Odds API free tier right now.** Get the key, add it to a `.env` file.

**Ask:**

> "Based on what we just looked at — what data do you think is most valuable for actually finding betting edges? Not just 'useful' — specifically valuable."

Correct answer direction: line movement + injury timing (market hasn't priced in a fresh injury report yet). Let him reason toward it.

---

## Phase 4 — Project Skeleton (20 min)

**Build the folder structure:**

```bash
mkdir ~/Desktop/sports-betting-ai
cd ~/Desktop/sports-betting-ai

mkdir data
mkdir data/raw
mkdir data/processed
mkdir intelligence
mkdir intelligence/prompts
mkdir intelligence/outputs
mkdir delivery
mkdir scripts

touch .env
touch CLAUDE.md
npm init -y
npm install dotenv node-fetch
```

**Explain each folder:**

- `data/raw/` — untouched API responses, stored as JSON
- `data/processed/` — cleaned, normalized data ready for AI
- `intelligence/prompts/` — every prompt lives here as a .md file (version controlled)
- `intelligence/outputs/` — AI analysis results
- `delivery/` — dashboard and email code (Week 3)
- `scripts/` — data collection scripts

> "Notice that prompts are files, not strings buried in code. This matters. When you want to improve the analysis, you edit a prompt file — you don't dig through JavaScript. Your prompts are your product. Treat them like code."

**Write the CLAUDE.md together:**

```markdown
# Sports Betting AI — CLAUDE.md
Project Start: [today's date]
Builder: Jordan Rosenbaum
Arc: Sports Betting AI (3-week build)

## What We're Building
An AI-powered sports betting intelligence tool that:
1. Fetches live odds from multiple bookmakers via The Odds API
2. Pulls relevant news and injury data
3. Processes data through a tiered AI pipeline (local → cloud)
4. Outputs structured picks analysis with confidence ratings
5. Delivers via web dashboard and email digest (Week 3)

## Target Sport (v1)
[Jordan's chosen sport]

## Stack
- Runtime: Node.js
- Local AI: Ollama ([model chosen in Phase 5])
- Cloud AI: Claude Sonnet (claude-sonnet-4-5) via Anthropic API
- Data: The Odds API, NewsAPI, Brave Search, ESPN scraping
- Delivery: HTML/CSS dashboard, email via Nodemailer (Week 3)

## Data Sources
- THE_ODDS_API_KEY — in .env
- NEWS_API_KEY — in .env
- ANTHROPIC_API_KEY — in .env
- BRAVE_API_KEY — in .env (add when ready)

## Architecture
data/raw/ → data/processed/ → intelligence/outputs/ → delivery/

## Model Routing Logic
- Ollama local: data cleaning, sentiment scoring, news triage
- Claude Sonnet API: edge analysis, pick generation, confidence scoring
- Rule: if task doesn't require reasoning about betting edges → local model

## Autonomy Rules
- Build complete implementations — no stubs
- Fix errors and explain what broke
- Small design decisions → make best choice, note it
- Prompt files live in intelligence/prompts/ — never hardcode prompts in scripts

## Session Log
### Day 1 — [date]
Built: project skeleton, data source research, architecture map
Next: Day 2 — build the odds data collector
```

---

## Phase 5 — Model Routing Framework (15 min)

**Install Ollama:**

> "Before we close today, let's get Ollama running. This is the free AI tier — it runs on your laptop, costs nothing, and handles everything that doesn't need the expensive model."

```bash
# Install Ollama
# Go to ollama.ai → Download → Install for Mac

# After install, open Terminal and pull a model:
ollama pull phi3:mini

# Test it:
ollama run phi3:mini "Summarize this in one sentence: The Lakers traded LeBron James."
```

Phi3:mini is ideal for the M2 Air with 8GB — fast, capable enough for text processing tasks.

**Introduce the routing framework:**

Draw this decision tree in chat:

```
New task arrives
      ↓
Does it require betting edge reasoning? (Yes/No)
      ↓              ↓
     YES              NO
      ↓              ↓
Claude Sonnet    Ollama local
(costs money)    (free)

Examples:
FREE (Ollama):
- "Is this news positive or negative?" 
- "Summarize this article in 2 sentences"
- "Extract player names from this text"
- "Clean and normalize this JSON"

COSTS MONEY (Claude Sonnet):
- "Analyze these odds movements and identify edges"
- "Generate a pick with reasoning and confidence level"
- "Compare these two lines and explain which has value"
```

> "This routing decision is something you'll make consciously every time you write a new feature. When you're tempted to send something to the cloud model, ask: does this actually require betting reasoning? If not, local. That habit is the difference between a $5/month API bill and a $200/month API bill."

**Have Jordan estimate:**
> "Out of everything this product will do — what percentage of tasks do you think should go local vs. cloud?"

Correct range: 70-80% local, 20-30% cloud. Most of the work is data prep.

---

## Phase 6 — Day 1 Close (5 min)

**Preview the week:**

| Day | Build |
|-----|-------|
| Day 1 (today) | Architecture + skeleton ✓ |
| Day 2 | Odds data collector — fetch and store live lines |
| Day 3 | News + injury data pipeline |
| Day 4 | Local model processing layer |
| Day 5 | First Claude Sonnet picks analysis |

**Update CLAUDE.md session log** (Jordan types it himself).

**Close:**

> "You have a real project directory, a real architecture, real API access, and a working local AI model. Tomorrow we make it fetch live data. That's when it starts feeling like a product."

---

## Failure Modes

**Jordan doesn't know what sport to pick**
Give him 60 seconds. If still stuck: "NFL. More data, more coverage, bigger betting market. You can change it later."

**Ollama install fails**
Check macOS version — needs macOS 11+. His machine is Ventura so it's fine. If download is slow, move on and come back.

**Phi3:mini responses are bad**
Expected for complex tasks. That's the lesson — show him why routing matters by demonstrating a bad local response vs. a good Sonnet response on the same prompt. That contrast teaches more than any explanation.

**Jordan wants to skip to building the picks engine**
Don't let him. The data pipeline is boring but it's the foundation. "Picks with bad data are worse than no picks. We get the data right first."
