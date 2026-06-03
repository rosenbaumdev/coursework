# Day 9 — Instructor Briefing
## Sports Betting AI — Response Caching + Cost Optimization

---

## Session Goal

Jordan builds a caching layer that prevents duplicate API calls, cuts cloud AI costs by 60-80% at scale, and introduces the concept of cache invalidation. By end of session the product is ready to serve multiple users efficiently.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Cost Math at Scale | Why caching is essential for monetization |
| 2 | Cache Architecture | How the cache works |
| 3 | Build the Cache | cache.js + integration into picks-engine |
| 4 | Cache Invalidation Logic | When to use cached vs. fresh analysis |
| 5 | Cost Tracker Dashboard | Real-time cost monitoring |
| 6 | Day 9 Close | CLAUDE.md updated |

---

## Phase 1 — The Cost Math at Scale (10 min)

**Work through the numbers together:**

```
WITHOUT CACHING (100 users, 5 games/day):
- Each user's dashboard loads → triggers picks analysis
- 100 users × 5 games × $0.01/game = $5.00/day
- $5.00 × 30 days = $150/month in API costs
- Users paying $25/month: $2,500 revenue - $150 API = $2,350 profit
- Manageable, but...

What if 1,000 users?
- $1,500/month API cost
- $25,000 revenue - $1,500 = $23,500 profit ✓ still fine

WITH CACHING:
- First user to view a game triggers analysis ($0.01)
- Users 2-100 viewing same game: $0.00 (serve cached result)
- Cache hit rate estimate: 95% (same 5 games, many users)
- 100 users × 5 games × $0.01 × 5% = $0.025/day
- $0.025 × 30 days = $0.75/month in API costs
- $25/user × 100 users = $2,500 - $0.75 = $2,499.25 profit

Cache = 200x reduction in API cost at 100 users
Cache = 2,000x reduction at 1,000 users
```

> "The difference between a profitable business and a money-losing one at scale is caching. It's not optional — it's the architecture decision that determines whether your margins hold as you grow."

---

## Phase 2 — Cache Architecture (10 min)

**Design it together before writing any code:**

```
CACHE KEY: game_id + triage_hash
  Why: same game analyzed with same input data → same result
  triage_hash: MD5 of the triage data (if data changes, key changes)

CACHE STORAGE: data/cache/ folder (JSON files)
  Why not database: we don't have one yet. 
  Week 3 we may add SQLite. For now, files work.

CACHE ENTRY:
{
  "cache_key": "abc123_def456",
  "game_id": "abc123",
  "created_at": "ISO timestamp",
  "expires_at": "ISO timestamp",
  "ttl_hours": 4,
  "triage_hash": "def456",
  "pick_data": { ... full pick object ... },
  "cache_hits": 0,
  "input_tokens_saved": 1200,
  "output_tokens_saved": 400
}

CACHE TTL (time to live):
- 4 hours before game: 2-hour TTL (line moves fast)
- 4-24 hours before game: 4-hour TTL
- > 24 hours before game: 8-hour TTL
- Game in progress: don't cache
- Game completed: permanent cache (won't change)

CACHE HIT LOGIC:
1. Check if cache entry exists for this game_id + triage_hash
2. Check if entry is expired (now > expires_at)
3. If valid: return cached pick, increment cache_hits counter
4. If expired or missing: run analysis, store result
```

> "Notice the TTL varies by time-to-game. The closer the game, the faster lines move, the shorter the cache life. This is called adaptive TTL — the cache lifetime adjusts to data volatility."

---

## Phase 3 — Build the Cache (20 min)

**Prompt Claude Code:**

