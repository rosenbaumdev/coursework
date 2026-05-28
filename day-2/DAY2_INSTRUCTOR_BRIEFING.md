# Day 2 — Instructor Briefing
## Sports Betting AI — Odds Data Collector

---

## Session Goal

Jordan builds a working odds data collector that fetches live lines from The Odds API, stores them as JSON, and handles errors gracefully. By end of session he can run one command and have real betting data on his laptop.

---

## Context Check

Before starting, ask Jordan:

> "Quick check — what did we build yesterday and what does it set up for today?"

He should say: architecture, project skeleton, Ollama running, The Odds API key. If he's fuzzy, spend 3 minutes reviewing the CLAUDE.md from Day 1. That's why it exists.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Data Source Deep Dive | Jordan understands The Odds API response structure |
| 2 | Build the Collector | odds-collector.js written and running |
| 3 | Data Normalization | Raw JSON cleaned into consistent schema |
| 4 | Line Movement Tracking | Collector stores historical snapshots |
| 5 | Cost + Rate Limit Awareness | Jordan understands API budgeting |
| 6 | Day 2 Close | CLAUDE.md updated |

---

## Phase 1 — Data Source Deep Dive (15 min)

**Start with exploration, not building:**

> "Before we write code, we need to understand what The Odds API actually gives us. Open the docs at the-odds-api.com/liveapi/guides/v4. We're going to read the response structure together."

**Key endpoints to understand:**

1. **GET /v4/sports** — lists all available sports
2. **GET /v4/sports/{sport}/odds** — live odds for a sport
3. **GET /v4/sports/{sport}/scores** — game scores

**Walk through a sample response:**

```json
{
  "id": "abc123",
  "sport_key": "americanfootball_nfl",
  "commence_time": "2024-09-08T17:00:00Z",
  "home_team": "Los Angeles Rams",
  "away_team": "Detroit Lions",
  "bookmakers": [
    {
      "key": "draftkings",
      "title": "DraftKings",
      "last_update": "2024-09-08T14:30:00Z",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            { "name": "Los Angeles Rams", "price": -110 },
            { "name": "Detroit Lions", "price": -110 }
          ]
        },
        {
          "key": "spreads",
          "outcomes": [
            { "name": "Los Angeles Rams", "price": -110, "point": -3.5 },
            { "name": "Detroit Lions", "price": -110, "point": 3.5 }
          ]
        },
        {
          "key": "totals",
          "outcomes": [
            { "name": "Over", "price": -110, "point": 44.5 },
            { "name": "Under", "price": -110, "point": 44.5 }
          ]
        }
      ]
    }
  ]
}
```

**Ask Jordan:**

> "What's the first thing you notice about this data? What would be valuable to track over time?"

Guide toward: **the bookmakers array**. Multiple books in one response means you can spot line discrepancies immediately. And when `last_update` timestamps differ between books, that's market inefficiency — one book is slow to move.

**Introduce key betting concepts as they appear in the data:**

- `h2h` = moneyline (who wins outright)
- `spreads` = point spread (win by X or more)
- `totals` = over/under on combined score
- American odds: negative = favorite, -110 means bet $110 to win $100
- **Juice/vig**: why both sides are often -110 instead of even — the bookmaker takes a cut

> "You don't need to be a betting expert to build this. You need to understand the data structure. The AI handles the analysis. You handle the pipeline."

---

## Phase 2 — Build the Collector (25 min)

**Launch Claude Code from the project folder:**

```bash
cd ~/Desktop/sports-betting-ai
claude
```

**Paste this prompt:**

