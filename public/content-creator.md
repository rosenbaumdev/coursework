---
day: 1
week: 1
title: Niche Clarity, Brand Identity, and Voice
description: Lock in your specific niche, define your brand voice, and write a one-page brand bible.
---

**Theme:** Niche clarity, brand identity, and voice — the hardest decisions of the whole program.

**The pitch:**
> "No slides, no tutorials, no courses-within-a-course. We build. By the end of three weeks you'll have a live content business — real content on real platforms with real ways to make money from it. Today we figure out exactly who you are in this space and who you're talking to. Everything else depends on getting this right."

### Session Goal
The student walks out with a locked sub-niche, a defined brand voice, a one-page Brand Bible, a chosen primary platform, and a CLAUDE.md committing it all to writing. No code today — only decisions.

### What You'll Build
1. **Welcome + Orient** — Frame the three-week arc (Foundation → Systems → Growth) and the why behind the niche.
2. **Niche Excavation** — Drill from "women's hormonal health" into one specific lane via 5 targeted questions.
3. **Brand Voice Interview** — Define tone, anti-tone, reference creators, permission level, and faceless vs. faced.
4. **Competitor Research** — 15 minutes scrolling TikTok/Instagram in-niche, identifying 5 accounts and the gap.
5. **Brand Bible** — One-page brand document: mission, audience, lane, gap, voice, pillars, platform, monetization stack.
6. **Platform Decision** — Pick TikTok or Instagram primary, set 5x/week cadence.
7. **Day 1 Close** — Create the project folder, write CLAUDE.md.

### Tools / Setup
- TikTok + Instagram — for live competitor research
- A text editor — for the Brand Bible and CLAUDE.md
- A terminal — `mkdir ~/Desktop/content-business` and set up subfolders (`content/`, `scripts/`, `templates/`, `products/`, `analytics/`)

### Teaching Moments
- "Voice is the single most important thing in content. Not the information — the voice."
- "You've chosen a space I think is genuinely important and genuinely underserved... That's your opening."
- "The gap is the opportunity."

### Likely Confusion Points
- **"I want to help women generally."** — Keep drilling until she names a specific moment, not a demographic. Generic content serves nobody.
- **Uncomfortable discussing hormonal/biological topics explicitly** — Adjust the permission level. Warm and gentle works as well as clinical or raw.
- **No personal connection to the topic** — Not a dealbreaker. "I'm learning and sharing what I find" is a legitimate format.
- **Picks a generic brand name (MomLife, etc.)** — Gently push back, leave brand name TBD, revisit on Day 3.

### Stretch Goals
- Draft 2–3 candidate brand names and sit on them overnight.
- Save 10 in-niche reference posts to a "swipe file" folder for later inspiration.

---
day: 2
week: 1
title: AI Content Pipeline Setup
description: Build an AI pipeline that generates hooks, scripts, captions, and a content calendar on demand.
---

**Theme:** Build the AI content pipeline — hooks, scripts, captions, and a weekly calendar on demand.

**The pitch:**
> "The biggest problem content creators have isn't talent — it's consistency. Posting 5 times a week forever requires an endless supply of ideas, scripts, and captions. Most people burn out by week 6. We're going to build a machine that makes consistency easy."

### Session Goal
By end of session she can generate a full week of content concepts — hooks, scripts, captions, and a calendar — in under 10 minutes for pennies in API cost.

### What You'll Build
1. **The Content Machine Concept** — Draw the pipeline: brain → hooks → script → captions → calendar.
2. **Tool Setup** — Node, Claude Code, `@anthropic-ai/sdk`, `.env` with `ANTHROPIC_API_KEY`, `.gitignore`.
3. **Hook Generator** — `scripts/hook-generator.js` produces 5 hook options per topic using 7 proven formulas.
4. **Script Writer** — `scripts/script-writer.js` writes 45–75 second scripts in HOOK/SETUP/CORE/LANDING/CTA structure.
5. **Caption + Hashtag Engine** — `scripts/caption-engine.js` outputs TikTok caption, Instagram caption, and a tiered hashtag set.
6. **Content Calendar Generator** — `scripts/calendar-generator.js` produces a 7-day plan balanced across pillars and content types.
7. **Day 2 Close** — Update CLAUDE.md, check Anthropic Usage to see the day cost pennies.

### Tools / Setup
- Node.js + Claude Code (from Day 0)
- `npm install dotenv @anthropic-ai/sdk` — Anthropic SDK
- Anthropic API key — `console.anthropic.com`
- `scripts/prompts/*.md` — system prompts live as editable files