```
Build scripts/cache.js — a file-based caching layer for picks analysis.

Export these functions:

async function getCached(gameId, triageData)
  - Compute triage_hash: MD5 of JSON.stringify(triageData)
  - Look for data/cache/{gameId}_{triageHash}.json
  - If file exists and not expired: 
    return { hit: true, data: pickData, age_minutes: N }
  - If expired or missing: 
    return { hit: false }

async function setCached(gameId, triageData, pickData)
  - Compute cache key
  - Calculate TTL based on game commence_time:
    - > 24 hours: 8 hours TTL
    - 4-24 hours: 4 hours TTL  
    - < 4 hours: 2 hours TTL
    - < 1 hour: 30 minutes TTL
    - Game started: do not cache (return without saving)
  - Save to data/cache/{gameId}_{triageHash}.json
  - Log: "Cached pick for [game] (TTL: Xh)"

async function invalidateGame(gameId)
  - Delete all cache files matching data/cache/{gameId}_*.json
  - Use when significant news breaks about this game

async function getCacheStats()
  - Count all cache files
  - Sum cache_hits across all entries
  - Calculate tokens saved (input + output)
  - Calculate estimated cost saved
  - Return stats object

async function cleanExpired()
  - Delete all expired cache files
  - Return count of deleted files

Also: mkdir data/cache if it doesn't exist

Install crypto (built-in to Node): use crypto.createHash('md5')
```

**Integrate into picks-engine.js:**

```
Update picks-engine.js to use the cache:

Before calling Anthropic API for a game:
  const cached = await getCached(gameId, triageData)
  if (cached.hit) {
    log(`Cache HIT for ${game} (${cached.age_minutes}min old) — skipping API call`);
    use cached.data as the pick result;
    continue to next game;
  }

After getting Anthropic API response:
  await setCached(gameId, triageData, pickData);
  
Add to pipeline summary:
  "Cache hits: X/Y games (saved $X.XX in API costs)"
```

**Test it:**

Run picks-engine.js twice in a row on the same data. Second run should show all cache hits.

---

## Phase 4 — Cache Invalidation Logic (15 min)

**Introduce the hardest problem in software:**

> "There's a famous quote: 'There are only two hard things in computer science: cache invalidation and naming things.' You're about to find out why."

**The problem:**

> "Your cache says Chiefs -3.5, analyzed 2 hours ago. Then breaking news: Patrick Mahomes listed as OUT for Sunday. The cached pick is now wrong. How does the system know to invalidate it?"

**Build a cache invalidation trigger:**

```
Add to classify-news.js:
When a news article is classified as:
  category: "INJURY" AND impact: "HIGH"
  
  1. Identify which team is affected (affected_team field)
  2. Find any cached picks involving that team
  3. Call invalidateGame(gameId) for each affected game
  4. Log: "⚠️  Cache invalidated for [game] — HIGH impact injury news detected"
  5. On next picks-engine.js run, those games will be re-analyzed

Add to scheduler.js:
  After news classification runs, check for invalidations.
  If any games were invalidated: immediately trigger 
  picks-engine.js for those games specifically.
  (Don't wait for the next scheduled run.)
```

**Run a test:**

Manually edit a news file to add a HIGH impact injury article for one of today's games. Run classify-news.js. Verify the cache gets invalidated. Run picks-engine.js and verify it re-analyzes that game.

> "This is event-driven invalidation. The cache stays warm until something meaningful changes. That's the right design — don't invalidate based on time alone when you can invalidate based on relevant events."

---

## Phase 5 — Cost Tracker Dashboard (5 min)

**Add to dashboard.js:**

```
Add a COST TRACKING section:

💰 API COST TRACKING
   Today: $X.XX | This week: $X.XX | This month: $X.XX
   
🗄️  CACHE PERFORMANCE
   Cache hit rate: X% | Picks from cache: X/Y
   Tokens saved: X,XXX | Cost saved: $X.XX
   Cache entries: X | Expired and cleaned: X
```

> "Every time you open the dashboard, you see both what you're spending and what you're saving. That framing matters — the cache isn't just a technical tool, it's a financial tool."

---

## Phase 6 — Day 9 Close (5 min)

**What Jordan built today:**
- `scripts/cache.js` — full caching system with adaptive TTL
- Cache integration in picks-engine.js
- Event-driven cache invalidation
- Cost savings tracking

**Update CLAUDE.md.**

**Preview Day 10:**

> "Tomorrow we look backward instead of forward. Backtesting — running the system against historical data to evaluate what the picks quality would have been before today. It's how you validate the system before charging money for it."
