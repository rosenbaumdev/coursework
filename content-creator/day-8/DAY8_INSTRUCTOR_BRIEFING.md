# Day 8 — Instructor Briefing
## Content Business — Email List + Lead Magnet

---

## Session Goal

Student sets up an email list, creates a lead magnet (free resource) to grow it, and integrates it into her content and storefront. By end of session she has the infrastructure to build a list that she owns forever.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Why Email (vs. Social Followers) | The ownership argument |
| 2 | Email Platform Setup | ConvertKit/Mailchimp free account |
| 3 | Lead Magnet Creation | Free resource that earns the email |
| 4 | Landing Page | Simple opt-in page live |
| 5 | Welcome Email Sequence | 3-email welcome series written |
| 6 | Day 8 Close | CLAUDE.md updated |

---

## Phase 1 — Why Email (10 min)

**The ownership argument:**

> "Your TikTok followers don't belong to you. Your Instagram followers don't belong to you. If either platform disappears tomorrow, bans your account, or changes the algorithm, you lose them all. Your email list is yours. Nobody can take it. That's why every serious creator — even the ones with millions of followers — will tell you: build the list."

**The economics:**

> "The average email list converts at 1-3% to purchases. 1,000 email subscribers → 10-30 buyers per product launch. At $27/product that's $270-810 per launch. From 1,000 people. That's why email matters more than follower count."

**The goal:** 100 email subscribers before the end of the program. Achievable.

---

## Phase 2 — Email Platform Setup (10 min)

**Kit (formerly ConvertKit) — recommended:**
- Free up to 10,000 subscribers
- Built for creators
- Good automation even on free tier
- kit.com → sign up free

**Mailchimp — alternative:**
- Free up to 500 subscribers
- More complex but more flexible
- mailchimp.com

**Setup (Kit):**

1. Create account → verify email
2. Set sender name: brand name
3. Set reply-to: her email
4. Connect domain if she has one (not required on day 8)
5. Create first list: "Main List"
6. Get the signup form embed code (we'll use this later)

---

## Phase 3 — Lead Magnet Creation (20 min)

**The lead magnet is a free resource so valuable she'd almost charge for it:**

> "The email signup conversion rate depends entirely on what you're offering in exchange. 'Sign up for my newsletter' gets 0.5% conversion. 'Get my free Hormone Symptom Cheat Sheet' gets 5-15% conversion. The lead magnet is the offer."

**Good lead magnets for this niche:**

- "The Perimenopause Symptom Cheat Sheet" — one-page PDF
- "5 Questions to Ask Your Doctor About Hormones (That They Actually Have to Answer)"
- "The 7-Day Hormone Reset Checklist"
- "Quiz: What's Your Hormone Type? + What to Do About It"
- "The First 5 Books I Read When I Realized My Body Was Changing"

**Best choice for Day 8: the cheat sheet or checklist** — fastest to produce, high perceived value.

**Prompt Claude Code:**

```
Build scripts/lead-magnet-writer.js

Takes a lead magnet concept and generates the content.

The lead magnet must:
- Fit on 1-2 pages (high value, low effort to consume)
- Solve a very specific problem immediately
- Leave them wanting the paid product for going deeper

For a cheat sheet or checklist format:
- Title (clear and specific)
- 10-15 items / symptoms / questions / steps
- Each with 1-2 sentence description
- One callout box: "Want to track these daily? [Product name] →"
- Footer: brand handle + "DM me if you have questions"

For a guide format:
- Title + subtitle
- 3-5 sections with actionable content
- Each under 150 words
- Clear, scannable headers

Generate content for: [student's chosen lead magnet concept]
Brand voice: [from CLAUDE.md]
Save to products/lead-magnet/content.md
```

**Design in Canva:**
Same template approach as the paid product — same brand colors, fonts, style — but shorter and simpler. Export as PDF.

---

## Phase 4 — Landing Page (10 min)

**In Kit:**

1. Landing Pages → Create new
2. Choose a simple template (minimal is better)
3. Headline: the lead magnet title
4. Sub-headline: "Get instant access — free"
5. One paragraph: what they'll get and why it helps
6. Email field + button: "Send it to me"
7. After signup: deliver the PDF automatically

**Set up the automation:**

Kit → Automations → New:
- Trigger: Subscriber joins Main List
- Action: Send email with lead magnet PDF attached
- Email subject: "Here's your [lead magnet name] 🌿"
- Body: short warm note + download link

**Add landing page link to Stan Store:**
Add a "Free Resource" button linking to the Kit landing page.

**Add to TikTok/Instagram bios:**
"Free [lead magnet name] → link in bio"

---

## Phase 5 — Welcome Email Sequence (15 min)

**Three emails, automated:**

**Prompt Claude Code:**

```
Build scripts/email-sequence-writer.js

Write a 3-email welcome sequence for new subscribers.

Email 1 (sent immediately — automated with lead magnet):
Subject: "Here's your [lead magnet] + a note from me"
Length: Short (150 words)
Content: 
  - Warm welcome
  - Lead magnet delivery note ("Your download is attached")
  - One sentence about what's coming
  - Soft intro to who you are / what this is about
  - No selling

Email 2 (sent 3 days later):
Subject: Choose from 3 options targeting high open rate
Length: Medium (250 words)
Content:
  - One piece of valuable free content (a tip, insight, or mini-lesson)
  - Related to their reason for signing up
  - Personal tone — like she's writing to one woman
  - Soft mention of the paid product in a PS

Email 3 (sent 7 days later):
Subject: Direct but warm
Length: Medium (250 words)  
Content:
  - A story or specific example of transformation
  - Introduce the paid product naturally
  - Clear CTA with link
  - "No pressure" close — this relationship is long-term

Brand voice: [from CLAUDE.md]
Audience: [from CLAUDE.md]
Product: [product name + Stan Store link]

Save to products/email-sequences/welcome-sequence.md
```

**Load into Kit:**

Set up 3-email sequence with delays. Review each email. Edit for voice.

---

## Phase 6 — Day 8 Close (5 min)

**The asset stack is growing:**

```
Platform: TikTok + Instagram (5x/week content)
Store: Stan Store (digital product live)
Email: Kit list + lead magnet + 3-email welcome
Affiliates: 3-5 programs active
Research: Daily AI-powered brief running
```

> "Someone who finds your content today can: follow you, buy your product, get your free resource, join your email list, and buy an affiliate product you recommend — all without you being awake. That's a business."

**Update CLAUDE.md. Tomorrow: content that converts.**