### Teaching Moments
- "You're the creative director. The AI is the first-draft writer who never gets tired, never gets writer's block, and never calls in sick."
- "Without AI: 45–60 minutes per piece. With this pipeline: 5–10 minutes per piece. That's what makes 5x/week sustainable."
- "Read this out loud. Right now. If you stumble reading it, viewers will stumble hearing it."

### Likely Confusion Points
- **Scripts feel generic despite voice in prompt** — The voice section is too vague. Add 3 specific example phrases she actually uses. Specific examples beat descriptors.
- **She wants to rewrite the whole script herself** — Perfect. That's the goal. The AI gave you a first draft in 30 seconds; you're making it yours.
- **Calendar topics feel repetitive** — Add specificity to pillar descriptions. Not "hormonal health" but "rage, forgetfulness, insomnia, itchy skin."
- **Overwhelmed by number of scripts** — She doesn't have to use everything. The machine generates options; she picks what resonates.

---
day: 3
week: 1
title: First Content Made + Faceless Video Setup
description: Set up the faceless video toolkit, build brand visuals, and produce three post-ready videos.
---

**Theme:** First content made — produce 3 real, post-ready faceless videos using free tools.

**The pitch:**
> "Today you produce your first 3 finished, post-ready pieces of content using AI-generated scripts and free faceless video tools. By end of session you have real content you could post today."

### Session Goal
The student leaves with brand visuals locked in Canva, a video production workflow she can repeat, and three videos ready to post on a staggered schedule.

### What You'll Build
1. **Faceless Video Toolkit** — Sign up for CapCut, Canva, Pexels, ElevenLabs; pick an ElevenLabs voice and save the ID.
2. **Brand Visuals in Canva** — Brand Kit with 2 primary colors, 1 accent, 2 fonts; vertical video template + thumbnail template.
3. **First Script → Video** — Voiceover (ElevenLabs or her own audio) + Pexels B-roll + CapCut text + auto-captions → exported MP4.
4. **Content Batch** — Two more videos produced in the same session while the creative momentum is hot.
5. **Quality Review** — Watch all three against the brand standards and apply the follower test.
6. **Day 3 Close** — Spread the posts over 3 days, set up TikTok + Instagram bios, update CLAUDE.md.

### Tools / Setup
- CapCut — video editing + auto-captions (free)
- Canva — Brand Kit, templates, thumbnails (free)
- Pexels — free B-roll stock footage
- ElevenLabs — AI voiceover (10k free chars/mo) — or phone voice memo for her own faceless voice
- TikTok native TTS — fallback if ElevenLabs runs out

### Teaching Moments
- "Your own voice, even faceless, builds a stronger audience than AI voice. You don't need to show your face. You need to show your personality."
- "85% of TikTok is watched without sound. Captions are not optional."
- "A 7/10 video posted consistently beats a 10/10 video posted sporadically. Always."

### Likely Confusion Points
- **CapCut is confusing** — Stay in the simplified workflow: import audio → import video → add text → add captions → export. Skip the rest on Day 3.
- **She hates how she sounds on audio** — Universal feeling. Record it, use it, move on. Her audience has no reference for how she "should" sound.
- **ElevenLabs free tier runs out** — Switch to TikTok TTS or her own voice. Upgrade to $5/mo only when content is getting traction.
- **Videos look low quality** — Usually B-roll color mismatch or undersized text. Pick consistent B-roll, font ≥48pt on mobile.
- **She wants to film herself** — Support it. Phone on tripod, chest-up framing. Faced is usually better when she's ready.

### Stretch Goals
- Create a one-page Notion or doc "production SOP" capturing her exact workflow so future batches are mechanical.

---
day: 4
week: 1
title: Research Pipeline + Trend Monitoring
description: Build automated trend, news, and competitor research that delivers a daily content brief each morning.
---

**Theme:** Research pipeline + trend monitoring — never stare at a blank page again.

**The pitch:**
> "Most content creators in your niche post based on gut feeling or what they personally experienced that week. That's fine. But the creators who grow fastest are the ones who know what their audience is searching for before they search for it — and what's trending before it peaks. We're going to build that intelligence."

### Session Goal
The student leaves with an automated daily research brief that surfaces trending topics, fresh hormonal-health research, and competitor signal — synthesized into one specific content recommendation per morning.

