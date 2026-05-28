# Claude Code Prompt — Jordan's Coursework Tracker

Paste this entire prompt to Claude Code to initialize the project.

---

## PROMPT

I want to build a React app called **Jordan's AI Builder Coursework Tracker**. This is a personal learning tracker for a 3-week intensive AI business building coursework.

Please scaffold and fully build this application. Here are the complete requirements:

---

### Setup

- Use **Vite + React**
- Use **React Router** for two routes: `/` (Jordan's view) and `/dad` (Dad's view)
- Use **localStorage** for all data persistence — no backend, no database, no auth
- For styling: use **Tailwind CSS**
- The app should be deployable as a static site

Initialize with: `npm create vite@latest jordan-coursework -- --template react`

---

### Routes

**`/` — Jordan's View**
- Arc selection on first load if no arc saved
- Full coursework checklist
- Can check off days
- Can add notes (posted as "Jordan")

**`/dad` — Dad's View**
- Same coursework, read-only checkboxes
- Can see all notes
- Can add notes (posted as "Dad")
- Shows overall progress prominently

---

### Arc Selection Screen
Shown only on `/` on first load when no arc is in localStorage.

Present these options as selectable cards Jordan picks from:
- Sports Betting AI
- AI Trading Assistant  
- Faceless Content Machine
- Fantasy Sports AI
- AI Lead Gen Tool
- AI Research Assistant
- Affiliate Automation
- AI Creator Dashboard
- AI Social Clip Generator

Save selected arc to localStorage key `"arc"`. After selection, show main coursework view. Include a small "change arc" link in the header (with a confirmation dialog before changing).

---

### Header
- App title: "Jordan's Builder Coursework"
- Arc badge showing selected arc (e.g. "Arc: Sports Betting AI")
- Progress bar: "X / 21 days complete" with a clean progress bar
- On `/dad` route show a subtle "Dad's View" label

---

### Coursework Data

Hardcode this coursework. Each day has: id, week, title, description.

```javascript
const CURRICULUM = [
  // WEEK 1
  { id: 0, week: 1, title: "Orientation + Dopamine", description: "Pick your arc, build your first AI agent, vibe code a mini golf game" },
  { id: 1, week: 1, title: "Understand the Stack", description: "Frontend vs backend, APIs, databases, cloud — the full map" },
  { id: 2, week: 1, title: "Build the Frontend", description: "React basics, components, state, first real UI" },
  { id: 3, week: 1, title: "Add Backend Logic", description: "Servers, API routes, your app talks to the internet" },
  { id: 4, week: 1, title: "Add AI", description: "LLMs, prompting, cost basics, your first AI-powered feature" },
  { id: 5, week: 1, title: "Deploy + Ship", description: "Hosting, domains, environment variables — go live" },
  { id: 6, week: 1, title: "Consolidation Sprint", description: "Catch up, polish, solidify what's shaky" },
  // WEEK 2
  { id: 7, week: 2, title: "Add a Database", description: "Persistence, tables, saving user data with Supabase" },
  { id: 8, week: 2, title: "Add Authentication", description: "Real user accounts, sessions, personalized experience" },
  { id: 9, week: 2, title: "Analytics + Tracking", description: "Funnels, retention, behavioral data — understand your users" },
  { id: 10, week: 2, title: "Add Monetization", description: "Stripe, subscriptions, pricing psychology, first payment flow" },
  { id: 11, week: 2, title: "Consolidation Sprint", description: "Catch up, test end-to-end, fix broken flows" },
  { id: 12, week: 2, title: "Agents + Automation", description: "Agentic workflows, scheduled tasks, autonomous AI actions" },
  { id: 13, week: 2, title: "Consolidation Sprint", description: "Polish, edge cases, make it feel real" },
  // WEEK 3
  { id: 14, week: 3, title: "Marketing Systems", description: "Landing page, SEO basics, email capture, customer acquisition" },
  { id: 15, week: 3, title: "Content Engine", description: "AI media generation, social distribution, automated posting" },
  { id: 16, week: 3, title: "Consolidation Sprint", description: "Catch up, stress test, fix embarrassing bugs" },
  { id: 17, week: 3, title: "Optimization + Scale", description: "Performance, cost, reliability — think like a founder" },
  { id: 18, week: 3, title: "Demo Day Prep", description: "Package it, write the pitch, record the demo" },
  { id: 19, week: 3, title: "Demo Day", description: "Live product review, what worked, what didn't, 90-day roadmap" },
  { id: 20, week: 3, title: "What's Next", description: "Advanced arcs, next projects, staying in builder mode" },
]
```

