# Jordan's AI Builder Coursework
## 3-Week Intensive: From Zero to Deployed AI Business

---

## Meta

**Student:** Jordan Rosenbaum
**Duration:** 3 weeks (21 days, Days 0–20)
**Arc:** TBD — chosen Day 0
**Goal:** Ship a live, deployed, AI-powered product with real users, real analytics, and a real payment flow
**Stack:** React, Node/Express, Supabase, Stripe, Anthropic API, Vercel
**Tools:** Claude Code, terminal, browser

**Guiding principle:** Shipping useful things matters more than writing perfect code.

---

## Structure

| Week | Theme | Days |
|------|-------|------|
| Week 1 | Foundations + First Build | 0–6 |
| Week 2 | Make It a Real Product | 7–13 |
| Week 3 | Launch + Distribution | 14–20 |

**Consolidation days** (Days 6, 11, 13, 16) are intentional buffer — catch up, polish, or accelerate if ahead.

---

---

# WEEK 1 — Foundations + First Build

---

## Day 0 — Orientation + Dopamine

**Theme:** Excitement, demystification, early wins

**The pitch to Jordan:**
> "Today is not about coding. Today is about understanding the playing field and getting your first taste of what building with AI actually feels like."

### Learning Objectives
- Understand what modern AI-powered internet businesses actually are
- Get comfortable with the terminal and Claude Code
- See what an "AI agent" actually does
- Experience AI-assisted coding for the first time
- Choose your monetization arc

### Concepts Introduced
- Frontend vs backend (high level only)
- What an API is
- What an AI agent/automation is
- What a SaaS business model is
- The modern builder's workflow: describe → generate → test → iterate

### Build Task 1 — First AI Agent (~45 min)
Build a simple AI-powered automation that:
1. Fetches real data from a public API (sports scores, stock news, trending topics — based on chosen arc)
2. Sends it to the Anthropic API with a smart prompt
3. Returns a formatted AI summary to the terminal

**Tools:** Claude Code, terminal, Anthropic API (free $5 credit)
**Output:** Working script Jordan can run and see a real AI response

**Teaching moment:** "This four-step loop — trigger, fetch, AI process, output — is the foundation of almost every AI automation business."

### Build Task 2 — Mini Golf Vibe Coding (~60 min)
Build a playable browser-based mini golf hole using AI-assisted coding.

**Requirements:**
- Single HTML file
- Ball physics, walls, collisions
- A hole/cup — ball drops in when close
- Stroke counter
- At least one interesting obstacle (Jordan decides)

**Jordan drives:** colors, obstacles, difficulty, layout
**Teaching moment:** AI as collaborator, not replacement. Describe → generate → iterate.

### Arc Selection
Jordan picks his monetization arc from:
- Sports Betting AI
- AI Trading Assistant
- Faceless Content Machine
- Fantasy Sports AI
- AI Lead Gen Tool
- AI Research Assistant
- Affiliate Automation
- AI Creator Dashboard
- AI Social Clip Generator

### Environment Setup
- [ ] Terminal comfort — basic commands (cd, ls, mkdir, npm)
- [ ] Claude Code installed and running
- [ ] Node.js installed
- [ ] GitHub account created
- [ ] Anthropic API key obtained (console.anthropic.com)
- [ ] Arc selected and written down

### Likely Confusion Points
- "Is using AI to write code cheating?" — No. Directing AI is the skill.
- "Should I understand every line?" — Not yet. Understand the structure.
- "My API key is exposed, is that safe?" — Not in production. Fine for today. We fix this Day 5.

### Stretch Goals
- Modify the AI prompt to output in a different format
- Add a second obstacle to the mini golf hole
- Run the agent script twice with different prompts, compare outputs

---

## Day 1 — Understand the Stack

**Theme:** The full map. Everything clicks into place.

**The pitch to Jordan:**
> "Before we build your product, you need to see the whole blueprint. Today we draw the map we'll follow for the next three weeks."

### Learning Objectives
- Understand the complete architecture of a modern web app
- Know where every piece lives and why it exists
- Be able to explain frontend vs backend vs database vs API to someone else
- Understand how internet businesses make money