```
I'm building a sports betting odds collector in Node.js.

Project structure:
- .env has THE_ODDS_API_KEY and ANTHROPIC_API_KEY
- dotenv and node-fetch are installed
- data/raw/ folder exists for storing output

Build scripts/odds-collector.js that does the following:

1. Fetches live odds from The Odds API v4
   - Endpoint: https://api.the-odds-api.com/v4/sports/{sport}/odds
   - Sport: [Jordan's chosen sport key, e.g. "americanfootball_nfl"]
   - Markets: h2h, spreads, totals
   - Regions: us
   - OddsFormat: american
   - Include all available bookmakers

2. Saves the raw response to data/raw/odds_{sport}_{timestamp}.json
   - Timestamp format: YYYYMMDD_HHMMSS
   - Pretty-print JSON (2-space indent)

3. Logs to console:
   - How many games were found
   - How many bookmakers per game (average)
   - Remaining API requests (from response headers: x-requests-remaining)
   - File path where data was saved

4. Handles errors:
   - 401: "Invalid API key — check THE_ODDS_API_KEY in .env"
   - 422: "Sport key not recognized — check available sports at /v4/sports"
   - 429: "Rate limit hit — you have [x] requests remaining this month"
   - Network errors: show the error message clearly

5. Also build scripts/list-sports.js — a simple script that hits
   /v4/sports and prints all active sport keys to console so Jordan
   can find the right key for his sport

Use async/await, load env vars with dotenv, handle all edge cases.
```

**While Claude Code builds, narrate:**

- Creating the file structure: "It's building two scripts — a utility to find your sport key, and the main collector."
- Writing the fetch: "This is the HTTP request to The Odds API — it's going to pass your key in the query string."
- Writing the file save: "This timestamps the file automatically so you build a historical archive."

**After it builds, run list-sports.js first:**

```bash
node scripts/list-sports.js
```

Have Jordan find the exact sport key for his chosen sport. Set it as a variable or .env value.

**Then run the collector:**

```bash
node scripts/odds-collector.js
```

**When it runs successfully:**

> "Open data/raw/ in Finder. There's a file in there. Open it. That's live betting data on your laptop. You just built the first layer of your product."

---

## Phase 3 — Data Normalization (20 min)

**Introduce the problem:**

> "The raw data is messy for AI processing. Every bookmaker has different update times, some games have 3 bookmakers, some have 12, odds formats vary. Before we send this to any AI, we normalize it — transform it into a clean, consistent schema. This is the processed layer."

**Prompt Claude Code:**

```
Build scripts/normalize-odds.js that reads the most recent file 
from data/raw/ and transforms it into a normalized format.

Output structure per game:
{
  "game_id": "abc123",
  "sport": "americanfootball_nfl",
  "commence_time": "ISO timestamp",
  "home_team": "string",
  "away_team": "string",
  "collected_at": "ISO timestamp",
  "markets": {
    "moneyline": {
      "consensus": {
        "home": -110,
        "away": +100
      },
      "range": {
        "home": { "best": -105, "worst": -120, "books": 8 },
        "away": { "best": +110, "worst": +100, "books": 8 }
      },
      "line_variance": 15
    },
    "spread": {
      "consensus_line": -3.5,
      "consensus_price": -110,
      "line_variance": 0.5
    },
    "total": {
      "consensus_line": 44.5,
      "consensus_price": -110,
      "line_variance": 1.0
    }
  },
  "bookmaker_count": 8,
  "data_freshness_minutes": 12
}

Key calculations:
- consensus = median across all bookmakers
- range = best and worst available price
- line_variance = max - min across books
- data_freshness = minutes since oldest bookmaker update

Save to data/processed/normalized_{timestamp}.json
Log a summary: games processed, average bookmaker count,
games with high variance (line_variance > 5 for moneyline)
```

**When it runs:**

> "Look at `line_variance`. A game where every book has the same line is a mature market — hard to find edges. A game with high variance? That's where you look first. The normalization step just surfaced that automatically."

**Ask Jordan:**

> "Why does the range field matter? Specifically the 'best' value?"

Answer: **line shopping**. If one book has the home team at -105 and another has it at -120, you can get the same bet at a 15-cent better price. Over hundreds of bets that's real money. This is the most basic form of edge — and it's visible in the normalized data.

---

