# Day 5 — Instructor Briefing
## Sports Betting AI — First Claude Sonnet Picks Analysis

---

## Session Goal

Jordan writes the picks analysis prompt and sees the first real AI-generated betting analysis. By end of session the product produces a structured pick with reasoning, confidence rating, and edge identification using live data.

---

## Context Check

> "Show me the triage output from yesterday. What are today's top games?"

He should be able to open `data/processed/triage_*.json` and read the ranked list. If the triage output is empty (no games because it's off-season or no data), have him run the full pipeline manually against whatever data exists. Even stale test data works for this phase.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Picks Prompt | Master analysis prompt written |
| 2 | Picks Engine | picks-engine.js calling Claude Sonnet |
| 3 | First Live Analysis | Real output reviewed and critiqued |
| 4 | Prompt Iteration | Improve the prompt based on output quality |
| 5 | Token Cost Measurement | Jordan measures actual API cost |
| 6 | Day 5 Close | Week 1 wrap + CLAUDE.md updated |

---

## Phase 1 — The Picks Prompt (20 min)

**This is the most important prompt in the product. Spend time on it.**

**Open with:**

> "This prompt is your product's secret sauce. It's what separates your analysis from a guy with a Twitter account and an opinion. We're going to write it carefully — not just paste something generic. What do you think a sharp bettor actually looks for when analyzing a game?"

Let Jordan answer. He probably knows: injuries, line movement, matchup history, weather, public vs. sharp money. Build the prompt around his answers.

**Create the prompt file:**

```bash
touch intelligence/prompts/picks-analysis.md
open intelligence/prompts/picks-analysis.md
```

**Draft together:**

```markdown
# Picks Analysis Prompt
Model: Claude Sonnet (claude-sonnet-4-5)
Task: Generate structured betting picks analysis from game context

You are an elite sports betting analyst with deep expertise in 
identifying market inefficiencies. You think like a professional 
bettor — not a fan, not a media personality. 

Your job: analyze the provided game data and identify if a 
genuine betting edge exists. Be precise. Be honest about uncertainty.
Most games do NOT have clear edges — say so when that's the case.

## Input Data You'll Receive
- Current odds from multiple bookmakers (spreads, moneylines, totals)
- Line movement over time (if available)
- Injury reports with impact scores
- Classified news articles with relevance ratings
- Team context and matchup data

## Output Format
Respond ONLY with a JSON object structured exactly as follows:

{
  "game": "Away Team @ Home Team",
  "analysis_timestamp": "ISO timestamp",
  "edge_exists": true/false,
  
  "recommended_bet": {
    "type": "SPREAD|MONEYLINE|TOTAL|NO_BET",
    "side": "HOME|AWAY|OVER|UNDER|NONE",
    "line": "e.g. -3.5 or O44.5 or null",
    "price": "e.g. -110 or null",
    "confidence": 1-10,
    "unit_size": "0.5|1|1.5|2|NO_BET",
    "best_book": "bookmaker with best available price or null"
  },
  
  "edge_analysis": {
    "primary_edge": "one sentence describing the core edge",
    "edge_type": "INJURY_MARKET_LAG|LINE_MOVEMENT|SHARP_ACTION|LINE_SHOPPING|WEATHER|PUBLIC_FADE|MODEL_DISAGREEMENT|NONE",
    "edge_strength": "STRONG|MODERATE|WEAK|NONE",
    "market_efficiency": "how efficiently the market has priced this game 1-10 (10=very efficient, hard to beat)"
  },
  
  "key_factors": [
    {
      "factor": "brief description",
      "impact": "BULLISH|BEARISH|NEUTRAL for recommended side",
      "weight": "HIGH|MEDIUM|LOW"
    }
  ],
  
  "risks": [
    "specific risk that could invalidate this analysis"
  ],
  
  "line_shopping": {
    "best_spread_home": { "book": "...", "line": "...", "price": "..." },
    "best_spread_away": { "book": "...", "line": "...", "price": "..." },
    "best_total_over": { "book": "...", "line": "...", "price": "..." },
    "best_total_under": { "book": "...", "line": "...", "price": "..." }
  },
  
  "watch_for": "what news or information would change this analysis",
  
  "reasoning": "2-3 paragraphs of analytical reasoning. Be specific. Reference actual numbers from the data. Explain the WHY behind the recommendation. Do not hedge excessively — state your analysis clearly."
}

## Confidence Scale
1-3: Very low — pass or tiny bet
4-5: Low — marginal edge at best
6-7: Moderate — reasonable edge, standard unit
8-9: High — strong edge, consider larger unit
10: Maximum confidence — very rare, strong edge + favorable price

## Unit Size Guide
NO_BET: edge_strength is NONE or WEAK
0.5 unit: confidence 4-5
1 unit: confidence 6-7  
1.5 units: confidence 8
2 units: confidence 9-10

## Important Constraints
- Acknowledge when data is insufficient for confident analysis
- Never manufacture edges — it's okay to say NO_BET
- Line shopping values must come directly from the odds data provided
- Injury analysis must reference specific players and their impact scores
- If line movement contradicts injury report timing — highlight this explicitly
```

**Discuss the reasoning behind key choices:**

> "Notice 'edge_type' has specific categories. 'INJURY_MARKET_LAG' means the market hasn't fully priced in an injury yet — that's time-sensitive. 'PUBLIC_FADE' means the public is hammering one side and sharp money disagrees — a contrarian signal. These categories force the AI to name what kind of edge it sees, not just say 'I like this team.' Naming the edge type is what makes the analysis auditable."

> "And look at 'market_efficiency.' A 10/10 means the market has priced everything correctly — no edge. A 4/10 means there's slop in the line. That number tells you how hard the game is to beat."

---

## Phase 2 — Picks Engine (20 min)

**Prompt Claude Code:**

```
Build scripts/picks-engine.js — the core cloud AI analysis script.

This script reads the triage output and sends top-priority games 
to Claude Sonnet for picks analysis.

Requirements:

1. Read most recent data/processed/triage_*.json
2. Filter to games where send_to_cloud_ai === true
3. For each qualifying game (process top 3 max by default):

   a. Build a comprehensive prompt by combining:
      - The system prompt from intelligence/prompts/picks-analysis.md
      - The full game context (odds, news, injuries, line movement)
      - Format the data clearly in the user message
   
   b. Call Anthropic API (claude-sonnet-4-5):
      - max_tokens: 2000
      - temperature: 0 (we want deterministic analysis, not creative)
      
   c. Parse the JSON response
   d. Save to intelligence/outputs/pick_{game_id}_{timestamp}.json
   
   e. Log before each call:
      "Analyzing: [Team A] vs [Team B] — estimated cost: $0.0X"
   
   f. Log after each call:
      "Done — input tokens: X, output tokens: Y, actual cost: $0.0X"
      (Cost calc: input $0.003/1K tokens, output $0.015/1K tokens for Sonnet)

4. After all games processed, print a summary:
   - Games analyzed
   - Picks generated (edge_exists: true)
   - NO_BET recommendations  
   - Total cost this run
   - Today's running total (read from a cost-tracker.json file)

5. Update data/processed/cost-tracker.json with running totals:
   { "today": 0.00, "this_week": 0.00, "this_month": 0.00 }

6. Add --game flag to analyze a specific game:
   node scripts/picks-engine.js --game "Chiefs vs Raiders"

Error handling:
- API rate limit: wait 60 seconds and retry once
- Parse failure on JSON response: save raw response + log warning
- No qualifying games: "No games meet triage threshold today. 
  Lower TRIAGE_MIN_SCORE to include more games."
```

---

## Phase 3 — First Live Analysis (15 min)

**Run the picks engine:**

```bash
node scripts/picks-engine.js
```

**Give Jordan 2 minutes to read the output silently.**

Then debrief with these questions:

> "What's the confidence rating? Is it reasonable given what you know about the game?"

> "What edge type did it identify? Does that match what you'd expect from the injury and news data we fed it?"

> "Look at the line shopping section. Is that actually useful — can you get that price at that book right now?"

> "What would make this analysis better? What information is it missing?"

**Common first-run issues and teachable moments:**

- Low confidence (4-5): "Good. That means the AI isn't manufacturing fake conviction. A system that always says 8/10 confidence is lying to you."
- "NO_BET" recommendation: "This is actually the most valuable output. Most games don't have edges. A tool that tells you to skip most games and bet confidently on a few is exactly what sharp bettors want."
- Vague reasoning: "The reasoning paragraph is using the data we provided but isn't referencing specific numbers. We'll fix that in the next phase."

---

## Phase 4 — Prompt Iteration (15 min)

**The most important skill:**

> "The first output is never the best output. Prompt engineering is iterative — you read the output, identify what's missing or wrong, edit the prompt, run again, compare. Let's do one iteration right now."

**Have Jordan identify one specific improvement.** Common candidates:
- "The reasoning doesn't cite specific odds numbers"
- "The injury analysis is too generic"
- "The confidence rating seems off"

**Walk through how to make the edit:**

Open `intelligence/prompts/picks-analysis.md`. Find the relevant section. Edit it. Save. Run picks-engine.js again. Compare.

> "You just did your first prompt engineering iteration. Notice what happened: you changed one file, not the code. The script didn't change. The output changed. This is why prompts are files."

**Version control the prompt:**

```bash
# Copy current prompt with a version number
cp intelligence/prompts/picks-analysis.md intelligence/prompts/picks-analysis-v1.md
```

> "You'll want v1, v2, v3 as you improve. When v4 makes the analysis worse, you can revert to v3 instantly. Treat your prompts like code — version them."

---

## Phase 5 — Token Cost Measurement (10 min)

**Open cost-tracker.json. Look at actual numbers.**

Build a cost understanding exercise:

```
Today's run:
- Games analyzed: 3
- Input tokens per game: ~1,200 (context is large)
- Output tokens per game: ~400
- Cost per game: (1200 × $0.003/1K) + (400 × $0.015/1K)
              = $0.0036 + $0.006 = $0.0096 ≈ $0.01
- Total today: ~$0.03

Scale this up:
- 5 games/day × 30 days = $1.50/month
- 10 games/day × 30 days = $3.00/month
- With 100 users each triggering analysis: $300/month
```

> "At 100 users you're spending $300/month on Claude API. If they're paying $25/month, that's $2,500 revenue vs. $300 API cost. Healthy margin. But you need to build caching — if two users ask about the same game, you run the analysis once and serve both."

**Introduce caching concept:**

> "Cache key = game_id + triage_score. If game has been analyzed in the last 2 hours with the same triage score, serve the cached result. Don't run it again. We'll build this in Week 2."

---

## Phase 6 — Day 5 / Week 1 Close (10 min)

**Week 1 complete. Take stock:**

> "Let's look at what you built this week. Five days ago you had a project folder. Now you have:"

```
Week 1 — Built:
□ Project architecture (Day 1)
□ Odds data collector — live lines from 40+ bookmakers (Day 2)
□ News fetcher — NewsAPI + Brave Search (Day 3)
□ Injury scraper — ESPN data (Day 3)
□ Data correlation layer (Day 3)
□ Local AI classifier — free news sentiment (Day 4)
□ Local AI injury scorer — free impact rating (Day 4)
□ Game triage engine (Day 4)
□ Picks analysis prompt (Day 5)
□ Picks engine — first live AI picks (Day 5)
□ Cost tracking (Day 5)

Total API spend this week: < $1.00
Lines of code written by you: ~0
Lines of code that work: > 500
```

**Preview Week 2:**

> "Week 2 is the intelligence upgrade. We improve the analysis quality, add historical accuracy tracking (so you know if the picks actually work), add scheduling so this all runs automatically, and build the caching layer. By end of Week 2 you'll have a product you could charge for."

**Update CLAUDE.md:**

```markdown
### Day 5 — [date]
Built: picks-analysis.md prompt (v1), picks-engine.js
First pick generated: [game, recommendation, confidence]
Actual cost: $[X.XX]
Week 1 complete — full data pipeline + local + cloud AI working
Next week: accuracy tracking, scheduling, caching, quality improvements
```

---

## Failure Modes

**Anthropic API returns error**
Check .env for ANTHROPIC_API_KEY. Common error: "model not found" — make sure it's `claude-sonnet-4-5` (with hyphens, not dots).

**JSON parse fails on picks output**
Claude Sonnet occasionally adds preamble text before JSON. Add the same cleanup logic as the local model: strip markdown fences, find first `{` to last `}`. Prompt Claude Code to fix it.

**No qualifying games in triage**
Lower the threshold: edit triage.js to set `send_to_cloud_ai = true` if score >= 5 instead of 8. Or use the --game flag to force an analysis of a specific game for testing.

**Jordan is disappointed by the pick quality**
Important reframe: > "The quality of the pick is limited by the quality of the input data and the prompt. That's what Week 2 is for — improving both. Today proved the pipeline works end to end. Quality comes next."

**Jordan wants to actually bet based on the output**
> "You can — but don't. Not yet. You have no accuracy history. You don't know if these picks beat the market. Week 2 we build tracking. After 50 tracked picks, you'll have data to evaluate. Betting with untested picks is gambling. Betting with validated picks is edge exploitation. We're building toward the second thing."