### What You'll Build
1. **Why Research Wins** — Frame the three morning questions: what's she searching for, what's about to trend, what just dropped from research?
2. **Trend Monitor** — `scripts/trend-monitor.js` runs 6 Brave News searches and asks Claude to surface 3 ranked content opportunities.
3. **Health News Aggregator** — `scripts/health-news.js` filters research by relevance (≥7/10) and flags myth-busting items with `VIRAL_POTENTIAL: true`.
4. **Competitor Watch** — `scripts/competitor-watch.js` uses Brave Search around competitor handles to learn what's resonating (not to copy).
5. **Daily Research Digest** — `scripts/research-digest.js` runs all three and synthesizes ONE specific content recommendation for today.
6. **Day 4 Close** — Schedule the digest with `node-cron` for 7:30am daily.

### Tools / Setup
- Brave Search API — `api.search.brave.com` (free tier: 2,000 queries/month)
- `npm install node-fetch dotenv node-cron`
- `BRAVE_API_KEY` added to `.env`

### Teaching Moments
- "When research overturns something people believe, that's a video. Automatically flagging it is how you catch those moments."
- "This is NOT about copying. When a competitor's video gets 500K views, that tells you the audience wants that topic. Your job is to make YOUR version."
- "Daily cost: ~$0.05–0.10 per run."

### Likely Confusion Points
- **Why not scrape TikTok/Instagram directly?** — Against ToS. Use Brave Search around handles + niche terms to surface what's getting talked about publicly.
- **The brief surfaces topics she doesn't like** — She overrides it with judgment. The brief informs the calendar, it doesn't dictate it.

---
day: 5
week: 1
title: First Week of Content Posted + Analytics Setup
description: Post a full week of content live on TikTok and Instagram and set up analytics tracking.
---

**Theme:** First week posted + analytics setup — go live and learn to read the numbers.

**The pitch:**
> "Today you post your first week of content, set up analytics tracking, and review early performance data. By end of session you have a live presence on both platforms and you understand what the numbers mean."

### Session Goal
She closes Week 1 with both accounts live, the introduction video posted, a 5-post weekly cadence underway, and a manual analytics-tracker habit established for Week 2 and beyond.

### What You'll Build
1. **Pre-Post Checklist** — Lock usernames, profile photos, bios (formula: what / who / how they feel after), Creator account on IG for analytics.
2. **Batch + Post** — Produce the missing videos to hit 5 for Week 1; post the introduction video today.
3. **Analytics Setup** — Activate TikTok Pro analytics + Instagram Insights; identify the 5 metrics that matter.
4. **Analytics Tracker** — `scripts/analytics-tracker.js` with `--log` (weekly manual entry) and `--report` (week-over-week comparison).
5. **Week 1 Debrief** — Honest review of content quality vs. the woman on the Day 1 brand bible.
6. **Day 5 Close** — Preview Week 2 (monetization), update CLAUDE.md.

### Tools / Setup
- TikTok Creator Tools → Analytics (Pro account, free)
- Instagram Professional Dashboard → Insights (Creator account)
- `scripts/analytics-tracker.js` for structured manual entry

### Teaching Moments
- "In week 1, do not care about followers. Care about watch time percentage."
- "A video with 100 views and 70% watch time will outperform a video with 500 views and 20% watch time in the long run."
- "Week 1 was proving you can make content consistently. Week 2 is proving you can make money from it."

### Likely Confusion Points
- **First videos get under 100 views** — Expected. TikTok tests new accounts on tiny audiences. Consistency for 2–3 weeks unlocks distribution.
- **She's discouraged by the slow start** — Every account she admires had a Week 1 that looked the same. The ones who quit Week 1 are everywhere; you just don't know their names.
- **Account flagged or restricted** — Bio language probably triggered health-misinformation filters. Remove "cures/treats/reverses"; reframe as "information" and "community."
- **She wants to post more than the cadence** — Let her. More content = more data, as long as the quality floor holds.

---
day: 6
week: 2
title: Digital Product #1 — Design and Create
description: Design and create your first digital product — a $17-27 PDF tracker, guide, or workbook ready to sell.
---

**Theme:** Digital product #1 — design and create a $17–27 PDF in one session.

**The pitch:**
> "A digital product costs you time to make once and sells forever with zero additional cost. If you sell 10 copies at $27, that's $270 for something you made in an afternoon. The leverage is real."

### Session Goal
The student leaves with a finished, sellable PDF — content written, designed in Canva, exported — plus complete listing copy ready to drop into Stan Store tomorrow.

