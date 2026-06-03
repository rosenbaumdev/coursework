# Day 3 — Instructor Briefing
## Sports Betting AI — News + Injury Pipeline

---

## Session Goal

Jordan builds the context layer: a news fetcher and an injury report scraper. By end of session the product can correlate odds data with real-world events — the foundation of meaningful AI analysis.

---

## Context Check

> "Walk me through what the data folder looks like right now. What's in raw, what's in processed?"

He should know: raw has timestamped odds JSON, processed has normalized files with variance calculations. If he ran the collector again since yesterday, there might be multiple snapshots. Good.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Why Context Matters | Jordan understands why odds alone aren't enough |
| 2 | News Fetcher | news-collector.js pulling from NewsAPI + Brave |
| 3 | ESPN Injury Scraper | injury-scraper.js parsing ESPN injury tables |
| 4 | Data Correlation Layer | correlate.js linking news/injuries to games |
| 5 | Brave Search Integration | brave-search.js for real-time queries |
| 6 | Day 3 Close | CLAUDE.md updated |

---

## Phase 1 — Why Context Matters (10 min)

**Open with a scenario:**

> "Let's say the Chiefs are favored by 7. You look at your odds data and see the line moved from -7 to -9.5 in two hours. Is that a signal to bet the Chiefs, or fade them?"

Let him guess. Then:

> "You can't know. A line move could mean sharp money coming in on the favorite — which you follow. Or it could be the public piling on a popular team — which sharp bettors fade. The line movement alone is ambiguous. Now add context: Patrick Mahomes was just listed as questionable with an ankle injury. Now what does that -7 to -9.5 move mean?"

Answer: the move makes no sense if the QB is hurt — it should have gone the other way. That means the injury report hit after the line moved. This is an exploitable lag. The sharp bettors who knew about the injury before it was official already moved the line. If you see the injury report and the line still hasn't corrected — that's an edge.

> "That's what the news and injury layer gives you. Not just data about what the line is — data about *why* it is. The AI can't reason about edges without that context."

---

## Phase 2 — News Fetcher (20 min)

**Prompt Claude Code:**

```
Build scripts/news-collector.js for the sports betting AI project.

This script fetches recent sports news relevant to betting analysis.

Requirements:

1. Two data sources:
   a. NewsAPI (newsapi.org/v2/everything)
      - Query: "[team names from today's games] OR [sport] betting odds"
      - Time range: last 48 hours
      - Language: en
      - Sort by: publishedAt
      - Return: up to 20 articles
      
   b. If BRAVE_API_KEY is in .env, also query Brave Search API
      (api.search.brave.com/res/v1/news/search)
      - Same team names as above
      - freshness: pd (past day)
      - Return: up to 10 results

2. Read today's normalized odds file from data/processed/ to get
   the list of team names to search for. If no normalized file
   exists, accept a --sport flag and search broadly by sport name.

3. For each article, extract and store:
   - title
   - description (first 500 chars)
   - url
   - publishedAt
   - source name
   - which teams it mentions (array — match against game list)

4. Save to data/raw/news_{sport}_{timestamp}.json

5. Console output:
   - Articles found per source
   - Games with the most coverage
   - Any articles mentioning "injury", "questionable", "out", 
     "suspended", "illness" — flag these as HIGH PRIORITY

Use async/await, handle missing BRAVE_API_KEY gracefully 
(skip Brave, log "Brave API key not configured — using NewsAPI only")
```

**After it builds, run it:**

```bash
node scripts/news-collector.js
```

**Debrief:**

> "Look at the HIGH PRIORITY flags. Those are the articles that might affect the line. The AI's job tomorrow is to read these and decide if they're material to any of your games."

---

## Phase 3 — ESPN Injury Scraper (25 min)

**Introduce web scraping:**

> "Injury reports are the most valuable free data in sports betting. The problem: there's no clean API for them. So we scrape — we write code that reads the HTML of a webpage and extracts the structured data we need. ESPN publishes injury reports publicly. We're going to read them programmatically."

