# Day 7 — Instructor Briefing
## Sports Betting AI — Scheduling + Full Pipeline Automation

---

## Session Goal

Jordan builds the scheduler that runs the entire pipeline automatically. By end of session, the product can run from data collection through picks generation without any manual intervention.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Automation Architecture | Jordan understands cron, node-cron, and when to run what |
| 2 | Pipeline Runner | pipeline.js — runs all scripts in sequence |
| 3 | Scheduler | scheduler.js — cron-based automation |
| 4 | Error Alerting | Slack/email alert when pipeline fails |
| 5 | Day 7 Close | CLAUDE.md updated, Week 2 preview |

---

## Phase 1 — The Automation Architecture (10 min)

**Open with:**

> "Right now you run 6 scripts manually. That's fine for learning. But the value of this product depends on it running without you. If you have to be awake at 6am to run the pipeline before games, it's a hobby. If it runs itself and emails you the results, it's a business. Today we automate everything."

**Introduce cron:**

> "Cron is the Unix scheduler — it's been around since the 1970s and it still runs most of the world's automated jobs. The syntax looks weird at first but it's just: minute hour day month weekday. We'll use node-cron so we don't have to mess with system cron."

```bash
npm install node-cron
```

**Schedule design — draw it out:**

```
DAILY SCHEDULE:
8:00 AM  — collect odds, news, injuries
8:15 AM  — normalize + correlate + classify
8:30 AM  — triage + picks engine (cloud AI)
8:35 AM  — record new picks in ledger
9:00 AM  — email digest (Week 3)

RESULTS SCHEDULE:
11:00 PM — fetch results for yesterday's games
11:05 PM — update ledger + recalculate performance

ODDS UPDATE (game days only):
Every 2 hours from 8am-8pm on days with games:
— refresh odds only (fast, cheap)
— check for significant line movement
— alert if HIGH_IMPACT change detected
```

> "Notice the picks engine runs once a day in the morning. We're not re-running it every hour — each run costs money. The odds refresh runs more frequently but that's cheap (just storing data)."

---

## Phase 2 — Pipeline Runner (20 min)

**Prompt Claude Code:**

```
Build scripts/pipeline.js — orchestrates the full data pipeline.

This script runs all stages in sequence with error handling.

Stages (run in order):
1. odds-collector.js
2. normalize-odds.js
3. news-collector.js
4. injury-scraper.js
5. correlate.js
6. classify-news.js
7. score-injuries.js
8. triage.js
9. picks-engine.js
10. picks-ledger.js (record new picks)
11. results-fetcher.js (update past results)
12. performance.js (recalculate stats)

For each stage:
- Log: "▶ Starting [stage name]..."
- Time the execution
- Log: "✓ [stage name] completed in Xs"
- If error: log "✗ [stage name] FAILED: [error message]"
           then decide: continue or abort?
           
Abort on failure: stages 1-4 (no data = no point continuing)
Continue on failure: stages 5-12 (partial data is better than nothing)

After all stages:
- Print pipeline summary:
  "Pipeline complete: X/12 stages succeeded in Xs total"
  "New picks: X | Games analyzed: X | Estimated cost: $X.XX"

Add flags:
--dry-run: run all stages except picks-engine (no API cost)
--odds-only: run only stages 1-2 (quick odds refresh)
--results-only: run only stages 11-12 (update outcomes)
--force: ignore rate limit warnings and run anyway

Save pipeline run log to data/logs/pipeline_{timestamp}.json
```

**Test it:**

```bash
node scripts/pipeline.js --dry-run
```

Walk through the output. Fix any stage that fails.

---

## Phase 3 — Scheduler (20 min)

**Prompt Claude Code:**

