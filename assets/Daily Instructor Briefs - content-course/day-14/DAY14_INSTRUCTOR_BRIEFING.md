# Day 14 — Instructor Briefing
## Content Business — Growth Systems + Collaboration Strategy

---

## Session Goal

Student builds the growth systems that compound over time: hashtag strategy, SEO for social, collaboration outreach, and community engagement automation. By end of session she has sustainable organic growth infrastructure.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Organic Growth Stack | What actually drives followers |
| 2 | Hashtag Research System | Data-driven hashtag strategy |
| 3 | SEO for TikTok + Instagram | How search works on platforms |
| 4 | Collaboration Outreach | Finding and pitching collaborators |
| 5 | Engagement System | Consistent community building |
| 6 | Day 14 Close | Week 3 nearly complete |

---

## Phase 1 — The Organic Growth Stack (10 min)

**What drives followers in this niche:**

```
TIER 1 — Content Quality (most important)
  Hook strength → watch time → algorithm push → new followers
  One viral video can bring 500-5,000 followers overnight

TIER 2 — Discoverability
  Right hashtags + keywords in captions → appears in search
  Pinterest + blog → Google traffic → social follows

TIER 3 — Community
  Responding to comments → followers feel seen → they bring friends
  Collaboration → reach each other's audiences

TIER 4 — Consistency
  Posting schedule → algorithm trust → wider distribution over time
```

> "Tier 1 is the only thing that can't be systematized — it's genuine creativity and connection. Everything else we can build a system around."

---

## Phase 2 — Hashtag Research System (15 min)

**Prompt Claude Code:**

```
Build scripts/hashtag-researcher.js

Takes a content topic and generates an optimized hashtag strategy.

Uses Brave Search to research:
1. Most used hashtags in the niche (search: "best hashtags perimenopause TikTok 2024")
2. Trending hashtags (search: "trending women health TikTok hashtags")

Then sends to Claude Sonnet:
"Create an optimized hashtag strategy for this content topic: [topic]
Audience: women 30-50, hormonal health and identity transition niche

Generate:
TIKTOK HASHTAGS (8-12 total):
  - 2-3 large (500M+ views): broad reach
  - 3-4 medium (10M-500M): targeted reach
  - 3-4 small (1M-10M): niche, high conversion
  
INSTAGRAM HASHTAGS (20-25 total):
  - Same tier structure but more niche-specific
  - Include location tags if relevant

For each hashtag: [tag] — [size estimate] — [why it fits]
At the bottom: top 5 hashtags to rotate in every post regardless of topic"

Save to data/hashtags/[topic-slug].md
Print the strategy cleanly.
```

**Build the master hashtag list:**

```bash
touch data/hashtags/master-list.md
```

Run the researcher on her 4 content pillars. Compile the best performers into a master list she refers to when posting.

---

## Phase 3 — SEO for Social (10 min)

**TikTok and Instagram are search engines now:**

> "30% of Gen Z uses TikTok as their primary search engine. Women in your audience are searching: 'perimenopause symptoms,' 'why am I so tired in my 40s,' 'brain fog hormones,' 'identity crisis after kids.' Your content needs to appear in those searches."

**The social SEO rules:**

1. **Say the keyword in the first 3 seconds** (TikTok transcribes audio)
2. **Put the keyword in your caption** (searchable text)
3. **Put the keyword in your on-screen text** (read by algorithm)
4. **Name your video files with keywords** before uploading
5. **Use keywords in your bio**

**Update caption-engine.md:**

Add to the system prompt:
```
For every caption, naturally include 1-2 searchable keyword phrases 
that women in this audience would actually type into TikTok or Instagram search.
Examples: "perimenopause symptoms," "hormone imbalance women over 40," 
"midlife identity," "brain fog before period"
Don't force it — use naturally within the caption.
```

---

## Phase 4 — Collaboration Outreach (15 min)

**The collaboration opportunity:**

> "One well-chosen collaboration can bring more followers than a month of consistent posting. When you appear on someone else's content, you're borrowing their audience's trust. If they trust her, and she vouches for you, they're primed to trust you."

**Who to collaborate with:**

| Collaborator Type | Reach | Approach |
|------------------|-------|---------|
| Similar-size accounts | Same audience, no competition | Easiest — peer exchange |
| Complementary niches | Fitness for women 40+, therapists, naturopaths | Natural value alignment |
| Slightly larger accounts | Harder to get, more impact | Lead with value first |

**Prompt Claude Code:**

```
Build scripts/collab-outreach.js

Generates personalized collaboration outreach messages.

Takes: collaborator handle + their niche + your brand info

Generates outreach for TWO scenarios:

SCENARIO 1 — DM outreach (casual, TikTok/Instagram):
"Write a genuine, non-salesy DM to [handle] proposing a collaboration.
My brand: [brand info]. Their focus: [their niche].
The collaboration idea: [specific idea — e.g., 'I share your content 
about X with my audience and vice versa' or 'we do a duet/stitch']
Tone: friendly, peer-to-peer, not pitchy. Max 100 words.
Start with something specific about their content — not generic praise."

SCENARIO 2 — Email outreach (if email is public):
"Write a professional but warm collaboration proposal email.
Subject line: [3 options]
Body: who I am, why I reached out, specific collaboration idea, 
what's in it for them, clear ask.
Length: 150-200 words. No buzzwords."

Save to data/outreach/[handle]_outreach.md
```

**Have her identify 5 accounts to reach out to.** Send 3 DMs this session.

---

## Phase 5 — Engagement System (10 min)

**The comment strategy:**

> "Your comment section is your community. How you respond to comments is how people decide whether to become regulars or scroll past. Set a standard: respond to every comment in the first 24 hours. After that, prioritize."

**The engagement prompt:**

```bash
touch scripts/prompts/comment-responder.md
```

```markdown
# Comment Response Generator
Task: Generate authentic, on-brand responses to TikTok/Instagram comments

Rules:
- Sound like the creator, not like a bot
- Be specific to the comment — no generic "Thanks for watching!"
- Add value when possible (one sentence of insight)
- Ask a follow-up question when appropriate (increases reply engagement)
- Emoji: 1-2 max, only if natural
- Length: 1-3 sentences

Brand voice: [from CLAUDE.md]

Input: the comment text
Output: one response (not multiple options)
```

Build a quick script:
```bash
touch scripts/comment-helper.js
```

```
node scripts/comment-helper.js "I've been experiencing exactly this and my doctor just told me it's anxiety. So frustrating."
```

> "You don't have to use it for every comment. But when you're staring at a comment and don't know how to respond in a way that's both personal and on-brand, run it through. Edit it. Post it."

---

## Phase 6 — Day 14 Close (5 min)

**Growth systems now running:**

```
□ Hashtag strategy — researched, rotating
□ Social SEO — keywords in every piece
□ Collaboration outreach — 3 DMs sent
□ Engagement system — comment response process
□ Paid promotion — $20 test running
□ Pinterest + blog — compounding long-form presence
□ Repurposing engine — 1 video → 5+ pieces
```

**Update CLAUDE.md. Tomorrow: final day.**