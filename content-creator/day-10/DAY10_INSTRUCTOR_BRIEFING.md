# Day 10 — Instructor Briefing
## Content Business — Affiliate Deep Dive + Week 2 Review

---

## Session Goal

Student maximizes the affiliate opportunity with proper content integration, a recommendation strategy, and her first affiliate-focused content pieces. Week 2 reviewed and Week 3 scoped.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Affiliate Strategy Deep Dive | How to recommend without being a shill |
| 2 | Product Research Script | AI-assisted affiliate product vetting |
| 3 | Affiliate Content Templates | Scripts that recommend authentically |
| 4 | Amazon Storefront Setup | Curated product list live |
| 5 | Week 2 Review | Numbers, wins, adjustments |
| 6 | Week 3 Preview | Growth and product #2 |

---

## Phase 1 — Affiliate Strategy Deep Dive (15 min)

**The trust equation:**

> "The single biggest mistake creators make with affiliate content is recommending things they haven't used and don't believe in — because the commission is good. Your audience is smart. They feel when a recommendation is genuine and when it's paid. In this niche especially, women are already skeptical of wellness brands. Your credibility is your business. Don't trade it for a commission."

**The three-category framework:**

```
RECOMMEND (earn commission + maintain trust):
→ Products you've used or researched deeply
→ Products backed by actual science
→ Products at a fair price point for your audience

MENTION (no money changes hands):
→ Books, podcasts, free resources
→ Builds credibility by showing you're not just promoting
→ Earns trust that makes paid recommendations land harder

NEVER TOUCH (commission not worth the trust cost):
→ Products with MLM structures
→ Supplements with no research backing
→ Programs that make extraordinary claims
→ Anything you wouldn't give to your sister
```

**Affiliate disclosure:**

> "This is not optional. FTC requires disclosure on any content where you earn a commission. Every video or post with an affiliate link needs: '#ad' or '#affiliate' or 'affiliate link in bio.' Put it in every caption. It's not just legal protection — audiences respect honesty."

---

## Phase 2 — Product Research Script (15 min)

**Build a tool for vetting affiliate products:**

```
Build scripts/affiliate-researcher.js

Takes a product name or category and researches it before recommending.

Usage: node scripts/affiliate-researcher.js "magnesium glycinate supplement for women"

Uses Brave Search to find:
1. Scientific research on the product/ingredient (search: "[product] clinical study women")
2. Consumer reviews (search: "[product] reviews Reddit")
3. Any controversy or concerns (search: "[product] side effects concerns")
4. Competitor comparison (search: "best [product category] women 2024")

Sends all findings to Claude Sonnet:
"Evaluate this product for a women's health content creator 
who wants to recommend only evidence-backed products.
Based on the research:
1. Is there legitimate scientific support for this product?
2. What do real consumers say?
3. Any red flags or concerns?
4. Recommended or not? Why?
5. If recommended: what talking points are accurate and compelling?
Format as a simple brief."

Save to data/affiliate-research/[product-slug].md
```

**Run it on 2-3 products she's considering recommending.**

> "If the research script comes back with red flags, don't recommend it. There are enough good products in this space that you never have to push a bad one."

---

## Phase 3 — Affiliate Content Templates (10 min)

**Add to the content pipeline:**

```bash
touch scripts/prompts/affiliate-content.md
```

```markdown
# Affiliate Content Script Writer
Format: Short-form video (45-75 seconds)
Goal: Authentic product recommendation that drives affiliate clicks

Structure:
1. HOOK — lead with the problem or the result, not the product
2. STORY — brief context: why you looked for this, what you tried
3. FIND — natural introduction of the product ("I started using X")
4. RESULT — specific, honest outcome (don't overclaim)
5. CAVEAT — one honest thing it doesn't do / isn't for (builds trust)
6. CTA — "I'll link it below" or "link in bio, it's the [brand name]"

Rules:
- Never say "this changed my life" unless it genuinely did
- Specific results beat superlatives: "I slept 6 hours straight" vs "amazing sleep"
- One product per video — never stack recommendations
- Disclosure in caption: "#affiliate — I earn a small commission if you buy"

Input: product name + product research brief + any personal experience
Output: full script
```

**Produce 2 affiliate recommendation videos this session.**

---

## Phase 4 — Amazon Storefront (10 min)

**Amazon Associates storefront:**

1. Login to Amazon Associates → My Account → Storefront
2. Create Lists:
   - "Hormone Health Essentials" — supplements, books, testing kits
   - "Identity & Wellness Books" — books for the mom-to-self transition
   - "Daily Wellness Routine" — practical tools and products

3. Add 5-10 products to each list with notes

4. Get storefront URL → add to Stan Store page

**Create a "My Recommendations" content piece:**

> "A simple 'these are the 5 things on my nightstand' video with your Amazon storefront in bio is one of the highest converting formats. It's low-pressure, high-trust, and people love knowing what real people actually use."

Run through the script pipeline with the hook: "The 5 things actually on my nightstand right now" or "What's in my hormone health routine — being honest."

---

## Phase 5 — Week 2 Review (10 min)

**Pull up analytics. Enter into tracker:**

```bash
node scripts/analytics-tracker.js --log
```

Review:
- Total views across both platforms
- Follower growth
- Top performing content
- Product sales (if any)
- Email signups (if any)
- Affiliate clicks (if any)

**Honest assessment:**

> "Two weeks in. What's the data telling you about your audience? Which pillar is resonating? Which content type gets saved or shared? That's where you double down in Week 3."

---

## Phase 6 — Day 10 Close + Week 3 Preview (5 min)

**Week 2 complete:**

```
Week 2 — Complete:
□ Digital product #1 live on Stan Store
□ 3-5 affiliate programs active
□ Email list + lead magnet live
□ Welcome email sequence running
□ Conversion content added to rotation
□ Affiliate research and recommendation system
□ Amazon storefront live
```

**Week 3 preview:**

| Day | Focus |
|-----|-------|
| Day 11 | Content repurposing engine — 1 video → 5 pieces of content |
| Day 12 | Digital product #2 — higher price point |
| Day 13 | Paid promotion basics — $20 test |
| Day 14 | Growth systems — collaborations, hashtag strategy, SEO |
| Day 15 | Launch day — full business review + next 90 days |

> "Week 3 is where the work you've done starts compounding. The content machine runs. The store is open. Now we scale."

---

## Failure Modes (Days 6-10)

**Product isn't selling**
Expected at this follower count. Don't change the product — change the traffic. More content = more eyeballs = more buyers. "It's not a product problem yet. It's a traffic problem."

**Affiliate programs rejected**
Some programs require established traffic. Amazon Associates is the easiest approval — start there. For others, reapply in 30 days with growth stats.

**Email list at 0**
Almost always because the lead magnet isn't promoted enough. Every video this week should mention the free resource once. "It's not shameless — it's generous. You made something free. Tell people."

**Student is comparing herself to big accounts**
> "Those accounts have 2-5 years of daily posting behind them. You have 10 days. The comparison is meaningless. The only comparison that matters is: are you better than you were last week?"