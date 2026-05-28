# Day 4 — Instructor Briefing
## Sports Betting AI — Local Model Processing Layer

---

## Session Goal

Jordan builds the Ollama processing layer — the free AI tier that handles all data prep before anything touches the paid API. By end of session, the local model is classifying news sentiment, scoring injury impact, and triaging game context automatically.

---

## Context Check

> "Open data/processed/ and tell me what's in there. What does a context file look like?"

He should describe the unified game context object from Day 3: odds + news + injuries + context_score + analysis_priority. If the correlate script didn't fully work yesterday, fix it now before moving on. Today's build depends on it.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Ollama Deep Dive | Jordan understands what local models can and can't do |
| 2 | News Sentiment Classifier | Local model scores news articles for betting relevance |
| 3 | Injury Impact Scorer | Local model rates injury severity in betting terms |
| 4 | Game Triage Engine | Local model ranks today's games by analysis priority |
| 5 | Prompt Engineering for Local Models | How to get good output from smaller models |
| 6 | Day 4 Close | CLAUDE.md updated |

---

## Phase 1 — Ollama Deep Dive (10 min)

**Start with a live demo that teaches limitations:**

```bash
ollama run phi3:mini "Analyze this sports betting situation and tell me which team has the edge: The Chiefs are -7 favorites. Patrick Mahomes is listed as questionable. The line has moved from -7 to -9.5 in the last 3 hours."
```

Let it run. The response will probably be generic sports commentary without real betting analysis.

> "See that? Phi3:mini knows what betting is. It knows what a spread is. But it's not giving you the sharp analysis you'd actually pay for. It doesn't have the domain depth to reason about line movement + injury timing + market behavior simultaneously."

Now show what it *is* good at:

```bash
ollama run phi3:mini "Classify this news headline as one of: INJURY, LINEUP_CHANGE, WEATHER, PERFORMANCE, TRADE, or OTHER. Just respond with the category and nothing else. Headline: 'Mahomes listed questionable with ankle injury ahead of Sunday matchup'"
```

Response will be: `INJURY`

> "That's perfect. Simple classification — it nails it every time, fast, free. The trick with local models is asking them to do one narrow thing instead of one complex thing. That's what we're building today."

---

## Phase 2 — News Sentiment Classifier (20 min)

**Introduce the concept:**

> "Not all news is equal for betting. 'Team arrives in city for road game' — irrelevant. 'Starting QB confirmed out for Sunday' — high impact. 'Weather forecast shows 30mph winds' — affects totals. We need the local model to read each article and classify it in betting terms."

**Create the prompt file first:**

```bash
touch intelligence/prompts/news-classifier.md
open intelligence/prompts/news-classifier.md
```

**Write the prompt together — have Jordan contribute:**

```markdown
# News Classifier Prompt
Model: Ollama phi3:mini
Task: Classify sports news for betting relevance

You are a sports betting news classifier. Your job is to read a news 
headline and description and output a structured classification.

Respond ONLY with a JSON object. No explanation, no preamble, no markdown.

Input format:
{ "headline": "...", "description": "...", "teams": ["Team A", "Team B"] }

Output format:
{
  "category": "INJURY|LINEUP|WEATHER|PERFORMANCE|PUBLIC_ACTION|SHARP_ACTION|IRRELEVANT",
  "impact": "HIGH|MEDIUM|LOW|NONE",
  "affected_team": "home|away|both|neither",
  "betting_relevance": "SPREADS|TOTALS|MONEYLINE|ALL|NONE",
  "summary": "one sentence, max 15 words"
}

Categories:
- INJURY: player health, availability, practice status
- LINEUP: starter changes, rotation updates, coaching decisions  
- WEATHER: conditions affecting outdoor games
- PERFORMANCE: recent form, hot/cold streaks, matchup history
- PUBLIC_ACTION: popular team getting heavy public betting
- SHARP_ACTION: professional/sharp money movement signals
- IRRELEVANT: off-field, historical, general interest

Impact rules:
- HIGH: starting QB/PG/SP affected, severe weather (20mph+ wind/rain), line-moving sharp action
- MEDIUM: key skill position player, moderate weather, mixed reports
- LOW: depth player, minor weather, uncertain reports
- NONE: no direct game impact
```

> "Notice we're writing this prompt as a file, not as a string in code. You can edit this file tomorrow and the whole classifier changes — no code edit required. This is how prompt engineers work."

