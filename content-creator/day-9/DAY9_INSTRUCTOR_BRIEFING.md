# Day 9 — Instructor Briefing
## Content Business — Content That Converts

---

## Session Goal

Student learns the difference between content that grows (views, follows) and content that converts (sales, clicks, email signups). She builds a second week of content specifically designed to drive revenue actions.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Content Funnel | Growth content vs. conversion content |
| 2 | Conversion Content Formats | What works for selling without being salesy |
| 3 | Product Content Pipeline | AI prompts for conversion-focused scripts |
| 4 | Batch Week 2 Content | 5 videos produced |
| 5 | Link Tracking Setup | Know which content drives sales |
| 6 | Day 9 Close | CLAUDE.md updated |

---

## Phase 1 — The Content Funnel (10 min)

**Draw the funnel:**

```
AWARENESS CONTENT (most of your posts)
  → People who don't know you exist
  → Goal: views, follows
  → Format: hook-heavy, educational, emotional
  → Example: "Nobody told me perimenopause affects your eyesight"

NURTURE CONTENT (regular mix)
  → People who follow but haven't bought
  → Goal: trust, relationship, saves
  → Format: personal, specific, useful
  → Example: "The 5 things I track every day since starting this journey"

CONVERSION CONTENT (some of your posts)
  → People who trust you + have a problem to solve
  → Goal: clicks, purchases, signups
  → Format: results, transformation, direct offer
  → Example: "I made a tracker for this — link in bio"
```

**The ratio:**

> "In week one, you made almost all awareness content. That's right for week one. Now we add conversion content — but not too much. A good ratio: 60% awareness, 25% nurture, 15% conversion. If you sell in every video, people stop watching. If you never sell, you starve. 15% is sustainable and non-annoying."

---

## Phase 2 — Conversion Content Formats (10 min)

**What works without being pushy:**

1. **The Transformation Post**: "Here's what changed when I [thing your product addresses]"
   - Not: "Buy my product"
   - Yes: shows the result, mentions the tool naturally

2. **The Recommendation Post**: "I've been getting DMs asking what I use to track — here's my system" 
   - Natural recommendation format
   - High trust because it responds to a "question"

3. **The Tutorial Clip**: Show one page or one tip from the product
   - Demonstrates value before they buy
   - "This is one of 15 pages in the tracker — link in bio for the full thing"

4. **The Social Proof Post**: "Someone DM'd me after using the [product] and said [result]"
   - Even if it's a beta reader or someone she sent it to for free
   - Real response, real result

5. **The Free Resource Push**: "I made something free for you — grab it in my bio"
   - Grows email list
   - Builds goodwill
   - Eventually converts to paid

---

## Phase 3 — Conversion Content Pipeline (15 min)

**Add a conversion content prompt:**

```bash
touch scripts/prompts/conversion-script-writer.md
```

```markdown
# Conversion Script Writer
Model: Claude Sonnet
Task: Write conversion-focused short-form video scripts

These scripts are designed to drive a specific action:
- Product purchase
- Email list signup  
- Affiliate link click

Rules:
- NEVER sound like an ad. Sound like a recommendation from a trusted friend.
- Lead with value or story — never with "I have a product"
- The CTA should feel like the natural next step, not a sales pitch
- Use social proof when available (even "a few women beta tested this and said...")
- Be specific about the problem the product/link solves

Formats that work:
- "I made this because I couldn't find it anywhere else"
- "A woman DM'd me asking about X — here's my honest answer + what I use"
- "The system I use every morning to [benefit]" (show page from product)
- "If you want [specific outcome], I put everything in one place: link in bio"

Brand voice: [from CLAUDE.md]
Product details: [from product brief]
Lead magnet: [lead magnet name + what it is]

Input: conversion goal (purchase / email signup / affiliate click) + product/link
Output: full script with [HOOK][SETUP][CORE][CTA]
CTA should be specific: "Grab it in my bio" / "Free download linked" / "I'll link the one I use below"
```

**Update script-writer.js to accept a `--type conversion` flag** that uses this prompt instead of the default.

---

## Phase 4 — Batch Week 2 Content (20 min)

**Plan the week with conversion content woven in:**

```
Week 2 Content Plan:
Mon — Awareness: trending hormonal health topic (from daily brief)
Tue — Nurture: personal story related to a content pillar
Wed — Conversion: "I made the tracker I always wished existed"
Thu — Awareness: myth-bust (high viral potential)
Fri — Conversion: free resource push (lead magnet)
```

**Generate and produce all 5:**

Run the pipeline for each. Produce videos. Save files.

**For the conversion videos** — she doesn't have to mention the product constantly. On Wednesday: show one page of the tracker for 3 seconds, mention "full tracker in bio," move on. On Friday: show the free resource title page, "link in bio, it's free."

---

## Phase 5 — Link Tracking Setup (10 min)

**The problem:** when someone buys, you don't know which video drove it.

**Simple solution: UTM parameters**

```bash
touch scripts/link-tracker.js
```

**Prompt Claude Code:**

```
Build scripts/link-tracker.js

Generates trackable links for content.

Usage: node scripts/link-tracker.js --url "https://stan.store/[handle]" --source "tiktok" --content "tracker-post-dec14"

Outputs UTM-tagged URL:
https://stan.store/[handle]?utm_source=tiktok&utm_medium=social&utm_content=tracker-post-dec14

Also maintains a link registry in data/link-registry.json:
{
  "links": [
    {
      "created": "date",
      "original_url": "...",
      "tagged_url": "...",
      "platform": "tiktok",
      "content_description": "tracker post dec 14",
      "short_description": "for pasting in bio"
    }
  ]
}

Print registry with: node scripts/link-tracker.js --list
```

> "Stan Store's analytics will eventually show you traffic sources. Until then, this helps you manually track what you're putting in bio and when. When you see a sale spike, you look back at your link registry and see what you posted that day."

---

## Phase 6 — Day 9 Close (5 min)

**Week 2 is two-thirds done. Check in:**

> "Two questions: Has anyone bought the product yet? Has anyone signed up for the email list? Either answer is fine — but I want us looking at the numbers."

If yes to either: celebrate genuinely. That's real money or real trust.
If no: "Normal. You have maybe 100 followers. You need 500-1000 before sales become consistent. Keep making content. Tomorrow we talk about acceleration."

**Update CLAUDE.md. Tomorrow: week 2 wrap + affiliate deep dive.**