## Phase 4 — Line Movement Tracking (15 min)

**Introduce the concept:**

> "One snapshot of odds is interesting. A series of snapshots is intelligence. When a line moves — say a team goes from -3 to -6.5 in two hours — something happened. Sharp money came in, an injury was reported, weather changed. The movement is the signal, not the current line."

**Prompt Claude Code:**

```
Build scripts/track-movement.js that:

1. Reads all normalized JSON files from data/processed/
2. For each game that appears in multiple snapshots,
   calculates line movement:
   - Spread movement: current line vs. earliest snapshot
   - Total movement: current vs. earliest
   - Moneyline drift: consensus price change
3. Flags significant movements:
   - Spread moved more than 1.5 points: "SIGNIFICANT SPREAD MOVE"
   - Total moved more than 2 points: "SIGNIFICANT TOTAL MOVE"
   - Moneyline moved more than 15 cents: "SIGNIFICANT ML MOVE"
4. Outputs a movement report to console showing:
   - Games with significant movement (sorted by magnitude)
   - Direction of movement (home side or away side getting action)
   - Time elapsed since first snapshot

This doesn't need to save a file — console output is fine for now.
```

**Note:** With only one snapshot today this will show nothing. That's the teaching moment:

> "It'll show nothing today because you only have one snapshot. That's why we're building a scheduler next week — so this script is running automatically every hour and building a real historical dataset. The architecture is right; the data will come."

---

## Phase 5 — Cost + Rate Limit Awareness (10 min)

**Pull up the console log from the collector run:**

It shows `x-requests-remaining`. Do the math with Jordan:

> "You have 500 requests/month free. If you run the collector every hour, that's 720 requests/month — you'd burn through it in 21 days. So we need to be strategic."

**Smart collection strategy:**

```
Week 1-2 (learning): Run manually, ~10 requests/day = 300/month ✓
Week 3 (product): Automate but throttle:
  - Every 4 hours during off-peak: 6 requests/day
  - Every 30 min for games in next 24 hours: ~20 requests/day
  - Total: ~26/day = 780/month → need paid tier at $79/mo

Paid tier at $79/mo: 30,000 requests/month
That's one request every 3 minutes continuously.
Worth it when you have paying users.
```

**Ask Jordan:**

> "What's the minimum number of users paying what amount to cover that $79 data cost?"

Let him do the math: $10/month subscription → 8 users covers it. $25/month → 4 users. This is when the business model becomes real.

---

## Phase 6 — Day 2 Close (5 min)

**What Jordan built today:**
- `scripts/list-sports.js` — sport key utility
- `scripts/odds-collector.js` — live data fetcher with error handling
- `scripts/normalize-odds.js` — raw → processed transformation
- `scripts/track-movement.js` — line movement detector

**Preview Day 3:**

> "Tomorrow we add the news and injury layer. Right now you have odds data but no context for why lines are moving. News and injuries give you that context. When you can correlate 'line moved 3 points' with 'starting QB listed questionable' — that's when the AI has something real to work with."

**Have Jordan update CLAUDE.md:**

```markdown
### Day 2 — [date]
Built: odds-collector.js, normalize-odds.js, track-movement.js
Data: [N] games collected, [N] bookmakers average
Next: news + injury pipeline
Note: 500 req/month free tier — run manually until Week 3
```

---

## Failure Modes

**The Odds API returns empty array (no games)**
Likely off-season or wrong sport key. Run list-sports.js and check `active: true`. Switch to a sport that's currently in season.

**JSON parse errors in normalization**
Usually means raw file is malformed (API error stored as JSON). Add validation: check that response is an array before processing.

**Track-movement throws errors with one file**
Expected — add a check: "if fewer than 2 snapshots exist for this game, skip." Claude Code can fix this in one prompt.

**Jordan asks "how do I run this automatically?"**
> "Great question — that's Day 8. We're building the manual version first so you understand what the scheduler is running. Automate what you understand."
