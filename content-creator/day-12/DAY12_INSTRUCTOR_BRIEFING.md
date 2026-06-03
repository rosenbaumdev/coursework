# Day 12 — Instructor Briefing
## Content Business — Digital Product #2: Higher Price, Deeper Value

---

## Session Goal

Student creates her second digital product at a higher price point ($37-67), building on the authority she's established. By end of session it's live on Stan Store alongside product #1.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Product #2 Strategy | Why a higher-tier product now |
| 2 | Product Design | What it is, priced correctly |
| 3 | AI-Assisted Creation | Content generated and edited |
| 4 | Production | Canva design + PDF export |
| 5 | Listing + Pricing Strategy | Live on Stan Store |
| 6 | Day 12 Close | CLAUDE.md updated |

---

## Phase 1 — Product #2 Strategy (10 min)

**The two-product structure:**

```
Product #1 ($17-27): Entry point. Low risk for buyer.
  → "Try me" product. Gets them in the door.
  → Wide appeal, solves one specific problem

Product #2 ($37-67): Deeper solution. Committed buyer.
  → More comprehensive. More transformation.
  → Natural upgrade from Product #1
  → Or: solves a different but related problem
```

**Options for Product #2:**

| Format | Price | Why |
|--------|-------|-----|
| Workbook (15-25 pages) | $37-47 | More depth than tracker |
| Mini email course (5 days) | $47-67 | Relationship + sequenced learning |
| Template bundle (3-5 templates) | $27-47 | High perceived value, easy to make |
| Private community access | $17-29/mo | Recurring revenue |
| Comprehensive guide | $37-57 | Authority piece |

**Best choice for Day 12:** a workbook or template bundle — completable in one session, natural complement to product #1.

**Have her decide. Then write the product brief in 10 minutes.**

---

## Phase 2 — Product Design (10 min)

**The upgrade logic:**

> "Product #2 should feel like a natural next step after Product #1. If #1 is a symptom tracker, #2 might be 'now that you know your patterns, here's what to do with them.' If #1 is a cheat sheet, #2 might be the full guide. The buyer of #1 is your warmest lead for #2."

**Write the product brief — same format as Day 6.**

**Price point psychology:**

> "At $47, you're in the 'considered purchase' zone — she thinks about it briefly but doesn't agonize. At $67, she wants more evidence before buying. At $97, she needs to really trust you. Since you're two weeks into building trust, $37-47 is the right zone for product #2."

---

## Phase 3 — AI-Assisted Creation (15 min)

**Run product-writer.js with the new brief:**

```bash
node scripts/product-writer.js --brief products/product2-brief.md
```

**For a workbook, the prompts need more care:**

The workbook format requires:
- Clear transformational arc (where does she start, where does she end?)
- Prompts that create genuine insight, not busywork
- Space to write (Canva: dotted lines, text boxes)
- Reflection moments between sections

Have her edit the AI output more heavily for this product — it's more personal.

---

## Phase 4 — Production (15 min)

**Canva — workbook production:**

Workbook-specific design elements:
- Section divider pages (full brand color page with section title)
- Journaling pages: dotted lines or subtle grid
- "Aha moment" callout boxes
- Progress markers
- Consistent margin for visual breathing room

**Quality bar for Product #2:**
Slightly higher than #1 — it costs more, it should feel like it.

Export as PDF. Test on her phone — does it read well on mobile? (Many buyers use their phones.)

---

## Phase 5 — Listing + Pricing Strategy (10 min)

**Add to Stan Store:**

Run product-copy-writer.js for product #2.

**Bundling option:**

> "Now that you have two products, you can offer a bundle: Product 1 + Product 2 for $37 (saving them $7-17 vs buying separately). Bundles increase average order value and feel like a deal. Add a bundle listing on Stan Store."

**Cross-sell in the Product 1 confirmation email:**

Update Kit automation: after Product 1 purchase confirmation, add one line:
"PS — if you want to go deeper: [Product 2 link]"

---

## Phase 6 — Day 12 Close (5 min)

**Product stack:**

```
Product 1: [name] — $[price]
Product 2: [name] — $[price]
Bundle: [name] — $[price]
Lead magnet: [name] — free
```

**Update CLAUDE.md. Tomorrow: paid promotion.**