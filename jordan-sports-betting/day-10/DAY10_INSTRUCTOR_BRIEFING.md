# Day 10 — Instructor Briefing
## Sports Betting AI — Backtesting + Historical Validation

---

## Session Goal

Jordan builds a backtesting framework using historical odds data from The Odds API. By end of session he has run the analysis prompt against past games and has the first data on whether the system's picks methodology would have had positive CLV.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Why Backtesting (and its limits) | Intellectual honesty about what backtesting proves |
| 2 | Historical Data Collection | Pull past odds from The Odds API |
| 3 | Backtest Runner | Apply picks prompt to historical data |
| 4 | Backtest Results Analysis | What do the numbers actually mean? |
| 5 | Week 2 Recap | Everything built this week reviewed |
| 6 | Day 10 Close | Week 3 preview |

---

## Phase 1 — Why Backtesting (and its limits) (10 min)

**Start with intellectual honesty:**

> "Backtesting sounds powerful. 'My system would have gone 62% ATS over the last three seasons.' It's also where most people fool themselves. Before we run the backtest, I want you to understand what it can and can't tell you."

**What backtesting CAN tell you:**
- Whether the prompt methodology is internally consistent
- Whether the edge detection logic would have identified historically significant situations
- Whether CLV (closing line value) is positive using historical opening lines

**What backtesting CANNOT tell you:**
- Whether future picks will be profitable
- Whether historical edges still exist (markets evolve)
- Whether your backtest is overfitted to past data

**The overfitting trap:**

> "If you run 50 variations of your prompt against historical data and pick the one that performs best — congratulations, you've found the one that happened to work on that specific historical data. It means nothing about the future. We run ONE version of our current prompt against historical data. We don't tune the prompt to the historical results."

**What we're actually testing:**

> "We want to know: does the system flag games with positive CLV (beating the closing line) at a rate above 50%? That's the one metric that would indicate genuine edge detection skill. Everything else is noise at this sample size."

---

## Phase 2 — Historical Data Collection (15 min)

**The Odds API has historical data. Not on the free tier.**

> "Here's a real business decision. The Odds API historical data endpoint costs $79/month. That's the same as the full paid tier. For the purposes of this course, we have two options."

**Option A: Use the free tier's recent data**
The free tier gives you 500 requests/month. If you've been running the collector since Day 2, you have a few days of saved odds files in `data/raw/`. We can backtest against those.

**Option B: Use sample historical data**
I'll provide a curated set of historical odds snapshots that simulate what a real backtest would look like.

**For this course, do Option A + explain Option B:**

```bash
# Count how many odds files we have
ls data/raw/odds_* | wc -l

# Look at the date range
ls -la data/raw/odds_* | head -5
ls -la data/raw/odds_* | tail -5
```

> "We have [N] days of data. That's enough to test the pipeline mechanics. For a real backtest you'd pay the $79 to get years of data. That investment makes sense when you have paying users. Today we test the framework."

**Alternative historical source: Kaggle**

> "There are free historical betting datasets on Kaggle. They're not in the same format as The Odds API, but they can be normalized to our schema. If you want to go deep on backtesting, that's the path."

---

## Phase 3 — Backtest Runner (20 min)

**Prompt Claude Code:**

```
Build scripts/backtest.js — runs the picks analysis prompt against
historical game data and compares recommendations to actual outcomes.

Input:
- A folder of historical context files (same format as data/processed/context_*)
- Actual game results (from data/ledger/picks.json or manual input)

Process for each historical game:
1. Load the context file (odds + news + injuries at time of game)
2. Run through picks-engine logic (call Anthropic API)
3. Record the recommendation
4. Compare to actual outcome (if known)
5. Calculate CLV: opening line vs. closing line
6. Determine if pick was WIN/LOSS/PUSH

Output to data/backtest/results_{timestamp}.json:
{
  "summary": {
    "games_analyzed": N,
    "picks_made": N,
    "no_bet": N,
    "win_rate": "X%",
    "roi": "X%",
    "average_clv": X,
    "clv_positive_rate": "X%",
    "high_confidence_win_rate": "X%",
    "sample_warning": "SMALL SAMPLE — X picks insufficient for statistical significance"
  },
  "picks": [ ... per-game details ... ]
}

Cost management:
- Each backtest game costs ~$0.01 in API
- For >20 games, ask confirmation: 
  "About to analyze [N] games at ~$[cost]. Continue? (y/n)"
- Add --max-games flag to limit (default 10)
- Add --use-cache flag to cache results (same input → same output)

Console output: progress bar as games are processed
"[████████░░] 8/10 games analyzed — $0.08 spent"
```

