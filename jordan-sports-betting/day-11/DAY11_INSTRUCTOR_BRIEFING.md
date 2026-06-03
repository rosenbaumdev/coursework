# Day 11 — Instructor Briefing
## Sports Betting AI — Web UI + Visual Dashboard

---

## Session Goal

Jordan builds the first visual interface: a clean web dashboard that displays today's picks, performance stats, and live odds. By end of session the product has a real UI that could be shown to a potential user.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | UI Design Interview | Jordan describes the dashboard he wants |
| 2 | PRD + Wireframe | Dashboard spec locked |
| 3 | Build the Dashboard | index.html — full picks dashboard |
| 4 | API Server | server.js — Express serving live data |
| 5 | Wire the Data | Dashboard reads from real pipeline output |
| 6 | Day 11 Close | CLAUDE.md updated |

---

## Phase 1 — UI Design Interview (10 min)

**Apply the same spec interview method from Day 0 mini golf:**

> "Before we write a line of HTML, tell me what you want to see when you open this dashboard. Walk me through it — what's on the screen?"

Listen for: picks for today, performance stats, maybe a picks history table, some indication of confidence level. Capture every element he describes.

Key questions:
1. "Dark mode or light mode?"
2. "What's the first number you want to see?"
3. "Should you see all picks or just high-confidence ones?"
4. "Should past picks show WIN/LOSS clearly?"
5. "Any real-time elements — countdown to game time?"

---

## Phase 2 — PRD + ASCII Wireframe (10 min)

**Write the PRD based on his answers:**

```
# Picks Dashboard — PRD v1

## Core Sections:
1. Header: logo/name + today's date + overall record
2. Today's Picks: cards for each pick (game, recommendation, confidence, key reasoning)
3. Performance Summary: win rate, ROI, recent form
4. Pick History: last 10 picks with outcomes

## Visual Design:
- Dark mode (sports/betting apps are typically dark)
- Accent color: [Jordan's choice]
- Pick cards: color-coded by confidence (green=high, yellow=medium, grey=low)
- WIN/LOSS badges on historical picks

## Data:
- Reads from: data/processed/triage_*.json, intelligence/outputs/pick_*, data/ledger/picks.json
- Refreshes every 5 minutes automatically
```

**ASCII wireframe:**

```
┌──────────────────────────────────────────────────────────┐
│  ⚡ EDGE FINDER AI        Today: 5-3-0  ROI: +4.2%      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  TODAY'S PICKS                          Thu Dec 14       │
│                                                          │
│  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │ Chiefs vs Raiders        │  │ Lakers vs Celtics   │  │
│  │ ████████░░ 8/10         │  │ █████░░░░░ 5/10    │  │
│  │ CHIEFS -3.5 (-110)      │  │ NO BET              │  │
│  │ DraftKings               │  │ Insufficient signal │  │
│  │ INJURY_MARKET_LAG       │  │                     │  │
│  └─────────────────────────┘  └──────────────────────┘  │
│                                                          │
│  PERFORMANCE                                             │
│  Record: 15-10-1 (58.0% ATS)  ROI: +5.1%  CLV: +1.2   │
│                                                          │
│  RECENT: W W L W W W L W (Last 8: 6-2)                 │
│                                                          │
│  PICK HISTORY ─────────────────────────────────────     │
│  Dec 13  Chiefs -3.5   WIN  +0.91u   CLV +1.5          │
│  Dec 13  Lakers O214   LOSS -1.00u   CLV -0.5          │
└──────────────────────────────────────────────────────────┘
```

---

## Phase 3 — Build the Dashboard (20 min)

**Launch Claude Code in the project folder:**

```
Build delivery/index.html — a sports betting picks dashboard.

Single HTML file with embedded CSS and JavaScript.
Dark theme. Clean, minimal, professional.

Data source: reads from a /api/data endpoint (we'll build this separately).
For now, use window.MOCK_DATA = {...} at the top of the file for testing.

Sections to build:

1. HEADER
   - App name (bold, large)
   - Today's date
   - Overall record badge: "15-10-1 (58% ATS)"

2. TODAY'S PICKS
   - Grid of pick cards (2 columns desktop)
   - Each card shows:
     * Matchup (bold)
     * Confidence bar (visual fill, 1-10 scale)
     * Recommendation (large, bold): "CHIEFS -3.5" or "NO BET"
     * Price: "(-110) at DraftKings"
     * Edge type badge: "INJURY LAG" / "PUBLIC FADE" / etc.
     * Units: "1.5 UNITS" 
     * Color: green border for confidence 8-10, yellow for 5-7, grey for NO_BET
   - Count: "3 picks today / 2 NO BET"

3. PERFORMANCE STATS (horizontal row)
   - Win Rate ATS
   - ROI %
   - Avg CLV
   - Streak (current W/L streak)

4. PICK HISTORY TABLE
   - Last 10 picks
   - Columns: Date | Matchup | Pick | Result | Profit | CLV
   - WIN = green, LOSS = red, PUSH = grey
   - Pending = white/dim

5. COST TRACKER (subtle, bottom right)
   - "API spend today: $X.XX | Month: $X.XX"

Use CSS Grid for layout. Auto-refresh: reload data every 5 minutes.
Animate confidence bar on load.

Mock data structure:
{
  record: { wins: 15, losses: 10, pushes: 1 },
  roi: 5.1,
  average_clv: 1.2,
  todays_picks: [ ... ],
  recent_picks: [ ... ]
}
```

**Open delivery/index.html in browser:**

```bash
open delivery/index.html
```

Give Jordan a few minutes to play with it. Ask: "What needs to change? What's missing?"

---

## Phase 4 — API Server (20 min)

**Connect the UI to real data:**

```bash
npm install express cors
```

**Prompt Claude Code:**

```
Build delivery/server.js — an Express server that serves the 
dashboard and provides a data API.

Routes:

GET / → serve delivery/index.html

GET /api/data → return JSON with all dashboard data:
{
  record: { wins, losses, pushes, win_rate, roi },
  average_clv: float,
  todays_picks: [ read from latest intelligence/outputs/pick_* files ],
  recent_picks: [ last 10 from data/ledger/picks.json ],
  cost_today: float,
  cost_month: float,
  last_updated: ISO timestamp
}

GET /api/picks → return just today's picks (for polling)

GET /api/performance → return full performance.json

GET /api/status → return last pipeline run status

Port: 3000
CORS: enabled (for development)

Add to package.json scripts:
"start": "node delivery/server.js"
"dev": "nodemon delivery/server.js" (install nodemon)
```

**Update delivery/index.html:**

Replace the mock data fetch with:
```javascript
const response = await fetch('/api/data');
const data = await response.json();
```

**Start the server:**

```bash
npm start
# or
node delivery/server.js
```

Open http://localhost:3000 in browser. Real data in the dashboard.

---

## Phase 5 — Wire the Data (5 min)

**Verify everything connects:**

1. Run the pipeline: `node scripts/pipeline.js --dry-run`
2. Check `/api/data` shows fresh data
3. Verify today's picks appear in the dashboard
4. Verify performance stats are accurate

**This is the product working as a whole** for the first time. Data flows from APIs through the pipeline through the server to the browser.

---

## Phase 6 — Day 11 Close (5 min)

**What Jordan built today:**
- `delivery/index.html` — full picks dashboard
- `delivery/server.js` — Express API server

**The moment:**

> "Open your laptop. You have a real web application serving live AI-generated sports betting analysis. That's a product. Tomorrow we put a paywall on it."

**Update CLAUDE.md.**