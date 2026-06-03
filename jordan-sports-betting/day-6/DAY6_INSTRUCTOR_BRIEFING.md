# Day 6 — Instructor Briefing
## Sports Betting AI — Accuracy Tracking + Historical Record

---

## Session Goal

Jordan builds the system that makes this product credible: a picks tracker that records every recommendation, actual outcomes, and running performance metrics. By end of session the product can answer "is this actually working?"

---

## Context Check

> "How many picks did the engine generate last week? What were the recommendations?"

He should know the games, the bet types, and the confidence scores from Day 5. If the picks engine ran successfully, there are files in `intelligence/outputs/`. Review them together before building anything new.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Why Tracking Matters | Jordan understands why untracked picks are worthless |
| 2 | Picks Ledger | picks-ledger.js — database of every pick made |
| 3 | Results Fetcher | results-fetcher.js — pulls actual game outcomes |
| 4 | Performance Calculator | performance.js — ROI, win rate, CLV |
| 5 | Accuracy Dashboard | Text-based performance report |
| 6 | Day 6 Close | CLAUDE.md updated |

---

## Phase 1 — Why Tracking Matters (10 min)

**Open with a real talk:**

> "Every sports bettor on Twitter says they're profitable. None of them are. Why? Because they remember wins and forget losses. Human memory is garbage at tracking performance objectively. The only way to know if your picks system works is to track every single pick before the game, record the outcome after, and calculate real numbers. No exceptions, no cherry-picking."

**Introduce the three metrics that matter:**

1. **Win Rate (ATS)** — what percentage of against-the-spread picks win
   - Breakeven against -110 juice: 52.4%
   - Good: 55%+
   - Elite: 58%+

2. **ROI (Return on Investment)** — profit/loss as percentage of total wagered
   - Breakeven: 0%
   - Good: 3-5%
   - Elite: 8%+

3. **CLV (Closing Line Value)** — did you beat the closing line?
   - The most important metric professionals use
   - If you bet Chiefs -3 and the line closed at -4.5, you got value (+1.5 CLV)
   - Positive CLV over time = you're beating the market, even if short-term results vary

> "CLV is the metric that separates skill from luck. You can win 60% on a small sample by variance. But if you're consistently beating the closing line, you're identifying edges the market eventually prices in. That's repeatable skill."

---

## Phase 2 — Picks Ledger (20 min)

**Introduce the concept:**

> "Every pick gets a record the moment it's generated — before the game. We never add picks retroactively. The ledger is immutable for past picks."

**Create the data structure:**

```bash
mkdir data/ledger
touch data/ledger/picks.json
```

Initialize with empty array:
```json
[]
```

**Prompt Claude Code:**

```
Build scripts/picks-ledger.js — the picks tracking system.

This script has two modes:

MODE 1: RECORD (run automatically after picks-engine.js)
Reads all new pick files from intelligence/outputs/ that 
don't yet exist in data/ledger/picks.json

For each new pick, add a ledger entry:
{
  "pick_id": "uuid",
  "recorded_at": "ISO timestamp — when we made the pick",
  "game_id": "from picks output",
  "matchup": "Away @ Home",
  "commence_time": "game start time",
  "sport": "sport key",
  
  "recommendation": {
    "type": "SPREAD|MONEYLINE|TOTAL|NO_BET",
    "side": "HOME|AWAY|OVER|UNDER|NONE",
    "line": "e.g. -3.5",
    "price": "e.g. -110",
    "confidence": 1-10,
    "units": 0.5/1/1.5/2/0
  },
  
  "opening_line": "line at time of pick",
  "closing_line": null,    // filled in after game
  "result": null,           // "WIN"|"LOSS"|"PUSH"|"NO_BET"|"VOID"
  "clv": null,              // closing_line - opening_line (filled in after)
  "profit_units": null,     // filled in after game
  "recorded_by": "picks-engine-v1",
  "prompt_version": "picks-analysis-v1",
  "source_files": {
    "triage": "filename",
    "context": "filename"
  }
}

Save NO_BET picks too — tracking what you DIDN'T bet is 
as important as what you did.

MODE 2: STATUS (run anytime)
node scripts/picks-ledger.js --status

Print current ledger summary:
- Total picks recorded
- Pending (game hasn't happened yet)
- Awaiting result (game completed, result not entered)
- Completed (result entered)
- Breakdown by bet type and confidence level
```

**After building, run it:**

```bash
node scripts/picks-ledger.js
```

Then check status:

```bash
node scripts/picks-ledger.js --status
```

---

## Phase 3 — Results Fetcher (20 min)

**The problem:**

> "After a game ends, we need to record the actual score so we can calculate win/loss. We could enter this manually — but that doesn't scale. We'll build a script that fetches game scores automatically."

**Prompt Claude Code:**

```
Build scripts/results-fetcher.js that fetches completed game scores
and updates the picks ledger.

Data source: The Odds API scores endpoint
GET https://api.the-odds-api.com/v4/sports/{sport}/scores
Parameters: daysFrom=3 (get scores from last 3 days)

Process:
1. Read data/ledger/picks.json
2. Find picks where result === null and commence_time is in the past
3. For each, fetch the score from The Odds API
4. Match by game_id or team names + date
5. If game is completed (completed: true in API response):
   a. Record closing_line (if available from The Odds API)
   b. Calculate result: WIN/LOSS/PUSH
   c. Calculate profit_units:
      - WIN at -110: profit = units × (100/110) = units × 0.909
      - WIN at +150: profit = units × 1.5
      - WIN at -150: profit = units × (100/150) = units × 0.667
      - LOSS: profit = -units
      - PUSH: profit = 0
   d. Calculate CLV if closing_line available:
      CLV = closing_line - opening_line (positive = you got value)
   e. Update ledger entry

6. Save updated ledger

7. Console output for each resolved pick:
   "[Matchup]: [Our Pick] — [WIN/LOSS/PUSH] — [+/- units] — CLV: [+/-X]"

Handle edge cases:
- Game postponed: set result = "VOID", profit_units = 0
- Score not yet available: skip (try again next run)
- Team name mismatch: log warning, skip
```