### What You'll Build
1. **Digital Product Strategy** — Frame the economics, price band ($17–27), and what's completable in a single session.
2. **Product Design Interview** — 4 questions to lock the product brief: tool not info, transformation promise, specific buyer.
3. **AI-Assisted Content Generation** — `scripts/product-writer.js` generates intro, how-to-use, all sections, closing.
4. **Canva Production** — 8.5×11 PDF: cover, welcome, core content (trackers/prompts/guides), about + next steps.
5. **Product Listing Copy** — `scripts/product-copy-writer.js` outputs 3 titles, 2 taglines, short + long description, 6 feature bullets, 3 objection handlers.
6. **Day 6 Close** — File saved at `products/[slug]/[filename].pdf`, listing copy ready, update CLAUDE.md.

### Tools / Setup
- Canva (free) — 8.5×11 PDF design with her Day 3 brand kit
- `products/product1-brief.md` — input for the product writer
- Canva "book mockup" templates — for the Stan Store cover image

### Teaching Moments
- "The first product should be: completable in one session, something she genuinely knows, solves a specific problem for a specific person, priced low enough to impulse buy and high enough to be taken seriously."
- "Content first, design second. Read every section. Mark anything that doesn't sound like you."
- "Your title is the most important marketing copy you'll write for this product."

### Likely Confusion Points
- **What format wins?** — For Day 6, a PDF tracker or checklist. Fast to produce, high perceived value, low risk for buyer.
- **AI output feels generic** — Edit heavily. This is her product; it needs her voice in it.

---
day: 7
week: 2
title: Storefront Live + First Affiliate Links
description: Open a Stan Store with your first product live and join multiple affiliate programs to receive revenue.
---

**Theme:** Storefront live + first affiliate links — the business can now receive money.

**The pitch:**
> "Today you open a Stan Store, list your first digital product, and place your first affiliate links in content. By end of session you have a live, functional way to receive money."

### Session Goal
She walks out with Stan Store published, the Day 6 product live and test-purchased, 3–5 affiliate programs applied to, a populated link-in-bio, and one new product-launch video in the pipeline.

### What You'll Build
1. **Storefront Platform Choice** — Stan Store (14-day free trial) primary; Gumroad as free fallback.
2. **Product Listed** — Upload PDF, write title/price/description, design Canva mockup cover, publish — then test-purchase with a second email.
3. **Affiliate Program Setup** — Apply to Amazon Associates (instant), Thorne, Ritual, Midi, Zoe, Audible, Book of the Month.
4. **Link-in-Bio Setup** — Stan Store sections: header, featured product, recommended affiliates, social links, free resource placeholder.
5. **Content Updated with Links** — Edit IG captions to point to bio; produce one soft launch video for the product.
6. **Day 7 Close** — Honest framing: store is open, traffic is the next job. Update CLAUDE.md.

### Tools / Setup
- Stan Store — `stan.store` ($29/mo after 14-day trial)
- Stripe — payment processor (free account)
- Amazon Associates, Thorne, Ritual, Midi/Stride, Zoe, Audible, BOTM — affiliate signups
- `products/affiliate-links.md` — master link registry

### Teaching Moments
- "Stan Store is built specifically for creators. The $29/month looks like a cost but it's actually a revenue tool. You'll make it back with one sale."
- "Every piece of content you make from this point forward has this link available. The store is always open."
- "You will not make $10,000 this week. Or probably this month. Here's what IS happening: you have a real business structure."

### Likely Confusion Points
- **Stan Store fee vs. Gumroad** — Stan Store if she'll lean into the all-in-one creator tooling; Gumroad if budget is tight and she only needs a checkout.
- **Affiliate program rejections** — Amazon is instant; others may need traffic. Reapply in 30 days.
- **Test purchase doesn't feel right** — Fix any friction now before real buyers see it.

---
day: 8
week: 2
title: Email List + Lead Magnet
description: Set up an email list with a free lead magnet, landing page, and 3-email automated welcome sequence.
---

**Theme:** Email list + lead magnet — build the audience you own forever.

**The pitch:**
> "Your TikTok followers don't belong to you. Your Instagram followers don't belong to you. If either platform disappears tomorrow, bans your account, or changes the algorithm, you lose them all. Your email list is yours. Nobody can take it."

### Session Goal
The student leaves with Kit configured, a free lead magnet PDF produced, a landing page live, and a 3-email welcome sequence automated and ready to fire on every signup.