### Concepts Introduced
- Frontend vs backend (deep)
- Local vs cloud
- HTTP requests and responses
- APIs — what they are, how they work, how you pay for them
- Databases — what they store and why
- Auth — what it protects
- Hosting and deployment
- AI providers and models (Anthropic, OpenAI)
- SaaS monetization: subscriptions, freemium, usage-based

### Architecture Diagram
```
USER (browser)
     ↓
FRONTEND — React (what they see + click)
     ↓
BACKEND — Node/Express (logic, rules, decisions)
     ↓
DATABASE — Supabase (stores everything)
     ↓
EXTERNAL APIs
  ├── Sports/Finance/News data
  ├── AI models (Anthropic)
  └── Payments (Stripe)
```

### Build Task
Map your chosen arc onto this diagram.

For each layer, answer:
- What does the user see? (Frontend)
- What logic runs behind the scenes? (Backend)
- What needs to be saved? (Database)
- What outside data does this need? (APIs)
- What does the AI do? (AI layer)
- How does money change hands? (Monetization)

Write this out. Draw it if it helps. This is your product's blueprint.

### Likely Confusion Points
- "Why do we need a backend at all?" — Security, logic that can't run in the browser, API keys that can't be exposed.
- "What's the difference between an API and a database?" — API = door to outside data. Database = your own storage.
- "What's the difference between local and deployed?" — Local = your laptop only. Deployed = anyone in the world can access it.

### Stretch Goals
- Find 2 real APIs relevant to your arc and read their documentation
- Look up what Supabase costs at scale
- Find a real product in your arc's space and try to reverse-engineer their stack

---

## Day 2 — Build the Frontend

**Theme:** Your product becomes real.

**The pitch to Jordan:**
> "Today you build the thing users actually see and touch. By the end of today, your app looks like a real product."

### Learning Objectives
- Understand React components
- Understand state and why it matters
- Build a functional, interactive UI for your arc
- Get comfortable with the describe → generate → iterate workflow in a UI context

### Concepts Introduced
- React basics — what it is and why everyone uses it
- Components — reusable building blocks
- Props — passing data into components
- State — data that changes, triggers re-render
- Event handlers — onClick, onChange
- Basic CSS/Tailwind for layout

### Build Task
Build the main interface for your arc. This is not a prototype — this is the actual UI you'll keep building on.

**Minimum viable UI includes:**
- App header with name and navigation
- Primary input area (search bar, ticker input, query box — depends on arc)
- Results/output display area (empty for now — we wire it up Day 3)
- Basic layout that looks intentional

**Tools:** Claude Code, React, Tailwind, browser preview

**Teaching moment:** "Components are Legos. You build small pieces, then assemble them."

### Likely Confusion Points
- "Why does React re-render?" — Because state changed. That's the whole model.
- "What's the difference between props and state?" — Props come from outside (parent). State lives inside the component.
- "Why Tailwind and not regular CSS?" — Speed. Utility classes mean you don't switch files constantly.

### Stretch Goals
- Add a dark mode toggle
- Make the layout responsive (looks okay on mobile)
- Add loading skeleton states to the output area

---

## Day 3 — Add Backend Logic

**Theme:** Your app talks to the internet.

**The pitch to Jordan:**
> "Your UI looks great. Now we give it a brain. Today the frontend stops being a static picture and starts doing real things."

### Learning Objectives
- Understand what a server is and why you need one
- Build a simple Express backend
- Connect frontend to backend with an API call
- Fetch real external data relevant to your arc

### Concepts Introduced
- Servers — what they are, what they do
- Express.js — Node's web server framework
- Routes — URLs that do things (GET /api/data)
- HTTP methods — GET, POST
- Fetch API — how frontend talks to backend
- CORS — why it exists and how to handle it
- Environment variables — keeping secrets secret (preview)

### Build Task
Build a backend that:
1. Has at least one API route relevant to your arc
2. Fetches real external data (sports odds, stock prices, news, trending topics)
3. Returns it to the frontend
4. Frontend displays real data in the UI

**Example routes by arc:**
- Sports Betting: `GET /api/odds` → fetches today's lines
- Trading: `GET /api/market` → fetches market summary/news
- Content: `GET /api/trends` → fetches trending topics
- Fantasy: `GET /api/players` → fetches player stats