**Install dependencies:**

```bash
npm install cheerio
```

> "Cheerio is a server-side version of jQuery. It lets you parse HTML and select elements the same way you'd select them in a browser. Fast, lightweight, no browser required."

**Prompt Claude Code:**

```
Build scripts/injury-scraper.js that scrapes ESPN injury reports.

ESPN injury report URL format:
- NFL: https://www.espn.com/nfl/injuries
- NBA: https://www.espn.com/nba/injuries
- MLB: https://www.espn.com/mlb/injuries
- Use the sport matching our project (check CLAUDE.md)

Requirements:

1. Fetch the ESPN injuries page using node-fetch
2. Parse HTML with cheerio (already installed)
3. Extract for each player:
   - player_name
   - position
   - team
   - injury_type (e.g. "Ankle", "Hamstring")
   - status (e.g. "Questionable", "Out", "Doubtful", "Day-to-Day")
   - date_updated (if available)
   
4. Save to data/raw/injuries_{sport}_{timestamp}.json

5. Also flag HIGH IMPACT injuries:
   - Status is "Out" or "Doubtful"
   - Position is QB, PG, SP (key positions by sport)
   - Label these "HIGH_IMPACT": true

6. Console output:
   - Total players on injury report
   - High impact injuries (name, team, status, position)
   - Teams with 3+ players injured

Add a User-Agent header to the fetch request:
"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" 
(Some sites block requests without one)

Handle scraping failures gracefully — ESPN sometimes changes 
their HTML structure. If the expected elements aren't found,
log "ESPN structure may have changed — check the URL manually"
and save whatever was successfully parsed.
```

**Important note to deliver:**

> "Web scraping is fragile. ESPN can change their HTML any time and your scraper breaks. That's not a failure — it's maintenance. Professional scrapers check for structure changes and alert you. We'll add monitoring in Week 2. For now, know that if it breaks, it's ESPN's fault, not yours."

**When it runs successfully:**

> "Look at the high impact injuries. Cross-reference with today's odds data — are any of these players on teams that are playing? If yes, that's the exact correlation the AI will analyze tomorrow."

---

## Phase 4 — Data Correlation Layer (15 min)

**Introduce correlation:**

> "We now have three data streams: odds, news, injuries. They're sitting in separate files with no connection to each other. The correlation layer is the glue — it builds a unified context package per game that we hand to the AI."

**Prompt Claude Code:**

```
Build scripts/correlate.js that creates a unified game context
by joining odds, news, and injury data.

Process:
1. Read the most recent normalized odds file from data/processed/
2. Read the most recent news file from data/raw/news_*
3. Read the most recent injuries file from data/raw/injuries_*

For each game in the odds data, build a context object:
{
  "game_id": "...",
  "home_team": "...",
  "away_team": "...",
  "commence_time": "...",
  "odds": { 
    // full odds object from normalized data
  },
  "relevant_news": [
    // articles that mention home or away team
    // sorted by publishedAt descending
    // max 5 articles per game
  ],
  "injury_report": {
    "home_team": [
      // injured players on home team, HIGH_IMPACT first
    ],
    "away_team": [
      // injured players on away team, HIGH_IMPACT first
    ],
    "has_high_impact_injuries": true/false
  },
  "context_score": 0-10,
  // context_score = how much context we have:
  // +3 if has_high_impact_injuries
  // +2 if relevant_news.length >= 3
  // +2 if odds.markets.moneyline.line_variance > 10
  // +1 if odds.markets.spread.consensus_line changed recently (if tracked)
  // +2 if news mentions "injury" AND odds show movement
  "analysis_priority": "HIGH" / "MEDIUM" / "LOW"
  // HIGH if context_score >= 6
  // MEDIUM if context_score 3-5
  // LOW if context_score < 3
}

Save all game contexts to data/processed/context_{timestamp}.json

Console output:
- Games analyzed
- HIGH priority games (these go to Claude Sonnet first)
- MEDIUM priority games
- Total HIGH_IMPACT injuries affecting today's games
```

