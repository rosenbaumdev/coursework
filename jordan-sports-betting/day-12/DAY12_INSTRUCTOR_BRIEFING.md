# Day 12 — Instructor Briefing
## Sports Betting AI — Auth + Subscription Paywall

---

## Session Goal

Jordan adds user authentication and a Stripe subscription paywall. By end of session the product requires payment to access picks.

**Important: This is complex. Adjust pace. Don't rush auth.**

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Monetization Design | Pricing, tiers, what's free vs. paid |
| 2 | Stripe Setup | Account, products, price IDs |
| 3 | Auth Layer | Simple email/password auth with JWT |
| 4 | Paywall Integration | Free preview vs. subscriber view |
| 5 | Day 12 Close | CLAUDE.md updated |

---

## Phase 1 — Monetization Design (10 min)

**Have Jordan design the pricing:**

> "You need to decide what people pay for. Three questions: What's free? What's paid? How much?"

**Guide toward a freemium model:**

```
FREE (no account required):
- Today's NO_BET games (shows why you're NOT betting)
- Win/loss record (the proof)
- Performance stats (builds trust)

PAID ($19-29/month):
- All picks with full reasoning
- Confidence ratings
- Best line and which book
- Email digest (tomorrow's picks, delivered 8am)
- Full pick history

Why this works:
- Free tier shows proof of concept → builds trust
- Paid tier delivers the actual value → justifies cost
- Showing NO_BETs is counterintuitive but powerful — 
  it proves the system isn't picking everything
```

> "What are you pricing at? Your call."

---

## Phase 2 — Stripe Setup (15 min)

**Set up Stripe:**

1. Go to stripe.com → Create account (use personal info for now)
2. Go to Dashboard → Products → Add product
3. Create: "Sports Betting AI — Monthly"
4. Price: $[Jordan's number]/month recurring
5. Copy the Price ID (starts with `price_`)
6. Copy the API keys from Developers → API Keys
7. Add to .env:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=(get this after setting up webhook)
   ```

```bash
npm install stripe
```

> "Use test mode for now — Stripe test cards work but no real money moves. We switch to live mode on launch day."

---

## Phase 3 — Auth Layer (20 min)

**Keep it simple — no OAuth, no third-party services:**

```bash
npm install jsonwebtoken bcryptjs
```

**Prompt Claude Code:**

```
Add authentication to delivery/server.js.

Use a simple file-based user store: data/users.json (array of user objects)
This is fine for the launch. We can move to a database later.

User object:
{
  "id": "uuid",
  "email": "...",
  "password_hash": "bcrypt hash",
  "stripe_customer_id": "cus_...",
  "subscription_status": "active|inactive|trial",
  "trial_ends_at": "ISO date (7 day trial)",
  "created_at": "ISO date"
}

Routes to add:

POST /auth/register
  - Accept: { email, password }
  - Hash password with bcrypt (saltRounds: 10)
  - Create Stripe customer
  - Save user with 7-day trial
  - Return JWT token

POST /auth/login
  - Accept: { email, password }
  - Verify password
  - Return JWT token

GET /auth/me
  - Requires valid JWT header: Authorization: Bearer [token]
  - Return user object (no password hash)

Middleware:
function requireAuth(req, res, next) {
  // Verify JWT token
  // Attach user to req.user
  // Return 401 if missing/invalid
}

function requireSubscription(req, res, next) {
  // Check req.user.subscription_status === 'active' || trial active
  // Return 402 if not subscribed
}

JWT secret in .env: JWT_SECRET=random_string_here
JWT expires: 7 days
```

---

## Phase 4 — Paywall Integration (15 min)

**Protect the picks:**

```
Update /api/data route:

Without auth:
  Return: record stats, performance, NO_BET games only
  Add: { "upgrade_prompt": "Subscribe to see today's X picks" }

With auth + active subscription:
  Return: full data including all picks with reasoning

With auth + no subscription:
  Return: first pick only (teaser), rest redacted
  Add: { "subscription_required": true, "price": "$X/month" }
```

**Update index.html:**

```
Add:
- Login/Register modal
- If not logged in: show subscribe button where picks would be
- If logged in but not subscribed: show upgrade button + teaser pick
- If subscribed: show all picks

Add Stripe checkout:
- "Subscribe Now" button → POST /create-checkout-session → redirect to Stripe
```

**Add checkout endpoint:**

```
POST /create-checkout-session
  - Create Stripe checkout session
  - success_url: http://localhost:3000?session_id={CHECKOUT_SESSION_ID}
  - cancel_url: http://localhost:3000
  - Return: { url: checkout_url }
```

---

## Phase 5 — Day 12 Close (5 min)

**Test the full flow:**
1. Register new account
2. Verify trial access works
3. Test Stripe checkout (use test card: 4242 4242 4242 4242)
4. Verify subscription status updates
5. Verify picks unlock after payment

**What Jordan built today:**
- User authentication (register/login/JWT)
- Stripe subscription integration
- Freemium paywall

**Update CLAUDE.md.**

> "Tomorrow: email. Every subscriber gets today's picks in their inbox at 8am. That's when it becomes a service, not just a website."