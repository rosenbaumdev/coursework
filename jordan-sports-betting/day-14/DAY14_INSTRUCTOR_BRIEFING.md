# Day 14 — Instructor Briefing
## Sports Betting AI — Deployment

---

## Session Goal

Jordan deploys the product to a real server. By end of session the website is accessible at a real URL and the pipeline runs 24/7 without his laptop.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Deployment Architecture | Where and how it runs |
| 2 | Railway/Render Setup | Free/cheap hosting configured |
| 3 | Environment Variables | Secrets management on server |
| 4 | Deploy and Test | Live URL, pipeline running |
| 5 | Domain (optional) | Custom domain if time permits |
| 6 | Day 14 Close | CLAUDE.md updated |

---

## Phase 1 — Deployment Architecture (10 min)

**The options:**

| Platform | Cost | Pros | Cons |
|----------|------|------|------|
| Railway | $5/mo | Simple, good free tier, persistent storage | New-ish platform |
| Render | $7/mo | Reliable, good docs | Free tier sleeps |
| DigitalOcean | $6/mo | Full control | More setup |
| Vercel | Free | Ultra-easy | No persistent storage — won't work for our file-based data |

**Recommendation: Railway**

> "Railway is the right choice for this project. It supports persistent file storage (we need this for our JSON data files), runs long-running processes (we need this for the scheduler), and the free tier is enough to launch with."

**What we're deploying:**
- The Express server (`delivery/server.js`)
- The scheduler (`scripts/scheduler.js`)
- All data files (persistent volume)

**What stays local:**
- Development environment
- Prompt iteration

---

## Phase 2 — Railway Setup (20 min)

**Go to railway.app:**

1. Sign up with GitHub
2. New Project → Deploy from GitHub repo
3. If code isn't on GitHub yet: 

```bash
cd ~/Desktop/sports-betting-ai
git init
git add .
git commit -m "Initial commit — Sports Betting AI"
```

> "We need to add a .gitignore first so we don't push API keys:"

```bash
touch .gitignore
```

```
# .gitignore
.env
node_modules/
data/raw/
data/processed/
data/cache/
data/ledger/
intelligence/outputs/
```

> "Notice: data folders are gitignored. On the server, the pipeline will recreate these from scratch. We're only deploying the code, not the data."

4. Push to GitHub
5. In Railway: connect the repo
6. Set start command: `node delivery/server.js`

---

## Phase 3 — Environment Variables (10 min)

**In Railway dashboard → Variables:**

Add every variable from your .env:
```
ANTHROPIC_API_KEY=...
THE_ODDS_API_KEY=...
NEWS_API_KEY=...
BRAVE_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID=...
JWT_SECRET=...
EMAIL_FROM=...
EMAIL_APP_PASSWORD=...
NODE_ENV=production
```

> "Environment variables on the server replace your .env file. They're stored encrypted and never visible in your code. This is how production apps handle secrets."

**Update server.js to also start the scheduler:**

```javascript
// In server.js, after app.listen():
if (process.env.NODE_ENV === 'production') {
  require('./scripts/scheduler.js'); // Start scheduler in production
}
```

---

## Phase 4 — Deploy and Test (15 min)

**Deploy:**

Railway auto-deploys when you push to GitHub.

```bash
git add .
git commit -m "Add production config"
git push
```

Watch Railway build logs. Common issues:
- Missing npm packages: check package.json has all dependencies
- Port issue: Railway sets PORT env variable — update server.js: `const PORT = process.env.PORT || 3000`

**Test the live URL:**
1. Open Railway URL in browser
2. Verify dashboard loads
3. Test login/register
4. Verify /api/data returns data
5. Manually trigger pipeline: POST to /run-pipeline

**Update Stripe webhook:**

In Stripe dashboard → Webhooks → Add endpoint:
`https://your-railway-url.com/webhook/stripe`

---

## Phase 5 — Domain (Optional, 10 min if time)

**If Jordan wants a real domain:**

1. Go to namecheap.com — domains cost $8-15/year
2. Buy a domain (suggest: edgefinder.ai, sharplines.io, or similar)
3. In Railway → Settings → Custom Domain → add domain
4. Update Namecheap DNS to point to Railway

> "The domain makes it real. 'edgefinder.ai' is a product. 'railway-app-abc123.up.railway.app' is a demo."

---

## Phase 6 — Day 14 Close (5 min)

**The product is live on the internet.**

> "Your laptop can be closed. The pipeline runs on Railway's servers. Picks generate every morning. Email goes out to subscribers. Anyone with the URL can subscribe and pay you. That's a live product."

**Update CLAUDE.md with the live URL.**

**Tomorrow: launch. Real users. Final review.**