```
Build scripts/scheduler.js — the always-on automation engine.

Use node-cron for scheduling. The scheduler should run continuously
(it's a long-running process, not a one-shot script).

Schedule:

1. MORNING PIPELINE — every day at 8:00 AM local time
   node scripts/pipeline.js
   cron: '0 8 * * *'

2. ODDS REFRESH — every 2 hours, 8am to 8pm
   node scripts/pipeline.js --odds-only
   cron: '0 8,10,12,14,16,18,20 * * *'

3. RESULTS CHECK — every day at 11:00 PM
   node scripts/pipeline.js --results-only
   cron: '0 23 * * *'

4. DAILY STATUS LOG — every day at 9:00 AM (after morning pipeline)
   node scripts/dashboard.js
   Log output to data/logs/daily_status_{date}.txt
   cron: '0 9 * * *'

Add a manual trigger endpoint using a simple HTTP server:
POST http://localhost:3001/run-pipeline → runs full pipeline now
POST http://localhost:3001/run-odds → runs odds refresh now
GET  http://localhost:3001/status → returns last pipeline result

Console output when each job fires:
"[timestamp] ⏰ Scheduled job starting: [job name]"
"[timestamp] ✅ Job complete: [job name] — [summary]"
"[timestamp] ❌ Job failed: [job name] — [error]"

The scheduler should handle process crashes gracefully:
- Catch uncaught exceptions, log them, keep running
- If a job is still running when the next trigger fires, skip that trigger
  and log "Skipping — previous run still active"
```

**Start the scheduler:**

```bash
node scripts/scheduler.js
```

> "This process needs to stay running. In Week 3 we'll put this on a server so it runs even when your laptop is closed. For now it runs while your Mac is on."

---

## Phase 4 — Error Alerting (10 min)

**Introduce the problem:**

> "The scheduler runs without you. When it fails — and it will fail — you need to know immediately. Not 12 hours later when you check your laptop. We'll set up a simple alert system."

**Option A (simpler): Write failures to a file + check on startup**

```
In pipeline.js: if any stage fails, append to data/logs/errors.log
In scheduler.js: on startup, check if errors.log has new entries
                 since last run. Print them prominently.
```

**Option B (better): Free Slack webhook**

```bash
# Create a free Slack workspace, create a channel #pipeline-alerts
# Go to api.slack.com → Create App → Incoming Webhooks → copy URL
# Add to .env: SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

Prompt Claude Code:
```
Add alert function to pipeline.js:
async function alert(message, level = 'INFO') {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  // POST to Slack webhook
  // Level INFO: normal completion summary
  // Level ERROR: stage failure (send immediately)
  // Level CRITICAL: pipeline aborted
}

Send alerts:
- Pipeline complete (INFO): summary of picks generated
- Stage failed (ERROR): which stage, error message
- Pipeline aborted (CRITICAL): immediate notification
```

> "This is a professional practice — every production system has alerting. When you have paying users depending on morning picks, you need to know if the pipeline died at 3am."

---

## Phase 5 — Day 7 Close (5 min)

**What Jordan built today:**
- `scripts/pipeline.js` — full pipeline orchestration
- `scripts/scheduler.js` — automated cron-based runner with HTTP triggers
- Error alerting (Slack or file-based)

**Ask Jordan:**

> "What's happening right now in the background while we're talking?"

Answer: the scheduler is running, watching the clock, and will fire the morning pipeline at 8am tomorrow without any action from Jordan.

> "That's the difference between a tool and a product. Tomorrow morning your laptop will collect data, analyze games, and generate picks while you're still asleep. That's the business."

**Week 2 preview:**

| Day | Focus |
|-----|-------|
| Day 8 | Prompt engineering — improve pick quality |
| Day 9 | Response caching — cut API costs |
| Day 10 | Historical data + backtesting |
| Day 11 | Web UI — first visual dashboard |

---

## Failure Modes

**node-cron doesn't fire at the right time**
Check timezone. node-cron uses system timezone by default. Add `{ timezone: "America/Los_Angeles" }` as third argument to cron.schedule().

**Pipeline hangs (never completes)**
Usually a script waiting for input or hitting a rate limit. Add timeouts: each stage should fail after 5 minutes if not complete. `Promise.race([scriptPromise, timeout(300000)])`.

**Jordan wants to deploy this to a server immediately**
> "Not yet. We need to make the local version reliable first. Two more days of improvements, then we deploy. Deploying broken code to a server just means broken code running 24/7."