**After it runs:**

> "The context_score and analysis_priority are doing something important. When we have 10 games today and API credits to burn on maybe 3 good analyses, we send the HIGH priority games first. That's cost management built into the pipeline. You're not analyzing everything — you're analyzing the games where you actually have signal."

---

## Phase 5 — Brave Search Integration (10 min)

**Only do this phase if BRAVE_API_KEY is ready. Otherwise skip and note in CLAUDE.md.**

**Introduce the use case:**

> "NewsAPI has a 24-hour lag and 100 request/day limit. Brave Search is almost real-time and cheap. For breaking news — a player getting scratched 2 hours before a game — Brave is how you find it. We'll use it as a targeted search, not a broad sweep."

**Prompt Claude Code:**

```
Build scripts/brave-search.js — a utility function and 
standalone script for targeted Brave Search queries.

Export a function:
async function braveSearch(query, options = {}) {
  // options: freshness ('ph'=past hour, 'pd'=past day, 'pw'=past week)
  // returns array of { title, description, url, age }
}

Also as a standalone script:
node scripts/brave-search.js "Chiefs Mahomes injury"

Should print top 5 results with title, description, and URL.

Rate limiting: add a 1-second delay between calls if called
in a loop (don't hammer the API).

Cost logging: log "Brave query used — ~$0.003 cost" after each call.
```

> "That cost log matters. You want to feel every API call. When you're running 50 searches and the logs say $0.003 × 50 = $0.15 — that's fine. When you accidentally loop and do 5,000 calls at $0.003 = $15 — you want to know immediately."

---

## Phase 6 — Day 3 Close (5 min)

**What Jordan built today:**
- `scripts/news-collector.js` — news from NewsAPI + Brave
- `scripts/injury-scraper.js` — ESPN injury report parser
- `scripts/correlate.js` — unified game context builder
- `scripts/brave-search.js` — targeted real-time search utility

**The pipeline now looks like:**

```
The Odds API → data/raw/odds_*.json
NewsAPI/Brave → data/raw/news_*.json  
ESPN scrape  → data/raw/injuries_*.json
                      ↓
             scripts/normalize-odds.js
                      ↓
              data/processed/normalized_*.json
                      ↓
              scripts/correlate.js
                      ↓
              data/processed/context_*.json  ← THIS IS THE AI INPUT
```

> "Tomorrow we plug the AI in. The context files are the prompt input. Everything we built this week was building that input. The AI is only as good as what you feed it."

**Have Jordan update CLAUDE.md. Then:**

> "You now have a three-source data pipeline. That's more data infrastructure than most people who 'built an AI product' ever set up. Tomorrow it gets smart."

---

## Failure Modes

**ESPN scraper returns empty/wrong data**
ESPN changes their HTML occasionally. Open ESPN injuries in browser, right-click → Inspect Element, find the actual table structure. Prompt Claude Code: "The ESPN page structure has changed. Here's the current HTML structure: [paste relevant HTML]. Update the scraper."

**NewsAPI returns no results for team names**
Teams have multiple name variants ("Chiefs" vs "Kansas City Chiefs"). Update the query to try both. Also check that games exist in the odds data — if it's off-season there are no games to search for.

**Jordan asks about legality of scraping**
> "Scraping publicly available data from a website you can access in a browser is generally legal — you're reading data that's publicly published. It's not legal to scrape to compete directly with the site or violate their ToS in harmful ways. ESPN injury reports are public information. We're fine."

**Correlation script finds zero connections**
Usually means team name format mismatch between data sources. Add a fuzzy match — "Chiefs" should match "Kansas City Chiefs." Prompt: "Add fuzzy team name matching — normalize team names by checking if any word in the news article's team mention matches any word in the game's team name."