### What You'll Build
1. **Why Email** — Frame the ownership argument and the 1–3% conversion economics (1,000 subs → 10–30 buyers per launch).
2. **Email Platform Setup** — Create Kit account (free up to 10k), set sender name, reply-to, Main List, grab embed code.
3. **Lead Magnet Creation** — `scripts/lead-magnet-writer.js` produces a 1–2 page cheat sheet/checklist; design in Canva using the same brand template.
4. **Landing Page** — Build Kit landing page (headline, sub, paragraph, email field), set up signup automation that delivers the PDF.
5. **Welcome Email Sequence** — `scripts/email-sequence-writer.js` generates 3 emails (immediate, day 3, day 7) loaded into Kit with delays.
6. **Day 8 Close** — Link the landing page from Stan Store, TikTok bio, IG bio; update CLAUDE.md.

### Tools / Setup
- Kit (formerly ConvertKit) — `kit.com`, free up to 10,000 subscribers
- Canva — 1–2 page lead magnet PDF in brand template
- Kit Landing Pages + Automations — opt-in flow + sequence delays

### Teaching Moments
- "'Sign up for my newsletter' gets 0.5% conversion. 'Get my free Hormone Symptom Cheat Sheet' gets 5–15%. The lead magnet is the offer."
- "Someone who finds your content today can: follow you, buy your product, get your free resource, join your email list, and buy an affiliate product you recommend — all without you being awake. That's a business."

### Likely Confusion Points
- **Which lead magnet format?** — Cheat sheet or checklist for Day 8 — fastest to produce, high perceived value, leaves room to upsell the paid product.
- **Mailchimp vs. Kit** — Kit is creator-first and free up to 10k; Mailchimp is free up to 500 and more complex. Default to Kit.

### Stretch Goals
- Add a second opt-in form embedded mid-blog or mid-landing page for a quiz-style lead magnet later.

---
day: 9
week: 2
title: Content That Converts
description: Learn the content funnel and build conversion-focused scripts that drive sales without sounding salesy.
---

**Theme:** Content that converts — adding revenue-driving content without being salesy.

**The pitch:**
> "Today you learn the difference between content that grows (views, follows) and content that converts (sales, clicks, email signups). You build a second week of content specifically designed to drive revenue actions."

### Session Goal
The student leaves with a clear awareness/nurture/conversion ratio (60/25/15), a conversion-script prompt added to the pipeline, 5 Week-2 videos produced, and UTM link tracking in place.

### What You'll Build
1. **The Content Funnel** — Define awareness vs. nurture vs. conversion content with examples for the niche.
2. **Conversion Content Formats** — 5 non-pushy formats: transformation, recommendation, tutorial clip, social proof, free resource push.
3. **Conversion Content Pipeline** — `scripts/prompts/conversion-script-writer.md` + `--type conversion` flag on `script-writer.js`.
4. **Batch Week 2 Content** — Mon awareness, Tue nurture, Wed conversion (tracker), Thu myth-bust, Fri free resource push.
5. **Link Tracking Setup** — `scripts/link-tracker.js` generates UTM-tagged URLs and maintains `data/link-registry.json`.
6. **Day 9 Close** — Honest check-in on first sales / first signups; update CLAUDE.md.

### Tools / Setup
- `scripts/prompts/conversion-script-writer.md` — new prompt file
- `scripts/link-tracker.js` — UTM generator + registry
- Stan Store URL — base for all tagged links

### Teaching Moments
- "If you sell in every video, people stop watching. If you never sell, you starve. 15% is sustainable and non-annoying."
- "NEVER sound like an ad. Sound like a recommendation from a trusted friend."
- "The CTA should feel like the natural next step, not a sales pitch."

### Likely Confusion Points
- **How much product mention is too much?** — Show one page of the tracker for 3 seconds, mention "full tracker in bio," move on. Subtle beats hard.
- **No sales yet — what's broken?** — Probably nothing. At ~100 followers, that's normal. The fix is more traffic, not more selling.

---
day: 10
week: 2
title: Affiliate Deep Dive + Week 2 Review
description: Maximize affiliate revenue with vetting tools, authentic recommendation scripts, and an Amazon storefront.
---

**Theme:** Affiliate deep dive + Week 2 review — maximize the affiliate channel without burning trust.

**The pitch:**
> "The single biggest mistake creators make with affiliate content is recommending things they haven't used and don't believe in — because the commission is good. Your audience is smart. Your credibility is your business. Don't trade it for a commission."

### Session Goal
The student leaves with a vetting tool for affiliate products, 2 produced affiliate videos, a curated Amazon storefront, and an honest Week-2 numbers review.

