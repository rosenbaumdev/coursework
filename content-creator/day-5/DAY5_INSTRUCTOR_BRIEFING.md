# Day 5 — Instructor Briefing
## Content Business — First Week of Content Posted + Analytics Setup

---

## Session Goal

Student posts her first week of content, sets up analytics tracking, and reviews early performance data. By end of session she has a live presence on both platforms and understands what the numbers mean.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Pre-Post Checklist | All accounts ready |
| 2 | Batch + Post | Full week's content produced and scheduled |
| 3 | Analytics Setup | TikTok Analytics + Instagram Insights configured |
| 4 | Analytics Tracker | analytics-tracker.js — weekly number recording |
| 5 | Week 1 Debrief | What we built, what comes next |
| 6 | Day 5 Close | Week 2 preview |

---

## Phase 1 — Pre-Post Checklist (10 min)

**Accounts must be right before anything goes live:**

```
TikTok:
□ Username matches brand name
□ Profile photo: brand graphic (from Canva — no face needed, 
  use an icon or aesthetic image)
□ Bio: clear, specific, one-line description + what to expect
□ Link in bio: not yet (we'll add when there's something to link to)

Instagram:
□ Same username as TikTok (critical for brand consistency)
□ Same profile photo
□ Bio same format
□ Set to Creator account (not personal) for analytics access

Bio formula:
"[What you help] → [who you help] → [how they feel after]"
Example: "Decoding the hormone chaos → for women who thought 
this was just aging → so you can feel like yourself again 🌿"
```

---

## Phase 2 — Batch + Post (20 min)

**Run the pipeline for the full week:**

If she only has 3 videos from Day 3, make 2 more now:

```bash
node scripts/research-digest.js   # what's trending today
node scripts/hook-generator.js "[topic]"
node scripts/script-writer.js "[hook]" "[topic]"
node scripts/caption-engine.js content/scripts/script_[timestamp].md
```

Produce video in CapCut.

**Posting strategy — first week:**

| Day | Platform | Content Type |
|-----|----------|-------------|
| Day 1 (today) | TikTok | Introduction / who you are and who this is for |
| Day 2 | Instagram | Educational (pillar 1) |
| Day 3 | TikTok | Myth-bust (highest viral potential) |
| Day 4 | Instagram | Personal/emotional |
| Day 5 | TikTok | List format ("5 things your doctor never told you about...") |

**The introduction video is critical:**

> "Your first video should answer: who is this for and why should they care? Not a formal intro — a natural one. 'If you're in your late 30s or 40s and you feel like your body is staging a rebellion and nobody can explain why — this account is for you.' That's an introduction."

**Posting times that work in this niche:**

- TikTok: 6-9am, 12-3pm, 7-11pm (your audience's downtime)
- Instagram: 6-8am, 11am-1pm, 7-9pm

**Add captions at time of posting:**

TikTok: paste the TikTok caption from the script file
Instagram: paste the Instagram caption + hashtags

---

## Phase 3 — Analytics Setup (10 min)

**TikTok Analytics:**
- Account → Creator Tools → Analytics
- Switch to Pro account if not already (free, takes 30 seconds)
- Note: analytics populate after ~24 hours

**Instagram Insights:**
- Professional Dashboard → Insights
- Already available if Creator account is set

**What metrics matter in Week 1:**

| Metric | What it means | Good signal |
|--------|--------------|-------------|
| Views | Reach | Any views = algorithm is testing it |
| Watch time % | Are they staying? | >50% = strong |
| Profile visits | Did they want more? | >5% of views = strong |
| Follows | Did they commit? | Any follows = success |
| Shares/Saves | Did they value it? | Best engagement signal |

> "In week 1, do not care about followers. Care about watch time percentage. The algorithm uses watch time to decide whether to push your content further. A video with 100 views and 70% watch time will outperform a video with 500 views and 20% watch time in the long run."

---

## Phase 4 — Analytics Tracker (15 min)

**Prompt Claude Code:**

```
Build scripts/analytics-tracker.js — weekly performance recording.

This script doesn't pull data automatically (platform APIs require 
business verification). Instead, it creates a structured input system:

Usage: node scripts/analytics-tracker.js --log

Prompts user to enter (one at a time):
1. Date range (e.g., "Dec 8-14")
2. TikTok: total views this week
3. TikTok: total followers (running total)
4. TikTok: top performing video title + views
5. TikTok: average watch time % (if available)
6. Instagram: total reach this week
7. Instagram: total followers (running total)
8. Instagram: top performing post + reach
9. Best performing hook (which one worked?)
10. Content type that performed best this week

Saves to data/analytics/week_{N}.json

Also run: node scripts/analytics-tracker.js --report
Prints a weekly performance summary comparing to previous week:
- Views growth %
- Follower growth (absolute + %)
- Best content type
- Recommendation: "Make more [content type] based on this week's data"

This manual entry approach builds the habit of reviewing numbers
weekly even before automation is possible.
```

---

## Phase 5 — Week 1 Debrief (10 min)

**What was built this week:**

```
Week 1 — Complete:
□ Niche + voice + brand bible (Day 1)
□ AI content pipeline — 4 scripts (Day 2)
□ Brand visuals + 3 videos produced (Day 3)
□ Research pipeline — daily brief (Day 4)
□ Full week posted + analytics setup (Day 5)

Content live: [N] videos
Platforms: TikTok + Instagram
Pipeline cost this week: ~$1-2 in API
Everything else: $0
```

**Ask honestly:**

> "How do you feel about the content you made this week? Not the numbers — the content itself. Are you proud of it? Does it sound like you? Does it serve the woman you described on Day 1?"

Let her answer honestly. Adjust what needs adjusting.

**The mindset shift for Week 2:**

> "Week 1 was proving you can make content consistently. Week 2 is proving you can make money from it. We're going to put your first digital product together and open a storefront. By the end of next week, someone could give you money for what you've built."

---

## Phase 6 — Day 5 Close (5 min)

**Week 2 preview:**

| Day | Focus |
|-----|-------|
| Day 6 | Digital product #1 — design + create |
| Day 7 | Storefront on Stan Store — live and open |
| Day 8 | Affiliate program setup — first links live |
| Day 9 | Email list setup — first lead magnet |
| Day 10 | Content that converts — driving sales through content |

**Update CLAUDE.md:**

```markdown
### Day 5 — [date]
Posted: [N] videos live
Platforms active: TikTok @[handle] + Instagram @[handle]
First week analytics: [noted]
Week 1 complete.
Next: Week 2 — monetization begins
```

> "You're live. Real account. Real content. Real people can find you right now. That happened in 5 days. Week 2 we make it pay."

---

## Failure Modes

**First videos get very low views (under 100)**
Expected and normal. TikTok tests new accounts on small audiences first. Consistency for 2-3 weeks is what unlocks wider distribution. > "100 views to the right person beats 10,000 views to the wrong one. Keep going."

**Student is discouraged by slow start**
> "Every account you admire had a first week that looked like this. The ones who got through it are the ones who have audiences now. The ones who quit week one are everywhere — you just don't know their name because they quit."

**Platform account got flagged or restricted**
Usually happens if bio language triggers health misinformation filters. Remove any language that sounds like medical claims ("cures," "treats," "reverses"). Reframe as "information" and "community" not "medical advice."

**She wants to post more than the cadence**
Let her. More content = more data. Just make sure quality floor is maintained (clear audio, readable text, correct captions).