**Run it:**

```bash
node scripts/backtest.js --max-games 10
```

---

## Phase 4 — Backtest Results Analysis (10 min)

**Review the results together:**

> "Before we interpret these numbers, remind me: what's the minimum win rate to be profitable at -110 juice?"

Answer: 52.4%

**Walk through the output with appropriate skepticism:**

- If win rate > 55%: "Interesting signal. But 10 games is nothing — could be pure variance. We need 50+ to say anything meaningful."
- If win rate < 50%: "Also expected with small sample. Not alarming. Keep tracking."
- If CLV positive rate > 55%: "This is the most encouraging number. It suggests the system is identifying situations where the line moves in our predicted direction after our pick. That's repeatable skill, not luck."

**The honest conclusion:**

> "What we've proven today: the pipeline works end-to-end on historical data. The prompt produces picks that aren't random. We have no statistically significant evidence of edge yet — that requires more time and data. That's the honest state of things. And that's okay. We're building the machine. The machine needs time to produce results."

---

## Phase 5 — Week 2 Recap (10 min)

**Everything built this week:**

```
Week 2 — Built:
□ Picks ledger — immutable record of every pick (Day 6)
□ Results fetcher — automated outcome tracking (Day 6)
□ Performance calculator — win rate, ROI, CLV (Day 6)
□ Text dashboard — formatted performance report (Day 6)
□ Pipeline orchestrator (Day 7)
□ Scheduler — fully automated, runs without you (Day 7)
□ Error alerting (Day 7)
□ Quality audit + prompt v2 (Day 8)
□ A/B test framework for prompts (Day 8)
□ Response cache with adaptive TTL (Day 9)
□ Event-driven cache invalidation (Day 9)
□ Backtest framework (Day 10)

Total API spend this week: ~$3-5
Product status: automated, self-tracking, cost-optimized
```

**Ask Jordan:**

> "If someone offered to pay $10/month for access to this right now — would you say yes? Why or why not?"

Let him reason through it. Answer should involve: "Not yet — no track record, no UI, no way to actually pay me." That sets up Week 3 perfectly.

---

## Phase 6 — Day 10 Close + Week 3 Preview (5 min)

**Week 3 is product week:**

| Day | Focus |
|-----|-------|
| Day 11 | Web UI — visual dashboard with live picks |
| Day 12 | User auth + subscription paywall |
| Day 13 | Email delivery system |
| Day 14 | Deployment — goes live on the internet |
| Day 15 | Launch day — real users, final product review |

> "Week 3 is where it becomes real. The data pipeline is done. The AI is working. Next week we wrap it in a product that someone can actually pay for. You're building a launch by end of week."

**Update CLAUDE.md. Get some sleep.**

---

## Failure Modes

**Not enough historical data for meaningful backtest**
Expected. Frame it correctly: "The backtest proved the pipeline mechanics work. Sample size prevents statistical conclusions. That's the correct answer — not a failure."

**Jordan is discouraged by uncertain results**
> "Every serious quantitative analyst looks at a 10-game sample and says 'too small.' That's intellectual honesty, not failure. The sports betting services that claim 70% win rates with unverified records are lying. You're building the honest version. That has value."

**API cost for backtest is higher than expected**
Run --max-games 5 for the lesson. The point is understanding the methodology, not running a full historical study.