### What You'll Build
1. **Affiliate Strategy Deep Dive** — The three-category framework: RECOMMEND / MENTION / NEVER TOUCH. FTC disclosure rules.
2. **Product Research Script** — `scripts/affiliate-researcher.js` uses Brave Search to surface studies, reviews, controversies, and competitor comparisons before recommending.
3. **Affiliate Content Templates** — `scripts/prompts/affiliate-content.md` with HOOK/STORY/FIND/RESULT/CAVEAT/CTA structure.
4. **Amazon Storefront Setup** — 3 curated lists (Hormone Health Essentials, Identity & Wellness Books, Daily Wellness Routine) with 5–10 products each.
5. **Week 2 Review** — Run `analytics-tracker.js --log`; review views, follows, sales, signups, affiliate clicks.
6. **Week 3 Preview** — Day 11 repurposing → Day 12 product #2 → Day 13 paid test → Day 14 growth → Day 15 launch review.

### Tools / Setup
- `scripts/affiliate-researcher.js` — Brave Search + Claude evaluation
- Amazon Associates Storefront — `affiliate-program.amazon.com`
- `#ad` / `#affiliate` / "affiliate link in bio" — required disclosures

### Teaching Moments
- "Don't recommend anything you wouldn't give to your sister."
- "A simple 'these are the 5 things on my nightstand' video with your Amazon storefront in bio is one of the highest converting formats."
- "If the research script comes back with red flags, don't recommend it. There are enough good products in this space that you never have to push a bad one."

### Likely Confusion Points
- **Product isn't selling** — At this follower count, expected. It's a traffic problem, not a product problem.
- **Affiliate programs rejected** — Some need established traffic. Amazon is instant; reapply to others in 30 days.
- **Email list at 0** — Lead magnet isn't promoted enough. Every video this week should mention the free resource once.
- **Comparing herself to big accounts** — Those accounts had 2–5 years of daily posting. She has 10 days. The only meaningful comparison is week-over-week against herself.

---
day: 11
week: 3
title: Content Repurposing Engine
description: Build a system that turns one video script into 5+ platform-specific assets including blog, Pinterest, and email.
---

**Theme:** Content repurposing engine — one idea, many formats, compounding reach.

**The pitch:**
> "You make a 60-second video. That video contains an idea. That idea can become: a TikTok, a Reel, a Pinterest pin, a Twitter thread, a newsletter section, a blog post, and a podcast script. You didn't create seven pieces of content — you had one idea and formatted it seven ways."

### Session Goal
The student leaves with an automated repurposing engine, a live blog presence, a Pinterest account with templates, and a content output multiplied 5–7x with about 30 extra minutes per day.

### What You'll Build
1. **The Repurposing Philosophy** — Map the source-to-format flow: video → carousel, pin, email, blog, quote graphic.
2. **Repurposing Map** — Define every format with effort and tool for each.
3. **Repurpose Engine** — `scripts/repurpose.js` transforms one script into carousel.md / pinterest.md / email.md / blog.md / quote.md (~$0.05–0.10 per run).
4. **Blog Post Setup** — Create Medium or Substack, publish first post from the engine's blog.md output, tag for SEO.
5. **Pinterest Pipeline** — Set up account + 3 boards, create 1000×1500 Canva pin template, post first 3 pins.
6. **Day 11 Close** — Math the new output (5 videos × 5 formats + blog + pins = 35+ pieces/week), update CLAUDE.md.

### Tools / Setup
- `scripts/repurpose.js` — Claude Sonnet, one prompt per format
- Medium or Substack — free, fastest to publish long-form
- Pinterest — visual search engine with 2-year content longevity
- Canva — 1000×1500 pin template with brand colors

### Teaching Moments
- "Pinterest is underused in this niche and it has insane longevity — a pin can drive traffic 2 years after you post it."
- "TikTok content disappears. Blog posts rank on Google and drive traffic forever."
- "Each blog post links back to her Stan Store and lead magnet. It's a permanent traffic funnel."

### Likely Confusion Points
- **Which blog platform?** — Medium or Substack to start (free, built-in audience). Migrate to Ghost/WordPress later if needed.
- **All 5 formats feel like a lot** — Pick 2–3 formats to actually post per script; let the engine generate everything else as on-demand inventory.

---
day: 12
week: 3
title: Digital Product #2 — Higher Price, Deeper Value
description: Create your second digital product at $37-47 — a workbook or template bundle — and launch a bundle offer.
---

**Theme:** Digital product #2 — higher price, deeper transformation.

**The pitch:**
> "Product #2 should feel like a natural next step after Product #1. If #1 is a symptom tracker, #2 might be 'now that you know your patterns, here's what to do with them.' The buyer of #1 is your warmest lead for #2."

