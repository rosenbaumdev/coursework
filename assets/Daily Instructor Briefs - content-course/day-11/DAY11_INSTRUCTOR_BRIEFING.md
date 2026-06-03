# Day 11 — Instructor Briefing
## Content Business — Content Repurposing Engine

---

## Session Goal

Student builds an automated repurposing system that turns one piece of content into 5-7 platform-specific assets. By end of session she multiplies her content output without multiplying her effort.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Repurposing Philosophy | One idea, many formats |
| 2 | Repurposing Map | Every format defined |
| 3 | Repurpose Engine | repurpose.js — automates the transformation |
| 4 | Blog/SEO Post Generator | Long-form content for Google |
| 5 | Pinterest Strategy | Static image content pipeline |
| 6 | Day 11 Close | CLAUDE.md updated |

---

## Phase 1 — The Repurposing Philosophy (10 min)

**Open with:**

> "You make a 60-second video. That video contains an idea. That idea can become: a TikTok, a Reel, a Pinterest pin, a Twitter thread, a newsletter section, a blog post, and a podcast script. You didn't create seven pieces of content — you had one idea and formatted it seven ways. That's repurposing. The most efficient content creators in the world do this systematically."

**The repurposing stack for her business:**

```
SOURCE: Short-form video script (60 seconds)
           ↓
├── TikTok video (original)
├── Instagram Reel (same video, adjusted caption)
├── Instagram carousel (script → 5-7 slides)
├── Pinterest pin (hook → image with text overlay)
├── Email newsletter section (script → 200-word email)
├── Blog post (script → 600-800 word SEO article)
└── Quote graphic (best line → branded image)
```

> "One morning's script becomes a full week of multi-platform presence. That's the machine."

---

## Phase 2 — Repurposing Map (10 min)

**Define each format:**

| Format | Platform | Effort | Tool |
|--------|---------|--------|------|
| TikTok video | TikTok | Already done | CapCut |
| Instagram Reel | Instagram | 5 min (re-upload) | Direct upload |
| Carousel | Instagram | 15 min | Canva |
| Pinterest pin | Pinterest | 5 min | Canva |
| Email section | Kit | 5 min | Copy/paste + edit |
| Blog post | Website/Medium | 15 min | AI-generated |
| Quote graphic | Instagram/Pinterest | 5 min | Canva |

**Set up Pinterest:**

> "Pinterest is underused in this niche and it has insane longevity — a pin can drive traffic 2 years after you post it. TikTok content is ephemeral. Pinterest content compounds. For health and wellness content targeting women, it's often the highest long-term traffic driver."

Create Pinterest account with brand name. Set up 3 boards:
- "Hormone Health" 
- "Mom to Self — Identity & Growth"
- "Perimenopause Real Talk"

---

## Phase 3 — Repurpose Engine (20 min)

**Prompt Claude Code:**

```
Build scripts/repurpose.js — transforms a short-form script into 
multiple content formats.

Takes a script file as input:
node scripts/repurpose.js content/scripts/script_[timestamp].md

Reads the script. Then calls Claude Sonnet with separate prompts for each format:

FORMAT 1: INSTAGRAM CAROUSEL
"Convert this video script into a 6-7 slide Instagram carousel.
Slide 1: Hook (same as video hook — the scroll-stopper)
Slides 2-5: One key point per slide. Short. One idea. Max 30 words.
Slide 6: Summary or key takeaway
Slide 7: CTA ('Follow for more' / 'Save this' / 'Link in bio for [product]')
Output each slide as: SLIDE [N]: [text]"

FORMAT 2: PINTEREST PIN TEXT
"Create Pinterest pin content for this script.
Title: [compelling, SEO-friendly, max 100 chars]
Description: [150-300 words, conversational, keyword-rich, includes 
terms women search like 'perimenopause symptoms', 'hormone balance', 
'midlife identity', etc.]
Board: [which of the 3 boards this belongs on]"

FORMAT 3: EMAIL NEWSLETTER SECTION
"Convert this script into a 200-250 word email newsletter section.
Subject line: [3 options]
Body: conversational, warm, like writing to one woman
End with: one link or CTA (product, lead magnet, or 'reply and tell me')
Format with clear line breaks — this will be read on mobile."

FORMAT 4: BLOG POST
"Expand this script into a 600-800 word blog post.
Include: H1 title, H2 subheadings, short paragraphs
SEO keywords to include naturally: [niche keywords]
End with: call to action + link to lead magnet
Write for Google — what would a woman search to find this?"

FORMAT 5: QUOTE GRAPHIC TEXT
"Extract the single most shareable line from this script.
It should be: true, specific, surprising OR deeply validating.
Max 20 words.
Format as: '[Quote]' — [Brand name]"

Save all outputs to content/repurposed/[script-timestamp]/
Each format as its own file: carousel.md, pinterest.md, email.md, blog.md, quote.md

Console output: "Repurposed into 5 formats — saved to content/repurposed/[timestamp]/"
```

**Test it on her best script from Week 1 or 2.**

**Estimated cost per repurpose run:** ~$0.05-0.10

---

## Phase 4 — Blog Post Setup (10 min)

**Why a blog matters:**

> "TikTok content disappears. Blog posts rank on Google and drive traffic forever. Someone searching 'perimenopause brain fog' in 2027 could find an article you wrote today. That's a long-term audience-building asset that social media can't replicate."

**Platform options:**

| Option | Cost | Best for |
|--------|------|---------|
| Medium | Free | Easy start, built-in audience |
| Substack | Free | Newsletter + blog combined |
| WordPress.com | Free | Full control, harder setup |
| Ghost | $9/mo | Best for creator businesses |

**Recommendation: Start on Medium or Substack (free).**

Set up a Medium account:
1. medium.com → Sign in with Google
2. Write first article: paste the blog.md output from repurpose.js
3. Add tags: perimenopause, women's health, midlife, hormones
4. Publish

> "Each blog post links back to her Stan Store and lead magnet. It's a permanent traffic funnel."

---

## Phase 5 — Pinterest Pipeline (10 min)

**Create Pinterest pin templates in Canva:**

1. Template size: 1000 x 1500px (Pinterest optimal)
2. Brand colors + fonts
3. Large readable text overlay (the hook or quote)
4. Brand name/handle in corner
5. Simple, high-contrast design (Pinterest is visual search)

**Post the first 3 pins:**
Use the pinterest.md output from repurpose.js for each.

**Pinterest strategy:**
- Pin daily if possible (Pinterest rewards consistency)
- Repin to multiple boards if relevant
- Use the exact search terms women use in your niche

---

## Phase 6 — Day 11 Close (5 min)

**The content math now:**

```
Before repurposing: 5 videos/week = 5 pieces of content
After repurposing: 5 videos → 5 × 5 formats = 25 pieces of content
Plus blog posts, Pinterest pins, email sections = 35+ pieces/week
Effort increase: ~30 minutes/day extra
```

**Update CLAUDE.md:**

```markdown
### Day 11 — [date]
Built: repurpose.js, blog + Pinterest pipeline
Repurposing: active for [N] pieces of content
Blog: [platform] — [URL]
Pinterest: [URL]
```

> "Tomorrow we make your second product — higher price point, higher value."