**Important teaching moment:**

> "Notice we're using The Odds API for both odds AND scores. That's intentional — same data source, consistent data format, one API key. When you pick your data providers, minimizing the number of external dependencies is always cleaner. Each additional provider is another failure point."

---

## Phase 4 — Performance Calculator (15 min)

**Prompt Claude Code:**

```
Build scripts/performance.js — calculates all performance metrics
from the picks ledger.

Read data/ledger/picks.json and calculate:

OVERALL STATS (all time):
- total_picks: count of non-NO_BET picks
- total_no_bet: count of NO_BET recommendations
- completed: picks with result recorded
- pending: picks awaiting game/result
- win_rate: wins / (wins + losses) — exclude pushes
- roi: total_profit_units / total_units_wagered × 100
- total_profit_units: sum of profit_units for completed picks
- average_clv: mean CLV for completed picks (if available)
- clv_positive_rate: % of picks with positive CLV

BY CONFIDENCE LEVEL (1-5, 6-7, 8-10):
- win_rate per band
- roi per band
- sample_size per band

BY BET TYPE:
- win_rate for SPREAD, MONEYLINE, TOTAL separately
- roi per type

RECENT FORM (last 10 picks):
- win_rate
- profit_units
- trend: "RUNNING_HOT"|"RUNNING_COLD"|"NEUTRAL"

Output: save to data/ledger/performance.json AND print to console
as a clean formatted report.

Minimum sample size warning: 
If completed < 20, print "⚠️  SMALL SAMPLE — results not statistically significant"
If completed < 50, print "⚠️  DEVELOPING SAMPLE — track for more accuracy"
```

**After running with the current (tiny) dataset:**

> "It's going to show the warning — small sample. That's correct. You need 50+ picks before the numbers mean anything statistically. What you're building today is the infrastructure to collect those 50 picks. The data will come."

---

## Phase 5 — Text Performance Dashboard (10 min)

**Build a clean output report:**

```
Build scripts/dashboard.js — prints a formatted performance report.

Format it like this:

══════════════════════════════════════════════
  SPORTS BETTING AI — PERFORMANCE DASHBOARD
  [Sport] | Updated: [timestamp]
══════════════════════════════════════════════

📊 OVERALL RECORD
   Picks: [W]-[L]-[P] ([win_rate]% ATS)
   ROI: [+/-X.X]%  |  Units: [+/-X.XX]
   Avg CLV: [+/-X.X]  |  CLV+ Rate: [X]%

📈 BY CONFIDENCE
   High (8-10): [W]-[L] | [win_rate]% | ROI [X]%
   Mid  (6-7):  [W]-[L] | [win_rate]% | ROI [X]%
   Low  (1-5):  [W]-[L] | [win_rate]% | ROI [X]%

🎯 BY BET TYPE
   Spreads:    [W]-[L] | [win_rate]% | ROI [X]%
   Totals:     [W]-[L] | [win_rate]% | ROI [X]%
   Moneylines: [W]-[L] | [win_rate]% | ROI [X]%

🔥 RECENT FORM (Last 10)
   [W]-[L] | [+/-X.XX] units | [trend emoji]

⚠️  [Sample size warning if applicable]

Last 5 picks:
   [date] [matchup] [pick] → [WIN+X.X / LOSS-X.X]
   ...

══════════════════════════════════════════════
```

Run it:
```bash
node scripts/dashboard.js
```

> "This is the report you'll eventually email to subscribers every morning. Right now it's a terminal printout. Week 3 we put it in a web UI. The data model doesn't change — just the rendering."

---

## Phase 6 — Day 6 Close (5 min)

**What Jordan built today:**
- `scripts/picks-ledger.js` — immutable picks record
- `scripts/results-fetcher.js` — automated outcome collection
- `scripts/performance.js` — full metrics calculator
- `scripts/dashboard.js` — formatted performance report

**The credibility argument:**

> "Here's why this matters for monetization: anyone can claim they have a winning picks service. Almost none of them do. When you can show users a verifiable track record — pick made before game, outcome fetched from API, CLV tracked — that's a product people pay for. The tracking layer is your competitive advantage."

**Update CLAUDE.md. Then:**

> "Tomorrow we make the whole pipeline run automatically. Right now you run 6 different scripts manually in order. A scheduler makes it run itself. That's when it goes from project to product."

---

## Failure Modes

**The Odds API scores endpoint returns empty**
Most common reason: sport is in off-season. The scores endpoint only returns data when games have been played recently. Work with hypothetical data for now: manually add a test entry to the ledger with result=null, then run results-fetcher to test the structure.

**Profit calculation is wrong for non-standard lines**
This is a real complexity — each odds price changes the payout. Verify the formula:
- American odds to decimal: negative odds → 1 + (100/|odds|), positive odds → 1 + (odds/100)
- Profit = stake × (decimal_odds - 1)
If results-fetcher has a bug here, have Claude Code fix it with test cases.

**Jordan asks "what's a good win rate to tell users?"**
> "Don't tell users anything until you have 50 picks tracked. Anyone who launches a picks service and immediately claims a win rate is lying or delusional. You'll know your real number in about a month."

**Jordan wants to enter picks retroactively**
Hard no. > "If you start entering picks you know the result of, the whole system is worthless. Every entry must be made before the game. That's the rule. No exceptions. The system's value is in the honest record."
