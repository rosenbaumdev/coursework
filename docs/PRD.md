# PRD: Jordan's AI Builder Coursework Tracker

## Overview
A lightweight single-page React app serving as a living coursework tracker for Jordan's 3-week AI business building coursework. Two views: Jordan's (interactive) and Dad's (coaching). No backend. No auth. localStorage only.

---

## Users

| User | Route | Capabilities |
|------|-------|--------------|
| Jordan | `/` | Check off days, add notes, set arc, view progress |
| Jonathan (Dad) | `/dad` | View progress, leave feedback per day |

---

## Core Features

### Arc Selection
- On first load (Jordan's view), if no arc is saved, show an arc selection screen before the main coursework
- Arc options presented as cards Jordan picks from:
  - Sports Betting AI
  - AI Trading Assistant
  - Faceless Content Machine
  - Fantasy Sports AI
  - AI Lead Gen Tool
  - AI Research Assistant
  - Affiliate Automation
  - AI Creator Dashboard
  - AI Social Clip Generator
- Selected arc saved to localStorage
- Displayed persistently at top of app as a badge/tag
- Can be changed via a small "change" link (with confirmation)

### Progress Bar
- Top of page
- Shows X of 21 days completed
- Simple, clean

### Day Cards
- One card per day (21 total)
- Each card shows:
  - Day number
  - Week badge (Week 1 / Week 2 / Week 3)
  - Title
  - One-line description
  - Completion checkbox (Jordan's view only — clicking it marks complete with timestamp)
  - Expand/collapse toggle for notes thread
  - "Current day" highlight (auto-detected as first incomplete day)
- Completed days visually muted but still readable
- Current day card slightly elevated/accented

### Notes Thread (per day)
- Expandable panel below each day card
- Threaded notes in chronological order
- Each note shows:
  - Author label: "Jordan" or "Dad" (styled differently)
  - Timestamp (formatted: "May 23, 2:34pm")
  - Note text
- Add note input at bottom of thread
  - Jordan's view: posts as "Jordan"
  - Dad's view: posts as "Dad"
- Notes persist in localStorage keyed by day ID

---

## Data Model (localStorage)

```json
{
  "arc": "Sports Betting AI",
  "days": {
    "1": {
      "completed": true,
      "completedAt": "2026-05-23T14:32:00",
      "notes": [
        {
          "id": "uuid",
          "author": "jordan",
          "timestamp": "2026-05-23T14:32:00",
          "text": "Got the agent working, API call was confusing at first"
        },
        {
          "id": "uuid",
          "author": "dad",
          "timestamp": "2026-05-23T15:00:00",
          "text": "Solid start. Tomorrow: don't skip the stretch goal."
        }
      ]
    }
  }
}
```

---

## 3-Week Coursework (baked in)

### WEEK 1 — Foundations + First Build

| Day | Title | Description |
|-----|-------|-------------|
| 0 | Orientation + Dopamine | Pick your arc, build your first AI agent, vibe code a mini golf game |
| 1 | Understand the Stack | Frontend vs backend, APIs, databases, cloud — the full map |
| 2 | Build the Frontend | React basics, components, state, first real UI |
| 3 | Add Backend Logic | Servers, API routes, your app talks to the internet |
| 4 | Add AI | LLMs, prompting, cost basics, your first AI-powered feature |
| 5 | Deploy + Ship | Hosting, domains, environment variables — go live |
| 6 | Consolidation Sprint | Catch up, polish, solidify what's shaky |

### WEEK 2 — Make It a Real Product

| Day | Title | Description |
|-----|-------|-------------|
| 7 | Add a Database | Persistence, tables, saving user data with Supabase |
| 8 | Add Authentication | Real user accounts, sessions, personalized experience |
| 9 | Analytics + Tracking | Funnels, retention, behavioral data — understand your users |
| 10 | Add Monetization | Stripe, subscriptions, pricing psychology, first payment flow |
| 11 | Consolidation Sprint | Catch up, test end-to-end, fix broken flows |
| 12 | Agents + Automation | Agentic workflows, scheduled tasks, autonomous AI actions |
| 13 | Consolidation Sprint | Polish, edge cases, make it feel real |

### WEEK 3 — Launch + Distribution

| Day | Title | Description |
|-----|-------|-------------|
| 14 | Marketing Systems | Landing page, SEO basics, email capture, customer acquisition |
| 15 | Content Engine | AI media generation, social distribution, automated posting |
| 16 | Consolidation Sprint | Catch up, stress test, fix embarrassing bugs |
| 17 | Optimization + Scale | Performance, cost, reliability — think like a founder |
| 18 | Demo Day Prep | Package it, write the pitch, record the demo |
| 19 | Demo Day | Live product review, what worked, what didn't, 90-day roadmap |
| 20 | What's Next | Advanced arcs, next projects, staying in builder mode |

---

## Design Direction

- **Aesthetic**: Clean, minimal, slightly editorial. Think Field Notes meets Linear.
- **Theme**: Light mode. White background. Near-black text. Single accent color (deep blue or slate).
- **Typography**: Distinctive — NOT Inter or Roboto. Something with character but readable.
- **Cards**: Subtle border, gentle shadow on hover. Current day card has accent left border.
- **Completed days**: Slightly faded, checkmark, still legible.
- **Notes thread**: Indented, Jordan notes left-aligned, Dad notes with subtle different background.
- **No clutter**: No icons for the sake of icons. No gradients. No purple AI slop.
- **Animations**: Minimal. Smooth expand/collapse on notes. Checkbox satisfaction animation.

---

## Technical Stack

- React (Vite)
- React Router (for `/` and `/dad` routes)
- localStorage for all persistence
- No backend
- No auth
- CSS Modules or Tailwind (Claude Code's choice — keep it clean)
- Deployable as static site to jserver

---

## Out of Scope (v1)

- User authentication
- Backend/database
- Notifications
- Mobile-optimized (responsive is fine, mobile-first is not required)
- Multiple students
- Admin dashboard

---

## Success Criteria

- Jordan can open `/` and pick his arc on day one
- He can check off days as he completes them
- He can leave notes after each session
- Jonathan can open `/dad`, see all progress, and leave feedback
- Everything persists on page refresh
- It looks good enough that Jordan is not embarrassed to show it to someone