**Now build the classifier script:**

```bash
# In Claude Code:
```

**Prompt:**

```
Build scripts/classify-news.js that uses Ollama to classify 
news articles for betting relevance.

1. Read the prompt from intelligence/prompts/news-classifier.md

2. Read the most recent news file from data/raw/news_*.json

3. For each article, send to Ollama:
   - Model: phi3:mini
   - The prompt from the file
   - Input: { headline, description, teams (from matched games) }
   
   Use Ollama's API: POST http://localhost:11434/api/generate
   Body: { "model": "phi3:mini", "prompt": "...", "stream": false }

4. Parse the JSON response, handle malformed JSON gracefully
   (local models sometimes output extra text — strip it before parsing)

5. Attach classification to each article and save enriched news 
   to data/processed/news_classified_{timestamp}.json

6. Console output:
   - Articles classified
   - HIGH impact count
   - Categories breakdown (e.g., "INJURY: 4, LINEUP: 2, IRRELEVANT: 8")
   - Processing time (local models are slower than API calls)
   
7. Add a --dry-run flag that shows first 3 classifications 
   without saving, for testing prompt quality

Speed note: process articles sequentially (not parallel) to 
avoid overwhelming the local model. Add a brief log per article:
"Classifying: [headline truncated to 60 chars]..."
```

**After it runs, review the output:**

> "Look at the category breakdown. How many IRRELEVANT articles did it filter? That's API cost you saved by not sending those to Claude Sonnet. Every IRRELEVANT classification is money in your pocket."

---

## Phase 3 — Injury Impact Scorer (15 min)

**Create the prompt file:**

```bash
touch intelligence/prompts/injury-scorer.md
```

**Content:**

```markdown
# Injury Impact Scorer
Model: Ollama phi3:mini
Task: Score injury severity in betting terms

You are a sports betting injury analyst. Score how much this injury
affects betting lines for the upcoming game.

Respond ONLY with a JSON object. No explanation.

Input: { "player_name": "...", "position": "...", "status": "...", 
         "injury_type": "...", "team": "...", "sport": "..." }

Output:
{
  "line_impact_points": 0.0-7.0,
  "affects_spread": true/false,
  "affects_total": true/false,
  "affects_moneyline": true/false,
  "confidence": "HIGH|MEDIUM|LOW",
  "reasoning": "max 20 words"
}

Scoring guide:
- Starting QB Out: 6-7 points
- Starting QB Questionable: 2-4 points  
- Starting RB Out: 1-2 points
- WR1 Out: 0.5-1.5 points
- Starting PG Out (NBA): 4-6 points
- Starting SP Out (MLB): 3-5 points
- Backup positions: 0-0.5 points
- Doubtful = treat as 80% Out
- Questionable = treat as 40% Out
- Day-to-Day = treat as 20% Out
```

**Build the scorer:**

```
Build scripts/score-injuries.js using the same Ollama approach 
as classify-news.js but reading from:
- data/raw/injuries_*.json (most recent file)
- intelligence/prompts/injury-scorer.md

For each HIGH_IMPACT player (flag from Day 3 scraper), send to 
Ollama for scoring. Save enriched injury data to:
data/processed/injuries_scored_{timestamp}.json

Also calculate a team_impact_total per team:
sum of line_impact_points for all their injured players.

Console output:
- Players scored  
- Teams with total impact > 3.0 (flagged as SIGNIFICANTLY IMPACTED)
- Recommended line adjustments: "If [team] line doesn't reflect 
  [N] points of injury impact — potential edge exists"
```

---

## Phase 4 — Game Triage Engine (15 min)

**The payoff of all local processing:**

> "We now have classified news, scored injuries, and normalized odds for every game. The triage engine combines these into a ranked priority list. The top games get sent to Claude Sonnet for deep analysis. Everything else waits or gets skipped."

**Prompt:**