### Session Goal
The student leaves with a second digital product priced $37–67 — designed, exported, listed on Stan Store, with a bundle SKU and a cross-sell email update in Kit.

### What You'll Build
1. **Product #2 Strategy** — Position as the natural upgrade from Product #1; price band rationale ($37–47 sweet spot at her trust level).
2. **Product Design** — Choose workbook or template bundle; write the brief using the Day 6 format.
3. **AI-Assisted Creation** — Run `product-writer.js` with the new brief; edit heavily for the more personal workbook format.
4. **Production** — Canva workbook: section dividers, dotted journaling lines, "aha moment" callouts, progress markers; test PDF on mobile.
5. **Listing + Pricing Strategy** — Run `product-copy-writer.js`; add a bundle SKU (P1 + P2 with $7–17 savings); update Kit P1 confirmation email with cross-sell PS.
6. **Day 12 Close** — Product stack live: P1, P2, bundle, lead magnet. Update CLAUDE.md.

### Tools / Setup
- `products/product2-brief.md` — input brief
- `scripts/product-writer.js` and `scripts/product-copy-writer.js` — reused from Day 6
- Canva — workbook design
- Stan Store — listing + bundle SKU
- Kit automation — cross-sell PS in P1 confirmation email

### Teaching Moments
- "At $47, you're in the 'considered purchase' zone — she thinks about it briefly but doesn't agonize. Since you're two weeks into building trust, $37–47 is the right zone."
- "Workbooks require a clear transformational arc. Where does she start? Where does she end?"
- "Slightly higher quality bar than Product #1 — it costs more, it should feel like it."

### Likely Confusion Points
- **What if no one bought P1 yet?** — Doesn't matter. Build P2 anyway; the stack is what generates compounding revenue once traffic arrives.
- **Mobile readability** — Many buyers read on phones. Test the PDF on her phone before publishing.

---
day: 13
week: 3
title: Paid Promotion — $20 Test
description: Run a small $20 paid promotion test on TikTok and Instagram to evaluate whether ads can drive growth.
---

**Theme:** Paid promotion — a $20 scientific test, not a gamble.

**The pitch:**
> "Paid promotion amplifies what's already working. It does NOT fix content that isn't working. If a video is getting 70% watch time organically, boosting it will get you cheap, effective reach. Only promote your winners."

### Session Goal
The student leaves with $10 running on TikTok Spark Ads and $10 on Instagram Boost against her strongest organic video, plus a measurement sheet she'll fill in over the next 3 days.

### What You'll Build
1. **Paid Promotion Philosophy** — Frame paid as an amplifier of winners and the $20 ceiling as cheap tuition.
2. **Which Content to Promote** — Selection criteria (highest watch %, saves, profile visits, clear CTA); math the email-funnel ROI.
3. **TikTok Spark Ads Setup** — Business account, Traffic campaign, $10 lifetime, female 30–50, wellness interests, US/CA/AU/UK, Spark format on the chosen post.
4. **Instagram Boost Setup** — Boost the equivalent post: profile/website visits goal, $10/3 days, matching targeting.
5. **Measurement Framework** — `data/paid-promotions/test1-[date].md` template capturing impressions, clicks, CPC, follows, email growth, sales, verdict.
6. **Day 13 Close** — Honest framing: this test might come back "not worth it yet" — that's a valid answer.

### Tools / Setup
- TikTok Ads Manager — `ads.tiktok.com` (business account)
- Instagram Boost — native to the IG app
- `data/paid-promotions/test1-[date].md` — measurement template

### Teaching Moments
- "We're not trying to scale today. We're running a scientific test: spend $10 on each platform on the same piece of content, measure, and decide if the economics make sense to scale."
- "This math only works if every piece is set up correctly. That's why we built the pipeline first — the ad is just a faucet that sends people into a working system."

### Likely Confusion Points
- **What goal — followers or sales?** — Lead magnet signups. Email is the multi-step path to sales; chasing direct sales at $10 spend is unrealistic.
- **What targeting?** — Female 30–50, wellness/self-improvement/parenting interests, US/CA/AU/UK. Lock and let it optimize for 3 days before judging.

---
day: 14
week: 3
title: Growth Systems + Collaboration Strategy
description: Build the compounding growth stack — hashtags, social SEO, collaboration outreach, and engagement automation.
---

**Theme:** Growth systems + collaboration strategy — the compounding organic stack.

**The pitch:**
> "One well-chosen collaboration can bring more followers than a month of consistent posting. When you appear on someone else's content, you're borrowing their audience's trust."