---

### Day Cards

Each day renders as a card with:

- **Week badge** (Week 1 / Week 2 / Week 3) — shown as section header when week changes
- **Day number** (Day 0, Day 1, etc.)
- **Title** (bold)
- **Description** (muted, one line)
- **Checkbox** — Jordan's view: clickable, saves completion + timestamp. Dad's view: visual only, not clickable.
- **"Current Day" indicator** — auto-detect as first incomplete day, give it a subtle left accent border in blue
- **Completed days** — slightly faded opacity, strikethrough on title, green checkmark
- **Expand/collapse toggle** — clicking anywhere on the card (or a chevron) expands the notes thread below

---

### Notes Thread

Expandable panel below each day card.

**Display:**
- Notes in chronological order
- Each note shows:
  - Author pill: "Jordan" (blue) or "Dad" (slate/gray)
  - Timestamp: formatted as "May 23, 2:34pm"
  - Note text

**Add note:**
- Textarea input + "Add Note" button at bottom of thread
- Jordan's view: saves with author `"jordan"`
- Dad's view: saves with author `"dad"`
- On submit: clear textarea, append note, persist to localStorage

---

### localStorage Schema

```javascript
// Key: "arc" — string
// Key: "days" — object keyed by day id (string)

{
  "arc": "Sports Betting AI",
  "days": {
    "1": {
      "completed": true,
      "completedAt": "2026-05-23T14:32:00.000Z",
      "notes": [
        {
          "id": "randomly-generated-id",
          "author": "jordan",
          "timestamp": "2026-05-23T14:32:00.000Z",
          "text": "Got the agent working"
        }
      ]
    }
  }
}
```

Days not yet interacted with don't need an entry — default to `{ completed: false, notes: [] }`.

---

### Design

- **Light mode only**
- **Background**: white or very light gray (#fafafa)
- **Text**: near-black (#111)
- **Accent**: deep blue (#1a3a5c) for current day border, Jordan note pill, progress bar fill
- **Dad accent**: slate (#64748b)
- **Font**: Use `'DM Mono'` or `'Space Mono'` from Google Fonts for day numbers/labels. Use a clean sans-serif like `'DM Sans'` or `'Outfit'` for body text. Import from Google Fonts.
- **Cards**: white background, 1px border (#e5e7eb), subtle box-shadow on hover
- **Current day card**: 3px left border in accent blue, very slightly elevated shadow
- **Completed cards**: 0.6 opacity, title has line-through
- **Week section headers**: uppercase, small, letter-spaced, muted — acts as a divider
- **Progress bar**: thin (6px), accent blue fill, gray track, rounded
- **Notes thread**: slightly inset background (#f8fafc), left border, padding
- **Jordan note pill**: blue background, white text
- **Dad note pill**: slate background, white text
- **No purple gradients. No AI slop aesthetics. No Inter font.**
- **Animations**: smooth expand/collapse for notes (CSS transition). Checkbox gets a subtle scale animation on check.

---

### File Structure

```
jordan-coursework/
  src/
    App.jsx
    main.jsx
    components/
      Header.jsx
      ArcSelector.jsx
      DayCard.jsx
      NotesThread.jsx
      ProgressBar.jsx
    hooks/
      useTrackerData.js
    data/
      coursework.js
    styles/
      index.css
  index.html
  vite.config.js
  package.json
  tailwind.config.js
```

---

### Implementation Notes

- Put all localStorage read/write logic in `useTrackerData.js` custom hook
- Export a clean API from the hook: `{ arc, setArc, days, markComplete, addNote }`
- Determine current route with `useLocation()` from react-router-dom — pass `isDAD` boolean prop down to components
- Use `crypto.randomUUID()` for note IDs
- Format timestamps with `new Intl.DateTimeFormat` — no external date libraries
- Keep components small and single-purpose

---

### Deliverable

Fully working app. All features implemented. Runs with `npm run dev`. No placeholder components, no TODOs left in code. The app should look polished enough that a 20-year-old would not be embarrassed to show it to someone.