```
Build scripts/triage.js — the final local processing step before 
cloud AI analysis.

Read:
- data/processed/context_*.json (unified game context)
- data/processed/news_classified_*.json
- data/processed/injuries_scored_*.json

For each game, calculate a TRIAGE_SCORE:
- Base score: context_score from correlate.js (0-10)
- +3 if team_impact_total > 3.0 for either team
- +2 if any HIGH impact news exists for this game
- +2 if line_variance > 15 on moneyline
- +1 if game is within 24 hours
- +2 if any HIGH impact news category is SHARP_ACTION
- -2 if only IRRELEVANT news found

Output a ranked list saved to data/processed/triage_{timestamp}.json:
[
  {
    "rank": 1,
    "game_id": "...",
    "matchup": "Team A vs Team B",
    "commence_time": "...",
    "triage_score": 14,
    "top_signals": ["Mahomes questionable", "Line moved 2.5 pts", "High variance across books"],
    "send_to_cloud_ai": true,
    "estimated_api_cost": "$0.04"
  }
]

send_to_cloud_ai = true if triage_score >= 8
estimated_api_cost = "$0.02" for MEDIUM context, "$0.04" for HIGH

Console output:
- Total games today: N
- Sending to cloud AI: N (estimated total cost: $X.XX)
- Skipping: N (insufficient signal)
- Top 3 games by triage score with their key signals
```

> "Look at that estimated cost. You're in control. If you want to spend $0.20 today, you set the threshold. If you want to analyze everything regardless, lower the threshold. The triage engine makes cost vs. coverage an explicit choice instead of an accident."

---

## Phase 5 — Prompt Engineering for Local Models (10 min)

**This is a teaching moment, not a build phase:**

> "You've now written three prompts for local models. Let's talk about what makes them work."

Draw this comparison in chat:

```
BAD PROMPT (for local models):
"Analyze this sports news article and tell me 
if it affects betting lines"

→ Gets: essay, opinions, hedging, inconsistent format, 
   unparseable output

GOOD PROMPT (for local models):
1. Strict output format (JSON only, no preamble)
2. Explicit categories to choose from
3. Scoring rules spelled out numerically
4. "Respond ONLY with..." instruction
5. No room for creativity

Why it matters: local models hallucinate more and 
go off-script more than cloud models. Tight constraints 
compensate for that. You're trading creativity for reliability.
```

**The JSON stripping issue:**

> "Local models sometimes output `\`\`\`json` before their JSON response even when you tell them not to. Here's the one-liner fix:"

```javascript
const cleaned = response
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();
const parsed = JSON.parse(cleaned);
```

> "This is in your classify-news.js already, but now you know why."

---

## Phase 6 — Day 4 Close (5 min)

**The full local pipeline is now:**

```
data/raw/news_*.json     → scripts/classify-news.js
data/raw/injuries_*.json → scripts/score-injuries.js
data/processed/context_* → scripts/triage.js
                                   ↓
                    data/processed/triage_*.json
                    (ranked games, send_to_cloud_ai flag)
```

**What Jordan built today:**
- `intelligence/prompts/news-classifier.md`
- `intelligence/prompts/injury-scorer.md`
- `scripts/classify-news.js`
- `scripts/score-injuries.js`
- `scripts/triage.js`

**Preview:**

> "Tomorrow is the big one. We take the triage output — the top games with all their context — and send them to Claude Sonnet for actual picks analysis. Everything this week was building the input. Tomorrow we get output."

**Update CLAUDE.md. Then:**

> "You've processed today's sports data through a local AI pipeline at zero API cost. Tomorrow that same data goes to a $0.04 Claude Sonnet call and comes back as an actual betting analysis. That's the routing framework in action."

---

## Failure Modes

**Ollama not running**
```bash
# Start Ollama service
ollama serve
# In another terminal:
ollama run phi3:mini "test"
```

**phi3:mini gives non-JSON output despite instructions**
This happens sometimes. Solutions in order:
1. Add "IMPORTANT: Output ONLY valid JSON, nothing else" to prompt
2. Switch to a more instruction-following model: `ollama pull mistral:7b`
3. Add more robust JSON extraction (find first `{` and last `}`)

**Classify-news.js is slow**
Expected — local models are slower than API calls. phi3:mini on M2 Air: ~2-5 seconds per article. 20 articles = ~60-100 seconds. That's acceptable for a batch job. If Jordan is impatient: "This runs in the background. In Week 3 we'll run it on a schedule overnight."

**Jordan asks "why not just send everything to Claude Sonnet?"**
Do the math: 20 articles × $0.003/call = $0.06. Times 30 days = $1.80/month. "Actually fine." But then expand: "What about when you have 50 games, 200 articles per day, and 100 users? $0.06 × 100 users × 30 days = $180/month just for news classification. Local model cost: $0. That's the scaling argument."