**Tools:** Claude Code, Node, Express, relevant public API for your arc

**Teaching moment:** "The backend is the kitchen. Users never see it. But nothing gets served without it."

### Likely Confusion Points
- "Why can't I just call the external API from the frontend?" — You can, but your API key would be exposed to anyone who opens DevTools.
- "What is CORS and why is it yelling at me?" — Browsers block cross-origin requests by default. `cors()` middleware fixes it.
- "What's the difference between GET and POST?" — GET fetches data. POST sends data.

### Stretch Goals
- Add a second API route
- Add basic error handling (what happens if the external API is down?)
- Add request logging so you can see every call in the terminal

---

## Day 4 — Add AI

**Theme:** Your product gets its superpower.

**The pitch to Jordan:**
> "Data alone isn't a product. AI-processed data is. Today your app stops showing raw information and starts providing intelligence."

### Learning Objectives
- Understand how LLMs work at a conceptual level
- Call the Anthropic API from your backend
- Write effective prompts for your arc's use case
- Understand tokens, context windows, and cost basics

### Concepts Introduced
- LLMs — what they are, how they're trained (very high level)
- Prompt engineering — system prompts, user prompts, context
- Context windows — why they matter, what happens when you exceed them
- Tokens — what they are, how cost works
- Streaming responses — why they feel better
- AI as a backend service — it's just another API call

### Build Task
Add an AI-powered feature to your app:
1. Backend fetches real data (from Day 3)
2. Backend sends data + smart prompt to Anthropic API
3. AI returns processed intelligence
4. Frontend displays the AI response

**Example features by arc:**
- Sports Betting: AI analyzes today's lines, surfaces value bets with reasoning
- Trading: AI summarizes market news, flags notable moves
- Content: AI generates 5 content ideas based on trending topics
- Fantasy: AI recommends start/sit decisions with reasoning

**Tools:** Claude Code, Anthropic API (claude-sonnet-4-5), your existing backend

**Teaching moment:** "You're not building an AI. You're using AI as a service. The skill is knowing what to ask it and how."

### Likely Confusion Points
- "How do I write a good prompt?" — Be specific. Give it a role. Tell it the output format you want. Show don't tell.
- "Why does it cost money?" — You're renting compute. Every token in and out has a price. Claude Sonnet is cheap.
- "What's a system prompt?" — Instructions to the AI that the user doesn't see. Sets behavior and persona.

### Stretch Goals
- Add streaming so the response types out in real time
- Experiment with different prompts — compare outputs
- Add a prompt template system so you can swap prompts easily

---

## Day 5 — Deploy + Ship

**Theme:** You're on the internet.

**The pitch to Jordan:**
> "Everything so far lives only on your laptop. Today we put it on the internet. Anyone in the world can use it."

### Learning Objectives
- Understand what deployment actually means
- Deploy frontend and backend to the cloud
- Configure environment variables properly
- Get a shareable URL

### Concepts Introduced
- Local vs production environments
- Environment variables — what they are, why they matter, how to use them
- Static vs dynamic hosting
- Frontend deployment (Vercel)
- Backend deployment (Railway)
- Domain names (optional)
- What can go wrong in production vs local

### Build Task
Deploy your full app:
1. Push code to GitHub
2. Deploy frontend to Vercel (connects to GitHub, auto-deploys)
3. Deploy backend to Railway
4. Set all environment variables in both platforms
5. Test the live URL end-to-end

**Tools:** GitHub, Vercel, Railway, Claude Code

**Teaching moment:** "A product that only runs on your laptop isn't a product. This URL is the difference."

### Likely Confusion Points
- "Why does it work locally but not deployed?" — Almost always an environment variable that's missing or a port that's hardcoded.
- "What's a .env file?" — Local secrets file. Never commit it to GitHub. `.gitignore` it immediately.
- "Why do I need separate frontend and backend hosting?" — Frontend is static files. Backend is a running server. Different needs.

### Stretch Goals
- Set up a custom domain
- Set up automatic deploys (push to GitHub → auto-deploys)
- Add a basic health check endpoint to your backend

---

## Day 6 — Consolidation Sprint

**Theme:** Solidify before you scale.