### Session Goal
The student leaves with a researched hashtag strategy, social-SEO updates to her caption engine, 3 collaboration DMs sent, and a comment-response tool that keeps engagement on-brand at scale.

### What You'll Build
1. **The Organic Growth Stack** — Map Tier 1 content quality → Tier 2 discoverability → Tier 3 community → Tier 4 consistency.
2. **Hashtag Research System** — `scripts/hashtag-researcher.js` produces tiered hashtag sets (large/medium/small) per topic and a `data/hashtags/master-list.md`.
3. **SEO for Social** — Update `caption-engine.md` to require natural keyword phrases ("perimenopause symptoms," "hormone imbalance women over 40").
4. **Collaboration Outreach** — `scripts/collab-outreach.js` generates DM + email versions per target; she identifies 5 accounts and sends 3 DMs today.
5. **Engagement System** — `scripts/comment-helper.js` + `scripts/prompts/comment-responder.md` for on-brand replies when she's stuck on what to say.
6. **Day 14 Close** — All growth systems online; final-day preview. Update CLAUDE.md.

### Tools / Setup
- `scripts/hashtag-researcher.js` — Brave Search + Claude Sonnet
- `scripts/collab-outreach.js` — generates DM + email variants
- `scripts/comment-helper.js` — on-brand response generator
- Caption engine prompt — updated with SEO keyword rule

### Teaching Moments
- "30% of Gen Z uses TikTok as their primary search engine. Your content needs to appear in those searches."
- "Say the keyword in the first 3 seconds — TikTok transcribes audio."
- "Set a standard: respond to every comment in the first 24 hours."

### Likely Confusion Points
- **Who to collaborate with?** — Start with similar-size peers (easiest), then complementary niches (fitness 40+, therapists, naturopaths), then slightly larger accounts (lead with value).
- **Bot-sounding replies** — Don't use the helper for every comment. Use it when she's stuck, then edit it into her voice before posting.

---
day: 15
week: 3
title: Launch Review + Next 90 Days
description: Full business audit, honest numbers review, paid promotion results, and a concrete 90-day revenue roadmap.
---

**Theme:** Launch review + 90-day roadmap — the honest conversation about the long game.

**The pitch:**
> "Three weeks ago you had an idea and a niche. Today you have a brand, a voice, a content machine, two products for sale, an email list, affiliate links, a storefront, a research pipeline, a repurposing system, and a 90-day plan."

### Session Goal
Every system audited and tested, all numbers reviewed against benchmarks, paid-promotion verdict reached, and a specific month-by-month roadmap targeting $500–1,000/month by month 3.

### What You'll Build
1. **Full Business Audit** — Test every script, buy every product as a test customer, sign up for the lead magnet, confirm welcome sequence fires, verify all affiliate links + disclosures.
2. **Numbers Review** — Run `analytics-tracker.js --log` and `--report`; compare against 3-week benchmark table.
3. **Paid Promotion Results** — Fill in Day 13's measurement sheet; apply the CPS thresholds (<$2 scale / $2–5 test / >$5 pause).
4. **90-Day Roadmap** — Month 1 consistency/optimization → Month 2 community/scale → Month 3 monetization focus with specific follower, email, and revenue targets.
5. **Mindset for the Long Game** — Frame the things that will feel like failure but aren't; commit to the one non-negotiable.
6. **Final Close** — Final CLAUDE.md update with business status, 90-day goals, and the rule in writing.

### Tools / Setup
- All scripts from Days 2–14 — audit pass
- Stan Store + Kit + Amazon Associates dashboards — verification
- Day 13's `data/paid-promotions/test1-[date].md` — results review
- CLAUDE.md — final state-of-business snapshot

### Teaching Moments
- "Most people who start content businesses quit within 60 days. The creators who win are the ones who kept posting at 200 followers with the same energy they had at 20,000."
- "Post five times a week for 90 days. That's the only rule."
- "The women you're here to serve — they're out there right now. Posting five times a week is how you find each other. Go make the content."

### Likely Confusion Points
- **Numbers feel small** — Whatever they are, they're right for where she is. The only metric that matters at Day 15 is positive trajectory.
- **No sales yet** — Normal at this follower count. The systems are built to compound; consistency is the only variable left.
- **Paid promotion verdict reads "not worth it yet"** — Valid answer. Most businesses build the first 1,000 followers organically.

### Stretch Goals
- Identify the 2–3 pieces she's most proud of and use them as the north star for what to make more of.
- Identify 3 brands in the niche for first brand-deal outreach in Month 2.
