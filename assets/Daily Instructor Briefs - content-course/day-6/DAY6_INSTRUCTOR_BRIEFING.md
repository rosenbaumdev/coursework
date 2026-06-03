# Day 6 — Instructor Briefing
## Content Business — Digital Product #1: Design + Create

---

## Session Goal

Student creates her first digital product — a PDF guide, tracker, or mini workbook priced at $17-27. By end of session the product exists as a finished file ready to sell.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Digital Product Strategy | What to make, why, how to price |
| 2 | Product Design Interview | Specific product locked |
| 3 | AI-Assisted Content Generation | Product content written |
| 4 | Canva Production | Finished PDF designed |
| 5 | Product Listing Copy | Sales description + title |
| 6 | Day 6 Close | CLAUDE.md updated |

---

## Phase 1 — Digital Product Strategy (10 min)

**The economics of digital products:**

> "A digital product costs you time to make once and sells forever with zero additional cost. If you sell 10 copies at $27, that's $270 for something you made in an afternoon. If your content brings in 100 buyers, that's $2,700. The leverage is real. This is why digital products are the right first monetization step."

**What sells in this niche:**

| Product Type | Price Range | Effort | Best For |
|-------------|-------------|--------|----------|
| Symptom tracker (PDF) | $7-17 | Low | Quick win, high volume |
| Guide ("The X Guide to Y") | $17-37 | Medium | Authority building |
| Workbook | $17-47 | Medium-High | Transformation promise |
| Mini email course | $27-67 | Medium | Relationship + value |
| Full course | $97-497 | High | Later |

**For Day 6 — keep it achievable:**

The first product should be:
- Completable in one session
- Something she genuinely knows
- Solves a specific problem for a specific person
- Priced at $17-27 (low enough to impulse buy, high enough to be taken seriously)

**Recommended first product for this niche:**

A PDF tracker or guide. Examples:
- "The Perimenopause Symptom Tracker: 30 Days to Understanding Your Patterns"
- "The 'Who Am I Now?' Workbook: 15 Prompts for Women Reclaiming Their Identity"
- "Hormone Balance Starter Guide: The 5 Things to Track Before Your Next Doctor Appointment"
- "Brain Fog Log: A 4-Week System for Identifying Your Hormonal Triggers"

---

## Phase 2 — Product Design Interview (10 min)

**Ask:**

1. "What is the one thing women in your audience struggle with that you could give them a concrete tool for? Not information — a tool. Something they fill in, track, or work through."

2. "If you solved that problem for someone in 20 pages or less, what would those pages contain?"

3. "What transformation does this product promise? Complete this sentence: 'After using this, you will _____.'"

4. "Who exactly is this for — be as specific as Day 1 when you described your target woman."

**Lock the product:**

```
PRODUCT BRIEF
Name: [working title]
Type: [tracker / guide / workbook]
Pages: [estimated 10-25]
Price: $[17-27]
Promise: After using this, you will [transformation]
For: [specific woman in specific moment]
Core sections: [list 4-6 main sections]
```

---

## Phase 3 — AI-Assisted Content Generation (20 min)

**Prompt Claude Code to build a product writer:**

```
Build scripts/product-writer.js

Takes a product brief as input and generates the full content
for a digital PDF product.

Usage: node scripts/product-writer.js --brief products/product1-brief.md

First, create products/product1-brief.md with the product brief
from the design interview.

The script calls Claude Sonnet with:

System prompt:
"You are a specialist in women's health and identity content,
creating a digital product for [student's target audience].
Write in [brand voice]. Every section should be warm, specific,
and immediately actionable. Avoid vague wellness platitudes.
Be direct. Be useful. Write like a knowledgeable friend, not a textbook."

User prompt:
"Create the full content for this digital product:
[paste product brief]

Generate:
1. Introduction (150 words) — who this is for, what they'll get
2. How to use this [tracker/guide/workbook] (100 words)
3. [Section 1 name]: [full content]
4. [Section 2 name]: [full content]
... all sections
5. Closing note (100 words) — encouragement + CTA to follow/join community

For tracker products: create the tracking template headers and instructions
For workbook products: write full prompts with reflection space indicators
For guides: write full educational content with clear headers"

Save to products/[product-slug]/content.md
```

**Run it. Review together.**

> "Read every section. Mark anything that doesn't sound like you or doesn't feel accurate. We edit before we design. Content first, design second."

Have her make edits to the generated content. This is her product — it needs her voice in it.

---

## Phase 4 — Canva Production (20 min)

**Create the PDF in Canva:**

1. New design → Custom size → 8.5 x 11 inches (US Letter for PDF)
2. Use her brand colors and fonts from Day 3

**Page structure:**

```
Page 1: Cover
  - Product name (large, bold)
  - Her brand name + handle
  - Brand color background

Page 2: Welcome / Introduction
  - From content.md introduction section

Pages 3-N: Core content
  - Each section = 2-4 pages
  - For trackers: include the actual tracking grids
  - For workbooks: include journaling prompts with write-in space
  - For guides: include content with callout boxes and visual breaks

Last page: About + Next Steps
  - Brief "about the creator" (can be brand-focused, not personal)
  - Follow on TikTok/Instagram
  - Mention the other product coming (teaser)
  - "Questions? DM me at @[handle]"
```

**Canva design tips for this niche:**

- Generous white space — this audience responds to calm, not cluttered
- Pull quotes in brand accent color
- Tracking grids: clean table with subtle borders
- Headers: bold, large, her primary brand color
- Body text: 11-12pt minimum for readability

**Export:**

File → Download → PDF Standard (for selling) and PDF Print (high quality backup)

---

## Phase 5 — Product Listing Copy (10 min)

**Prompt Claude Code:**

```
Build scripts/product-copy-writer.js

Generates sales copy for a digital product.

Takes product brief and generates:

1. PRODUCT TITLE (3 variations)
   Strong title formula: [Number/Descriptor] + [Outcome] + [For Audience]
   
2. TAGLINE (2 variations, under 15 words)

3. SHORT DESCRIPTION (100 words)
   For Stan Store / Gumroad listing

4. LONG DESCRIPTION (300 words)  
   Includes: who it's for, what's inside, what they'll get after,
   social proof placeholder [X women have used this], FAQ section

5. BULLET POINT FEATURES (6 bullets)
   Format: "You'll [get/learn/discover]: [specific thing]"

6. OBJECTION HANDLERS (3)
   "If you're thinking [objection], here's why this is different: [response]"

Save to products/[product-slug]/listing-copy.md
```

**Review and pick the best title. Have her pick.**

> "Your title is the most important marketing copy you'll write for this product. It needs to be specific enough to attract the right buyer and clear enough that she knows immediately if this is for her."

---

## Phase 6 — Day 6 Close (5 min)

**What she has:**
- A finished digital product PDF
- Product listing copy ready
- Tomorrow: it goes live

**Update CLAUDE.md:**

```markdown
### Day 6 — [date]
Product 1: [product name]
Price: $[X]
File: products/[slug]/[filename].pdf
Status: designed, ready to list
Next: Day 7 — Stan Store setup, product goes live
```

> "You made a product today. Something someone can buy. Tomorrow we open the store."