**The pitch to Jordan:**
> "Real companies don't ship new features on top of shaky foundations. Today we make sure everything we've built actually works."

### Objectives
- Catch up on anything incomplete from Days 1–5
- Fix bugs that have been tolerated but not fixed
- Polish the UI to feel like a real product
- Make sure the deployed app works end-to-end
- Write down what was hard — useful for building your own coursework later

### Tasks (pick based on what needs attention)
- [ ] Frontend looks intentional and clean
- [ ] Backend handles errors gracefully (doesn't crash on bad input)
- [ ] AI prompts produce consistently useful output
- [ ] Deployed app works exactly like local
- [ ] Environment variables are all set correctly
- [ ] README.md exists and explains what the project is

### Reflection Prompt for Jordan
> What's the one thing you built this week that surprised you most? What do you still not fully understand?

---

---

# WEEK 2 — Make It a Real Product

---

## Day 7 — Add a Database

**Theme:** Your app now remembers things.

**The pitch to Jordan:**
> "Right now your app processes information but forgets everything the moment the page refreshes. Today we give it memory."

### Learning Objectives
- Understand what a database is and why you need one
- Set up Supabase (hosted Postgres)
- Design a simple schema for your arc
- Read and write data from your backend

### Concepts Introduced
- Databases — tables, rows, columns
- SQL basics — SELECT, INSERT, UPDATE (just enough)
- Supabase — hosted Postgres with a nice dashboard
- ORMs vs raw queries (light touch)
- Data modeling — what to store and why
- Primary keys, foreign keys (light touch)

### Build Task
Add a database that stores something meaningful for your arc:

**Examples by arc:**
- Sports Betting: save picks, track record, win/loss history
- Trading: save watchlists, saved analyses
- Content: save generated ideas, publication history
- Fantasy: save lineups, weekly recommendations

Steps:
1. Create Supabase project
2. Design and create your first table(s)
3. Connect backend to Supabase
4. Add routes to read/write data
5. Frontend reflects saved data

**Tools:** Supabase, Claude Code, existing backend

**Teaching moment:** "Every app you've ever used has a database. Instagram's photos, your Spotify playlists, your DraftKings picks — all rows in tables somewhere."

### Likely Confusion Points
- "When do I need a database vs localStorage?" — localStorage is per-browser, temporary, insecure. DB is persistent, universal, queryable.
- "What's a schema?" — The blueprint of your tables. Define before you build.
- "SQL is scary." — You only need 4 commands for 90% of apps. Claude Code writes the rest.

### Stretch Goals
- Add a second table with a relationship to the first
- Build an admin view that shows all saved data
- Add timestamps to everything (created_at, updated_at)

---

## Day 8 — Add Authentication

**Theme:** Your app has real users.

**The pitch to Jordan:**
> "Right now everyone sees the same thing. Today we add accounts — personalized experiences, saved preferences, user-specific data."

### Learning Objectives
- Understand what auth is and why it's needed
- Implement auth with Supabase Auth
- Protect routes that require login
- Connect user identity to their data

### Concepts Introduced
- Authentication vs authorization
- Sessions and JWTs (light touch)
- Supabase Auth — email/password, OAuth options
- Protected routes in React
- Row Level Security in Supabase (why it matters)
- The auth flow: signup → login → session → logout

### Build Task
Add authentication to your app:
1. Add signup and login UI
2. Connect to Supabase Auth
3. Protect the main app behind login
4. Connect saved data to the logged-in user (user_id on DB rows)
5. Add a logout button

**Tools:** Supabase Auth, React, Claude Code

**Teaching moment:** "Auth isn't just a feature — it's what makes data personal. Without it, everyone shares the same data."

### Likely Confusion Points
- "What's a JWT?" — A signed token that proves who you are. Don't worry about the internals yet.
- "Why do I need Row Level Security?" — Without it, any authenticated user can read any row. RLS makes data private per user.
- "OAuth vs email/password?" — OAuth (Google login) is less friction for users. Email/password is easier to implement. Start with email/password.

### Stretch Goals
- Add Google OAuth
- Add a user profile page
- Add "forgot password" flow

---

## Day 9 — Analytics + Tracking

**Theme:** You stop guessing what users want.

**The pitch to Jordan:**
> "You can't improve what you can't measure. Today we add the systems that show you exactly how users behave — what they click, where they drop off, what they love."

### Learning Objectives
- Understand why analytics matters for product decisions
- Set up PostHog for behavioral analytics
- Track key events in your app
- Read the dashboard and draw one insight

### Concepts Introduced
- Product analytics vs marketing analytics
- Events, properties, funnels
- Retention — the most important metric nobody tracks early enough
- PostHog — open source analytics, generous free tier
- What to track and why (not everything — just the key actions)

### Build Task
Instrument your app with analytics:
1. Set up PostHog project
2. Add PostHog SDK to frontend
3. Track 5 key events:
   - App loaded
   - User signed up
   - Core feature used (query submitted, pick generated, etc.)
   - Result viewed
   - User returned next day
4. Set up one funnel: signup → first use → return
5. Watch yourself use the app and see it tracked in real time

**Tools:** PostHog, React, Claude Code

**Teaching moment:** "Data drives every product decision at every company you've ever heard of. You're doing what they do."

### Likely Confusion Points
- "What's a funnel?" — The steps users take to reach a goal. Where they drop off = where you fix things.
- "What's the difference between a pageview and an event?" — Pageview is passive (they loaded a page). Event is intentional (they clicked something meaningful).
- "What should I track?" — The actions that matter to your business. Not everything. Quality over quantity.

### Stretch Goals
- Set up a retention cohort analysis
- Create a custom dashboard with your key metrics
- Add session recording to watch real user behavior (PostHog has this)

---

## Day 10 — Add Monetization

**Theme:** Someone could actually pay you.

**The pitch to Jordan:**
> "Today your app gets a cash register. This is the day it stops being a project and starts being a business."

### Learning Objectives
- Understand SaaS pricing models
- Implement Stripe subscriptions
- Gate premium features behind payment
- Understand the psychology of pricing

### Concepts Introduced
- Stripe — the payments layer the internet runs on
- Subscriptions vs one-time payments vs usage-based
- Webhooks — how Stripe tells your backend "they paid"
- Free vs premium feature gating
- Pricing psychology: anchoring, tiers, freemium
- Churn — the thing that kills SaaS companies

### Build Task
Add a payment flow:
1. Create Stripe account and products
2. Build a pricing page
3. Implement Stripe Checkout
4. Handle the webhook that confirms payment
5. Gate at least one feature behind payment (or usage limit)
6. Add a basic subscription management page (cancel, upgrade)

**Tools:** Stripe, Node/Express, React, Claude Code

**Teaching moment:** "Stripe is the reason millions of internet businesses exist. Before Stripe, handling payments required a bank relationship and months of paperwork."

### Likely Confusion Points
- "What's a webhook?" — Stripe calls your backend when something happens (payment succeeded, subscription cancelled). You can't poll for this — you have to listen.
- "What's the difference between test mode and live mode?" — Test mode uses fake card numbers. Never switch to live until you're ready to charge real people.
- "How do I know what to charge?" — Look at 3 competitors. Price in the middle. Adjust based on what you learn.

### Stretch Goals
- Add a free trial (7 or 14 days)
- Add annual pricing with a discount
- Build a simple internal dashboard showing MRR

---

## Day 11 — Consolidation Sprint

**Theme:** Make it actually work.

**The pitch to Jordan:**
> "You now have a real product. Auth, database, AI, payments. Today we make sure the whole thing works together without breaking."

### Objectives
- End-to-end test the complete user journey: land → sign up → use core feature → hit paywall → subscribe → access premium feature
- Fix any auth/DB connection bugs
- Make sure Stripe webhooks are working
- Polish any rough UI edges
- Stress test with edge cases

### Tasks
- [ ] New user can sign up and log in
- [ ] Core AI feature works for logged-in user
- [ ] Data saves and persists correctly to the right user
- [ ] Paywall triggers at the right point
- [ ] Stripe checkout completes without error
- [ ] Webhook fires and premium access is granted
- [ ] User can log out and log back in
- [ ] Nothing crashes on bad input

### Reflection Prompt for Jordan
> If a friend signed up right now, would you be embarrassed? What's the one thing you'd fix first?

---

## Day 12 — Agents + Automation

**Theme:** Your product works while you sleep.

**The pitch to Jordan:**
> "Right now your app only does things when a user clicks something. Today we make it autonomous — AI systems that run on schedules, chain tasks together, and deliver value without anyone asking."

### Learning Objectives
- Understand agentic AI workflows
- Build a multi-step automated pipeline
- Schedule automated tasks
- Understand where agents fit in your product

### Concepts Introduced
- Agents vs chatbots vs simple AI calls
- Agentic loops — AI making decisions, taking actions, checking results
- Scheduled tasks — cron jobs
- Multi-step pipelines: fetch → process → generate → deliver
- Tool use / function calling (light touch)

### Build Task
Build an automated agent relevant to your arc:

**Examples by arc:**
- Sports Betting: daily pre-game AI analysis email to subscribers
- Trading: morning market briefing auto-generated and pushed to users
- Content: weekly content calendar auto-generated from trending data
- Fantasy: waiver wire recommendations auto-generated each Tuesday

Steps:
1. Design the pipeline (what triggers it, what it does, what it outputs)
2. Build the pipeline logic in backend
3. Set up a scheduled task (node-cron or similar)
4. Test it runs correctly on demand
5. Connect output to a delivery mechanism (email, in-app notification, saved to DB)

**Tools:** Claude Code, Anthropic API, node-cron, your existing stack

**Teaching moment:** "Automation is leverage. One engineer with good automation systems can do what 10 engineers did five years ago."

### Likely Confusion Points
- "What makes something an 'agent' vs just a script?" — An agent makes decisions. It evaluates context and chooses actions. A script just runs the same steps every time.
- "How do I schedule things in Node?" — node-cron. Simple syntax. `'0 8 * * *'` = every day at 8am.
- "What if the agent makes a mistake?" — Log everything. Build in validation. Never let an agent send something to users without a sanity check.

### Stretch Goals
- Add a retry mechanism if the API call fails
- Build a "preview" mode where you can see what the agent would send before it sends
- Chain two AI calls together (one to fetch/summarize, one to generate recommendations)

---

## Day 13 — Consolidation Sprint

**Theme:** Make it feel like a real product.

**The pitch to Jordan:**
> "This is the last day before we shift to growth and distribution. Make sure the product itself is something you're proud of."

### Objectives
- Polish UI to production quality
- Make sure automated workflows are reliable
- Fix edge cases and error states
- Write a one-paragraph description of what the product does and who it's for
- Make sure it looks good on a real phone

### Tasks
- [ ] Error states handled everywhere (loading, empty, failed)
- [ ] Mobile layout acceptable
- [ ] Copy (text in the app) is clear and intentional
- [ ] Automated agent has run successfully at least once
- [ ] The product has a name
- [ ] You could demo it to a stranger without apologizing

---

---

# WEEK 3 — Launch + Distribution

---

## Day 14 — Marketing Systems

**Theme:** Building the funnel that finds users.

**The pitch to Jordan:**
> "A great product nobody knows about isn't a business. Today we build the systems that bring people to the door."

### Learning Objectives
- Understand customer acquisition basics
- Build a landing page that converts
- Set up email capture
- Understand SEO fundamentals

### Concepts Introduced
- Landing pages vs app pages — different jobs
- Above the fold — the most important real estate on the internet
- Call to action (CTA)
- Email capture and why email is still king
- SEO basics — how Google decides what to rank
- Organic vs paid acquisition

### Build Task
Build a marketing landing page for your product:
1. Headline that clearly states the value proposition
2. 3 benefit bullets (not feature bullets — benefits)
3. Email capture with a lead magnet or "join waitlist" CTA
4. One social proof element (even if fake/placeholder)
5. Deploy it

**Tools:** React or plain HTML, Resend or Mailchimp for email capture, Vercel

**Teaching moment:** "Your landing page has one job: get the visitor to do one thing. Everything else is noise."

### Likely Confusion Points
- "What's the difference between a feature and a benefit?" — Feature: "AI-powered analysis." Benefit: "Stop leaving money on the table with bad picks."
- "Do I need a blog for SEO?" — Eventually. Not today. Start with one page that's genuinely useful to your target user.
- "What do I do with the emails I collect?" — Tell them when you launch. Send them value. Don't spam.

### Stretch Goals
- Set up a simple email sequence (welcome email → day 3 follow up → day 7 pitch)
- Add a referral mechanism ("share with a friend for 1 month free")
- Submit to one relevant community (Reddit, Discord, Product Hunt waitlist)

---

## Day 15 — Content Engine

**Theme:** Automated distribution at scale.

**The pitch to Jordan:**
> "Ads cost money. Content compounds. Today we build systems that produce and distribute content automatically."

### Learning Objectives
- Understand content as a distribution channel
- Build an AI-powered content generation pipeline
- Understand the social platforms and what works on each
- Set up basic automated posting

### Concepts Introduced
- Content marketing as a distribution channel
- Short-form vs long-form content strategy
- Platform-specific formats (X threads, TikTok hooks, YouTube Shorts)
- Faceless content — why it works, how it scales
- Automation pipelines for content production

### Build Task
Build a content generation pipeline:
1. AI generates 5 pieces of content per day relevant to your arc
2. Content is stored in DB
3. Dashboard shows content queue
4. At least one format is auto-publishable (or close to it)

**Examples by arc:**
- Sports Betting: daily pick threads for X with reasoning
- Trading: morning market commentary for LinkedIn/X
- Content: niche-specific TikTok script generator
- Fantasy: weekly rankings thread for X

**Tools:** Claude Code, Anthropic API, relevant social APIs (X API, Buffer)

### Likely Confusion Points
- "Is AI content spammy?" — Only if it's low quality and high volume. Quality + consistency beats volume.
- "Do I need to post manually forever?" — No. The goal is a queue you approve, not a firehose you don't control.

### Stretch Goals
- Add image generation to content (using an image API)
- Build an approval queue before auto-publish
- Set up analytics on which content performs best

---

## Day 16 — Consolidation Sprint

**Theme:** Deep breath before the final push.

### Objectives
- Everything from Days 14–15 works correctly
- Landing page is live and looks good
- Content pipeline is running
- Email list has at least a few real people on it (share with friends/family)
- Fix anything embarrassing before Demo Day

---

## Day 17 — Optimization + Scale Thinking

**Theme:** Think like a founder, not just a builder.

**The pitch to Jordan:**
> "Your product works. Now let's make sure it works when 100 people use it, not just you."

### Learning Objectives
- Understand technical debt
- Think about performance and reliability
- Understand the cost structure of your stack
- Make one meaningful performance improvement

### Concepts Introduced
- Technical debt — what it is, when to pay it down
- Caching — why it matters, simple examples
- Rate limiting — protecting your app from abuse
- Cost optimization — AI calls, DB queries, hosting costs
- Error monitoring — Sentry or similar
- "Good enough" vs over-engineered

### Build Task
Audit your stack:
1. Calculate your monthly costs at current scale
2. Calculate your monthly costs at 100 users, 1000 users
3. Identify the most expensive operation (usually AI calls)
4. Implement one optimization (caching AI responses, rate limiting, batch processing)
5. Set up basic error monitoring

**Teaching moment:** "The best architecture is the simplest one that works. You can always optimize later. You can't always fix a product nobody wants."

### Stretch Goals
- Add a Redis cache layer for expensive queries
- Set up uptime monitoring
- Write a simple runbook: "If X breaks, do Y"

---

## Day 18 — Demo Day Prep

**Theme:** Package what you built.

**The pitch to Jordan:**
> "Building something is one skill. Communicating what you built and why it matters is a different skill. Both matter."

### Learning Objectives
- Articulate the value proposition clearly
- Record a compelling product demo
- Write a one-page product brief
- Prepare for real questions

### Build Task
1. Write your product brief:
   - What is it?
   - Who is it for?
   - What problem does it solve?
   - How does it make money?
   - What are the 3 most impressive things about it?
2. Record a 3-minute demo video (Loom)
3. Clean up the README on GitHub
4. Deploy final version

### Stretch Goals
- Post the demo publicly (X, LinkedIn, relevant community)
- Send it to 5 potential users and ask for honest feedback
- Price check: would anyone actually pay what you're charging?

---

## Day 19 — Demo Day

**Theme:** Ship it. Review it. Plan what's next.

### Objectives
- Live product demo and review with Jonathan
- Honest assessment: what worked, what didn't
- What would real users pay for?
- What's the 90-day roadmap if you kept going?

### Review Framework
**What we shipped:**
- [ ] Live deployed product
- [ ] Authentication
- [ ] Database
- [ ] AI-powered core feature
- [ ] Payments/monetization
- [ ] Analytics
- [ ] Automated agent/workflow
- [ ] Landing page + email capture
- [ ] Content distribution system

**What we learned:**
- What was harder than expected?
- What was easier than expected?
- What would you do differently?
- What concept do you still not fully understand?

**What's next:**
- 3 features that would make it meaningfully better
- One growth experiment worth running
- One thing worth automating further
- Is this worth continuing? (honest answer)

---

## Day 20 — What's Next

**Theme:** You're a builder now.

**The pitch to Jordan:**
> "Three weeks ago you hadn't built anything. Now you have a live, deployed, AI-powered product on the internet. That's not nothing. Here's how to keep going."

### Topics
- How to keep learning (build projects, not courses)
- What to study next based on your arc
- Open source — what it is, how to contribute, how to learn from it
- The builder's mindset: ship fast, learn faster
- Communities worth joining
- How to turn this into freelance work, a job, or a real company

### Suggested Next Projects (by arc)
- Sports Betting: add ML predictions (Python intro), build a Discord bot for picks distribution
- Trading: add more data sources, build a backtesting system
- Content: build the full faceless content pipeline, automate YouTube Shorts
- Fantasy: add machine learning to lineup optimization

### Parting Principle
> Code is a means, not an end. The skill is identifying problems worth solving and shipping solutions people actually want. You now have the tools to do that. Don't stop.

---

---

# Appendix

## Stack Reference

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | React + Vite | Industry standard, huge ecosystem |
| Styling | Tailwind CSS | Fast, consistent, no context switching |
| Backend | Node + Express | Simple, JavaScript everywhere |
| Database | Supabase | Hosted Postgres, great free tier, built-in auth |
| Auth | Supabase Auth | Same platform as DB, reduces complexity |
| AI | Anthropic API (claude-sonnet-4-5) | Best quality/cost ratio for most use cases |
| Payments | Stripe | The only real choice |
| Analytics | PostHog | Open source, generous free tier, great product |
| Deployment (FE) | Vercel | Git push → deploy, free tier is real |
| Deployment (BE) | Railway | Simple Node hosting, reasonable pricing |
| Version control | GitHub | Non-negotiable |
| AI coding | Claude Code | The tool we use to build everything |

## Arc-Specific API Resources

| Arc | Primary APIs |
|-----|-------------|
| Sports Betting | The Odds API, ESPN API (unofficial), SportRadar |
| Trading | Yahoo Finance RSS, Alpha Vantage (free tier), Polygon.io |
| Content | Google Trends RSS, Reddit API, YouTube Data API |
| Fantasy Sports | Sleeper API (free), ESPN Fantasy API (unofficial) |
| Lead Gen | Hunter.io, Apollo.io, LinkedIn (unofficial) |
| Research | News API, arXiv API, Wikipedia API |

## Vocabulary Glossary

| Term | Plain English |
|------|--------------|
| Frontend | What the user sees |
| Backend | The server-side logic |
| API | A door to someone else's data or service |
| Database | Persistent storage |
| Auth | Login/account system |
| Deploy | Put it on the internet |
| Environment variable | A secret stored outside your code |
| Webhook | A URL your backend listens on for events from external services |
| Token | The unit AI models charge by (roughly a word) |
| State | Data in your app that changes and causes re-renders |
| Component | A reusable piece of UI in React |
| Route | A URL that maps to a specific page or API endpoint |
| Schema | The blueprint of your database tables |
| JWT | A signed token that proves who you are |
| Cron job | A task that runs on a schedule |
| Technical debt | Code that works but will cause problems later |
| MRR | Monthly Recurring Revenue — the SaaS metric that matters most |
| Churn | Users who cancel their subscription |
| Funnel | The steps between a new visitor and a paying customer |
