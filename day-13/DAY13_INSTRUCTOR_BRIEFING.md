# Day 13 — Instructor Briefing
## Sports Betting AI — Email Delivery System

---

## Session Goal

Jordan builds the morning email digest. Subscribers receive today's picks at 8am automatically.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Email Design | What the email looks like |
| 2 | Build the Email | HTML email template |
| 3 | Sendgrid/Nodemailer Setup | Email delivery infrastructure |
| 4 | Subscriber List | Pull active subscribers |
| 5 | Scheduler Integration | 8am automated send |
| 6 | Day 13 Close | CLAUDE.md updated |

---

## Phase 1 — Email Design (10 min)

**Ask Jordan:**

> "You're a subscriber. You wake up Sunday at 7:45am. You open an email from this service. What does the perfect email look like?"

Elements he should describe:
- Today's picks at the top — clear and easy to read
- Confidence rating
- The line to bet and where to bet it
- Key reasoning (brief — not the full analysis)
- Record/performance below

**HTML email constraints:**

> "Email HTML is stuck in 2005. Gmail strips CSS classes. No flexbox. No grid. Table-based layouts only. It sounds terrible — it is terrible — but Claude Code handles it."

---

## Phase 2 — Build the Email Template (15 min)

**Prompt Claude Code:**

```
Build delivery/email-template.js — generates HTML email for picks digest.

Export function: generateEmail(data) → HTML string

Email data structure:
{
  date: "Sunday, December 14",
  picks: [ ... today's picks ... ],
  record: { wins, losses, pushes, win_rate },
  roi: float
}

Email must:
- Use table-based layout (Gmail compatible)
- Work in dark AND light mode email clients
- Be mobile-responsive (max-width: 600px)
- Inline all CSS (no stylesheets — email clients strip them)

Sections:
1. Header: "⚡ Edge Finder — [Date]"
2. Record bar: "Season Record: X-Y-Z (X% ATS) | ROI: +X%"
3. For each pick:
   - Matchup (bold, large)
   - Pick: "CHIEFS -3.5 at DraftKings (-110)"
   - Confidence: X/10 ★★★★★★★★░░
   - Units: "Bet: 1.5 units"
   - Key reason: one sentence from reasoning field
4. NO BET games (collapsed, less prominent):
   - "Passing on [N] games today (insufficient edge)"
5. Footer: 
   - Link to full analysis on website
   - Unsubscribe link
   - "Bet responsibly. This is not financial advice."

Generate a test email: node delivery/email-template.js > test-email.html
Then open test-email.html in browser to preview.
```

---

## Phase 3 — Email Delivery Setup (15 min)

**Use Nodemailer with Gmail (simplest for launch):**

```bash
npm install nodemailer
```

**Gmail setup:**
1. Google Account → Security → 2-Step Verification → App Passwords
2. Generate app password for "Mail"
3. Add to .env:
   ```
   EMAIL_FROM=jordan@gmail.com
   EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

**Prompt Claude Code:**

```
Build delivery/email-sender.js

Export async function sendPicksDigest(subscriberEmails, picksData):
1. Generate HTML using email-template.js
2. Send via Nodemailer with Gmail SMTP:
   - host: smtp.gmail.com
   - port: 587
   - auth: EMAIL_FROM + EMAIL_APP_PASSWORD from .env
3. Send individually to each subscriber (not BCC)
   Why: personalized unsubscribe links, better deliverability
4. Log: "Sent to [email] — [success/failure]"
5. Return: { sent: N, failed: N, errors: [...] }

Also build: scripts/get-subscribers.js
Reads data/users.json
Returns emails of users where subscription_status === 'active' 
OR trial_ends_at is in the future
```

---

## Phase 4 — Scheduler Integration (5 min)

**Add to scheduler.js:**

```
8:45 AM daily — after picks are generated:

import { sendPicksDigest } from '../delivery/email-sender.js'
import { getSubscribers } from '../scripts/get-subscribers.js'

const subscribers = await getSubscribers()
const picksData = // read from latest picks output
await sendPicksDigest(subscribers, picksData)
log(`Digest sent to ${subscribers.length} subscribers`)
```

**Test it:**

```bash
# Send a test email to yourself
node -e "
const { sendPicksDigest } = require('./delivery/email-sender');
sendPicksDigest(['your@email.com'], mockData);
"
```

---

## Phase 5 — Day 13 Close (5 min)

**The product is now:**
- Automated data collection
- AI picks analysis
- Web dashboard with paywall
- Morning email digest

> "One more day. Tomorrow we deploy it to the internet so it runs even when your laptop is off. Then it's a real product on the real internet."

**Update CLAUDE.md.**