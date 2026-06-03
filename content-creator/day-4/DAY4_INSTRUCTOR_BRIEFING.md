# Day 4 — Instructor Briefing
## Content Business — Research Pipeline + Trend Monitoring

---

## Session Goal

Student builds an automated research system that surfaces trending topics, viral content angles, and relevant news in her niche daily. By end of session she never runs out of content ideas and always knows what's trending before she posts.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Why Research is a Competitive Advantage | The early mover wins |
| 2 | Trend Scraper | trend-monitor.js — TikTok and Google Trends |
| 3 | News Aggregator | health-news.js — hormonal health research + news |
| 4 | Competitor Watch | competitor-watch.js — track what's going viral in niche |
| 5 | Daily Research Digest | research-digest.js — unified morning brief |
| 6 | Day 4 Close | CLAUDE.md updated |

---

## Phase 1 — Why Research is a Competitive Advantage (10 min)

**Open with:**

> "Most content creators in your niche post based on gut feeling or what they personally experienced that week. That's fine. But the creators who grow fastest are the ones who know what their audience is searching for before they search for it — and what's trending before it peaks. We're going to build that intelligence."

**The three research questions you answer every morning:**

1. What is my audience actively searching for right now?
2. What topic is about to go viral that I can create for first?
3. What did the research world just publish that I can translate for normal people?

**Why it matters for this niche specifically:**

> "Hormonal health is a space where new research drops regularly and mainstream media either ignores it or covers it badly. When a study comes out showing that perimenopause brain fog is real and measurable, your audience needs that information. If you post it before anyone else does it in an accessible way — you win that news cycle. A thousand new followers from one timely post is not unusual."

---

## Phase 2 — Trend Monitor (20 min)

**Install dependencies:**

```bash
npm install node-fetch dotenv
```

**Add to .env:**
```
BRAVE_API_KEY=your_brave_key
```

Get Brave Search API key: api.search.brave.com → sign up → free tier = 2,000 queries/month.

**Prompt Claude Code:**

```
Build scripts/trend-monitor.js — surfaces trending topics in 
the women's health and identity space.

Uses Brave Search API (api.search.brave.com/res/v1/news/search)

Run daily in the morning. Searches for:

SEARCH QUERIES (run all, combine results):
1. "perimenopause" + freshness: pd (past day)
2. "hormonal health women" + freshness: pd
3. "mom identity midlife" + freshness: pw (past week)
4. "women over 35 health" + freshness: pd
5. "menopause symptoms" + freshness: pd
6. "cortisol women stress" + freshness: pw

For each article found, extract:
- title
- description
- url
- published_time
- source

Then send all results to Claude Sonnet with this prompt:
"You are a content strategist for a women's hormonal health and 
identity brand. Review these recent articles and news items.
Identify:
1. THREE topics that would make compelling short-form video content
   for women in perimenopause or the mom-to-self transition
2. For each topic: suggested hook concept (one sentence)
3. Why it's timely: one sentence
4. Content angle: Educational / Myth-bust / Validation / Story
Format as JSON array."

Save to data/trends/trends_{date}.json
Print a clean morning brief:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DAILY TREND BRIEF — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Topic] — [why timely]
   Hook: [suggested hook]
   Angle: [type]

2. [Topic]...
3. [Topic]...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 3 — Health News Aggregator (15 min)

**Separate from trends — this is specifically for research:**

```
Build scripts/health-news.js — aggregates hormonal health research

Sources:
1. Brave Search: "study perimenopause [current month year]"
2. Brave Search: "research women hormones [current month year]"
3. Brave Search: "NIH women health [current month year]"

Process each article through Claude Sonnet:
"Is this research relevant to women in perimenopause or the 
mom-to-self identity transition? If yes: summarize in 2 sentences 
in plain language (no jargon). Rate relevance 1-10.
If no: skip."

Output only items rated 7+.
Save to data/research/research_{date}.json

Console output: 
"Found [N] relevant research items today"
List each with plain-language summary and relevance score.

Add a special flag: if any item mentions a MYTH BEING BUSTED 
(e.g., "contrary to popular belief", "new research overturns"),
mark it VIRAL_POTENTIAL: true
```

> "Myth-bust content is consistently the highest-performing format in wellness spaces. When research overturns something people believe, that's a video. Automatically flagging it is how you catch those moments."

---

## Phase 4 — Competitor Watch (15 min)

**Frame this correctly:**

> "This is NOT about copying. It's about understanding what's resonating with your audience. When a competitor's video gets 500K views, that tells you the audience wants that topic. Your job is to make YOUR version — better, more specific, more YOU."

```
Build scripts/competitor-watch.js

Takes a list of competitor handles from a config file.
Create data/competitors.json:
{
  "tiktok": ["@handle1", "@handle2", "@handle3"],
  "instagram": ["@handle1", "@handle2"]
}

Note: We can't scrape TikTok/Instagram directly (against ToS).
Instead, use Brave Search to surface their recent viral content:

For each handle:
Search: "site:tiktok.com OR site:instagram.com [handle] [niche term]"
Find recent posts that appear in search results.

Additionally: search for the handle name + "viral" + "TikTok"
to surface any recently discussed content.

Process through Claude:
"Based on these search results about [competitor], what topics 
and content angles are generating the most engagement for them?
What can we learn about what this audience wants right now?
What gap do you notice — what are they NOT doing well?"

Save insights to data/competitors/insights_{date}.json
Print summary per competitor.
```

---

## Phase 5 — Daily Research Digest (10 min)

**Combine everything into one morning brief:**

```
Build scripts/research-digest.js — the daily morning brief.

Runs all three:
1. trend-monitor.js
2. health-news.js  
3. competitor-watch.js

Then synthesizes through Claude Sonnet:
"You are a content strategist. Based on today's trends, research, 
and competitor insights, recommend the SINGLE BEST piece of content 
to create today. Explain: topic, hook concept, why today, 
what makes it better than what's out there.
Be specific. One recommendation only."

Outputs everything to console + saves to data/daily_brief_{date}.md

Estimated daily cost: ~$0.05-0.10 per run.
```

**Schedule it:**

```bash
npm install node-cron
```

Add to a simple `scripts/scheduler.js`:

```javascript
const cron = require('node-cron');
// Run research digest every morning at 7:30am
cron.schedule('30 7 * * *', () => {
  require('./research-digest.js');
});
console.log('Research scheduler running...');
```

---

## Phase 6 — Day 4 Close (5 min)

**Run the full digest:**

```bash
node scripts/research-digest.js
```

Review what it surfaces. Does the top recommendation resonate? Would she actually make that video?

**Update CLAUDE.md. Then:**

> "Starting tomorrow, run this every morning before you make content decisions. Let it inform your calendar. You're not a slave to it — you override it with your judgment. But you'll never start a day staring at a blank page again."

**Tomorrow:** we build the content that comes from all this research, and we post the first three videos publicly.