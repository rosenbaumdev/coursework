# Day 15 — Instructor Briefing
## Sports Betting AI — Launch Day

---

## Session Goal

Jordan does a final product review, prepares a launch plan, and makes his first real attempt to acquire users. By end of session he has a monetized product that has been shared publicly.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Full Product Review | Every feature tested |
| 2 | What We Built | Three-week retrospective |
| 3 | Launch Strategy | Where and how to find first users |
| 4 | First Posts | Jordan writes and posts himself |
| 5 | Ongoing Roadmap | What comes after Day 15 |
| 6 | Final Close | Program complete |

---

## Phase 1 — Full Product Review (20 min)

**Test every single flow as a new user:**

```
□ Visit the URL cold — what do you see?
□ Can you understand what it does in 10 seconds?
□ Register a new account
□ Does the free tier show something useful?
□ Does the paywall prompt make sense?
□ Complete Stripe checkout (use test card)
□ Do picks unlock after payment?
□ Does the dashboard look right with real data?
□ Check the email digest (if any picks ran today)
□ Test the performance stats section
□ Test on mobile browser
```

Fix any bugs discovered. This is the only session where fixes take priority over new features.

**Honest product assessment:**

> "Rate this product from 1-10 across three dimensions: Does it work reliably? Does it look professional? Would you pay for it? Be honest."

---

## Phase 2 — What We Built (15 min)

**The full three-week retrospective:**

```
WEEK 1 — DATA PIPELINE:
□ Odds data collector (live lines, 40+ bookmakers)
□ News fetcher (NewsAPI + Brave Search)
□ Injury scraper (ESPN)
□ Data correlation layer
□ Local AI classifier (free, Ollama)
□ Local AI injury scorer (free, Ollama)
□ Game triage engine

WEEK 2 — INTELLIGENCE + AUTOMATION:
□ Picks analysis prompt (v2)
□ Cloud AI picks engine (Claude Sonnet)
□ Picks ledger + results tracking
□ Performance calculator (win rate, ROI, CLV)
□ Full pipeline orchestrator
□ Cron scheduler (runs automatically)
□ Response cache (70%+ cost reduction)
□ Backtest framework

WEEK 3 — PRODUCT:
□ Web dashboard
□ Express API server
□ User authentication (JWT)
□ Stripe subscription paywall
□ Email delivery system
□ Railway deployment (live on internet)

ESTIMATED TOTAL API SPEND: $15-30
LINES OF CODE WRITTEN BY JORDAN: ~0
WORKING LINES OF CODE: 2,000+
PRODUCT STATUS: Live, monetized, automated
```

> "Three weeks ago you hadn't opened a terminal. Today you have a live AI product with a paywall on the internet. That's real."

---

## Phase 3 — Launch Strategy (15 min)

**The honest truth about sports betting product marketing:**

> "You can't advertise a sports betting product on Google or Facebook — they don't allow it. You need organic channels. The good news: betting Twitter, Reddit, and Discord are huge and engaged. Let's talk about where your first users come from."

**Channel breakdown:**

| Channel | Approach | Timeline |
|---------|----------|----------|
| Twitter/X | Post daily picks publicly (free tier) + link to paid | Fast if content is good |
| Reddit | r/sportsbook, r/fantasyball — share track record, not spam | Medium term |
| Discord | Betting Discord servers — be genuine, add value first | Slow burn, high trust |
| Word of mouth | Friends who bet — give them free trials | Fastest for first 10 |

**The content strategy:**

> "Post your picks publicly in free tier format: 'Today I'm passing on the Chiefs game (here's why). I have one play today — subscribers see it at 8am.' The NO_BET transparency builds credibility. The teaser builds curiosity."

**The track record play:**

> "The strongest marketing asset you'll have in 3 months is a verified track record. Not screenshots — a link to your dashboard where people can see the full record. That's what converts skeptics."

---

## Phase 4 — First Posts (10 min)

**Have Jordan write and post himself. Don't do it for him.**

> "Open Twitter. Write your first post about this. Don't pitch it — introduce it. Tell people what you're building and why. One post. Post it now."

Guide him toward something like:
- What it does
- That it's free to follow (the record)
- That he's building it in public

After he posts:

> "That's post one. The product exists publicly now. Someone can find it."

**Set a 30-day goal:**

> "What's your user goal for one month from now? Not a revenue goal — a user goal. Pick a number."

Whatever he says: "That's your target. We can talk about how to hit it."

---

## Phase 5 — Ongoing Roadmap (10 min)

**What comes after Day 15:**

```
IMMEDIATE (next 2 weeks):
- Build track record (run the pipeline every day)
- Fix bugs as they appear
- Get first 5 users

MONTH 2:
- Multiple sports support
- Historical odds integration (upgrade The Odds API if warranted)
- Improved prompt tuning based on real-world accuracy
- Referral system (give a friend a free month)

MONTH 3:
- Advanced statistics dashboard
- Trend analysis (which team, which bet type performs best)
- Email preference settings
- Maybe: Discord bot for instant alerts

FUTURE (if it works):
- Upgrade to paid The Odds API ($79/mo)
- Professional odds data (PropSwap, Action Network feed)
- Machine learning models for line prediction
- The thing you'll think of that I haven't
```

> "The product you have today is v0.1. It works. It's live. It's monetized. Everything from here is improvement. The hardest part — building something real from nothing — is done."

---

## Phase 6 — Final Close (10 min)

**The full close:**

> "Jordan. Three weeks ago, on Day 0, I asked you what your relationship with code and the terminal was. Do you remember what you said?"

Let him answer. Then:

> "Look at what's on your screen right now. A live web application running on a server in the cloud, with a subscription paywall, automated AI analysis running every morning, emails going out to subscribers, real data from real APIs. You built that. Not by learning to code for years — by learning to build with AI in three weeks."

> "The skills you have now aren't just for this product. Every AI product anyone is going to build in the next decade uses the same loop: data pipeline → AI intelligence layer → delivery interface. You've built all three. You know how to route between local and cloud models to manage cost. You know how to prompt engineer, version prompts, A/B test them. You know how to track performance honestly. You know how to deploy."

> "What you don't know yet: whether this specific product works. That's what the next three months are for. But you have the tools."

> "Final update to CLAUDE.md. Then go build something."

---

**Update CLAUDE.md:**

```markdown
### Day 15 — [date] — PROGRAM COMPLETE
Product: LIVE at [URL]
Status: Automated, monetized, deployed
Track record: [N] picks, [record], [ROI]%
First user goal: [Jordan's goal] by [date]
Next focus: [Jordan's answer]

Three weeks. Let's go.
```

---

## Final Notes for Jonathan

- Jordan now has a complete working product on the internet
- API spend for the program should be $20-40 total
- If picks accuracy develops positively, the product has real monetization potential
- The skills are transferable — he can build any AI product using this same framework
- The track record is the product's most important asset — encourage him to run it daily even if no users yet
- Biggest risk going forward: inconsistency. Pipeline needs to run every day. 

The program is complete. Whether the product succeeds depends on Jordan's consistency and the accuracy of the picks methodology — both things he now controls.