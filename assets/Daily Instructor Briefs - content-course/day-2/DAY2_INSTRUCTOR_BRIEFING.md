# Day 2 — Instructor Briefing
## Content Business — AI Content Pipeline Setup

---

## Session Goal

Student builds an AI-powered content pipeline that generates scripts, hooks, captions, and content ideas on demand. By end of session she can produce a week's worth of content concepts in under 10 minutes.

---

## Context Check

> "Open your CLAUDE.md. Read me your mission sentence and your four content pillars."

She should know these cold. If she's fuzzy, spend 5 minutes reviewing. If she wants to adjust something from yesterday — allow one small change, not a full re-do.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | The Content Machine Concept | Student understands what she's building |
| 2 | Tool Setup | Node.js, Claude Code, Anthropic API ready |
| 3 | Hook Generator | hook-generator.js — creates viral opening lines |
| 4 | Script Writer | script-writer.js — full video scripts from topics |
| 5 | Caption + Hashtag Engine | caption-engine.js — platform-optimized captions |
| 6 | Content Calendar Generator | calendar-generator.js — weekly plan |
| 7 | Day 2 Close | CLAUDE.md updated |

---

## Phase 1 — The Content Machine Concept (10 min)

**Open with:**

> "The biggest problem content creators have isn't talent — it's consistency. Posting 5 times a week forever requires an endless supply of ideas, scripts, and captions. Most people burn out by week 6. We're going to build a machine that makes consistency easy. You still do the creative work — you edit, you decide, you have taste. The AI does the grunt work of generating first drafts. You curate and refine."

**Draw the machine:**

```
YOUR BRAIN
(pillar, topic, angle)
        ↓
  Hook Generator
  (5 opening lines to choose from)
        ↓
  Script Writer
  (30-60 second video script)
        ↓
  Caption Engine
  (TikTok caption + Instagram caption + hashtags)
        ↓
  YOU
  (record, edit, post)
        ↓
  Content Calendar
  (what posts on what day)
```

> "You're the creative director. The AI is the first-draft writer who never gets tired, never gets writer's block, and never calls in sick. You wouldn't publish a first draft from a human writer without editing it — same rule here. Every output goes through your filter."

**The speed math:**

> "Without AI: content idea → script → caption might take 45-60 minutes per piece. With this pipeline: 5-10 minutes per piece. That's what makes 5x/week sustainable."

---

## Phase 2 — Tool Setup (10 min)

**Check what's already installed from Day 0:**

```bash
node --version
claude --version
```

If not installed, follow Day 0 setup process (Node → Claude Code → authenticate).

**Set up the project:**

```bash
cd ~/Desktop/content-business
npm init -y
npm install dotenv @anthropic-ai/sdk
touch .env
open .env
```

**.env contents:**

```
ANTHROPIC_API_KEY=your_key_here
```

**Create .gitignore:**

```
.env
node_modules/
```

**Explain the cost:**

> "Every script we generate costs roughly $0.01-0.03 in Anthropic API credits. A week of content — 5 scripts — costs about $0.10. A month is $0.40. That's nearly free. The tools we'll add later for video and voiceover are where the real costs are."

---

## Phase 3 — Hook Generator (20 min)

**The hook is everything:**

> "On TikTok and Reels, you have 1-3 seconds before someone scrolls past. The hook — your opening line — is the entire game. A great hook on mediocre content outperforms great content with a weak hook. We're going to build a machine that generates 5 different hooks for any topic so you always have options."

**Create the prompt file:**

```bash
mkdir scripts/prompts
touch scripts/prompts/hook-generator.md
open scripts/prompts/hook-generator.md
```

**Write it together — have her contribute:**

```markdown
# Hook Generator Prompt
Model: Claude Sonnet
Task: Generate TikTok/Reels hooks for women's health and identity content

You are a viral content strategist specializing in short-form video 
for women navigating hormonal transitions and identity shifts in midlife.

You understand these hook formulas work best for this audience:
- The Revelation: "Nobody told me that [surprising truth]"
- The Validation: "If you've ever felt [relatable feeling], this is for you"
- The Myth Bust: "Stop believing [common misconception] — here's the truth"
- The Stat: "[Surprising statistic] and nobody's talking about it"
- The Before/After: "I used to [struggle] until I understood [insight]"
- The Direct Call: "This is for the woman who [specific situation]"
- The Cliffhanger: "[Intriguing statement] — and it's not what you think"

Brand voice: [pull from student's voice profile]
Audience: [pull from student's target woman description]
Content pillars: [pull from brand bible]

Input: A topic or content idea
Output: Exactly 5 hooks. Number them 1-5. Each hook is 1-2 sentences max.
No preamble. No explanation. Just the 5 hooks.
Format each hook on its own line with its number.
```

**Prompt Claude Code:**

```
Build scripts/hook-generator.js

Reads the prompt from scripts/prompts/hook-generator.md

Takes a topic as command-line argument:
node scripts/hook-generator.js "brain fog and perimenopause"

Calls Anthropic API (claude-sonnet-4-5) with:
- System prompt: contents of hook-generator.md
- User message: "Generate 5 hooks for this topic: [topic]"
- max_tokens: 500
- temperature: 0.8 (we want variety and creativity here)

Prints the 5 hooks cleanly to console.
Also saves to content/hooks_{topic_slug}_{timestamp}.txt
(topic_slug = topic with spaces replaced by underscores, lowercase)

Error handling: missing API key, API failure, empty topic.
```

**Test it:**

```bash
node scripts/hook-generator.js "the moment I realized perimenopause starts in your 30s"
```

Review the output together. Pick the best hook. Discuss why it works.

> "See hook #3? That one makes me want to keep watching because it's doing the myth-bust and it's personal at the same time. That's the one. Now — what would you change about it to make it more YOUR voice?"

Have her edit it. This is the curation step.

---

## Phase 4 — Script Writer (20 min)

**Create the prompt:**

```bash
touch scripts/prompts/script-writer.md
```

```markdown
# Script Writer Prompt
Model: Claude Sonnet
Task: Write short-form video scripts for women's health/identity content

You write scripts for faceless short-form video (TikTok/Reels).
Target length: 45-75 seconds when spoken at a natural pace.
That equals approximately 120-200 words.

Script structure (always follow this):
1. HOOK (first line — use the provided hook exactly)
2. SETUP (2-3 sentences: why this matters, who it's for)
3. CORE (the actual value — 3-5 punchy points or one narrative arc)
4. LANDING (one strong closing line that creates desire to follow or save)
5. CTA (one of: "Follow for more", "Save this", "Comment [word] if this is you")

Rules:
- Write conversationally. This is SPOKEN, not read.
- Short sentences. One idea per sentence.
- No jargon unless the audience uses it themselves.
- No hedging ("might", "could", "some people"). Be direct.
- The core section should be SPECIFIC, not vague.
  Bad: "Your hormones affect your mood."
  Good: "Estrogen drops in your late 30s. When it drops, serotonin drops with it. That's why you cry at commercials and snap at people you love — it's not you going crazy, it's chemistry."
- End with one line that makes them want more.

Brand voice: [from brand bible]
Audience: [from brand bible]

Input: A hook + topic
Output: Full script labeled with sections [HOOK], [SETUP], [CORE], [LANDING], [CTA]
```

**Prompt Claude Code:**

```
Build scripts/script-writer.js

Takes two arguments:
1. The hook (in quotes)
2. The topic/angle (in quotes)

node scripts/script-writer.js "Nobody told me perimenopause starts in your 30s" "early perimenopause symptoms most women miss"

Reads system prompt from scripts/prompts/script-writer.md

Calls Anthropic API:
- temperature: 0.7
- max_tokens: 800

Prints the script with clear section labels.
Saves to content/scripts/script_{timestamp}.md
Format saved file as:
  HOOK: ...
  TOPIC: ...
  DATE: ...
  ---
  [full script]
```

**Test it using the best hook from Phase 3:**

```bash
node scripts/script-writer.js "[best hook from phase 3]" "[topic]"
```

**Debrief the script:**

> "Read this out loud. Right now. Actually read it aloud."

She does. Then:

> "Where did it feel unnatural? Where did you stumble? Mark those spots. When you edit a script, you're not fixing grammar — you're fixing the speaking rhythm. If you stumble reading it, viewers will stumble hearing it."

Have her edit 2-3 lines. This is her voice going into the machine's output.

---

## Phase 5 — Caption + Hashtag Engine (15 min)

**TikTok and Instagram captions are different:**

> "TikTok captions are short — often just the hook or a single line. The algorithm reads them but users mostly don't. Instagram captions can be longer and actually get read — they're relationship-building. We'll generate both."

**Create prompt:**

```bash
touch scripts/prompts/caption-engine.md
```

```markdown
# Caption + Hashtag Engine
Model: Claude Sonnet
Task: Generate platform-optimized captions and hashtags

Generate TWO captions and one hashtag set for a short-form video.

TIKTOK CAPTION:
- Max 150 characters
- Often just the hook or a one-liner
- May include 1-2 emojis if they fit naturally
- End with one relevant hashtag embedded in the text
  e.g. "Nobody prepared me for this part of #perimenopause"

INSTAGRAM CAPTION:
- 3-5 sentences
- First sentence = the hook (makes them click "more")
- Body = the core insight restated conversationally
- End with a question that invites comments
- Tone matches brand voice

HASHTAG SET (for Instagram post):
- 15-20 hashtags
- Mix of: large (1M+), medium (100K-1M), small (10K-100K)
- All relevant to content and audience
- Format as one line: #tag1 #tag2 #tag3...

Input: The script (hook + core content)
Output: 
TIKTOK:
[caption]

INSTAGRAM:
[caption]

HASHTAGS:
[hashtag line]
```

**Prompt Claude Code:**

```
Build scripts/caption-engine.js

Takes script file path as argument:
node scripts/caption-engine.js content/scripts/script_[timestamp].md

Reads the script file.
Reads prompt from scripts/prompts/caption-engine.md.
Calls Anthropic API (temperature: 0.7).

Prints TikTok caption, Instagram caption, hashtag set.
Saves to content/captions/captions_{timestamp}.md
Appends the captions to the corresponding script file too:
add a section at the bottom: --- CAPTIONS ---
```

---

## Phase 6 — Content Calendar Generator (10 min)

**Tie it all together:**

```bash
touch scripts/prompts/calendar-generator.md
```

```markdown
# Content Calendar Generator
Model: Claude Sonnet
Task: Generate a week of content ideas for short-form video

Generate a 7-day content calendar (5 posting days, 2 rest days).
Each posting day = one piece of content.

For each content day, provide:
- Day and date
- Platform (TikTok or Instagram — alternate)
- Content pillar (rotate through all 4 pillars)
- Topic/angle (specific, not generic)
- Hook concept (one sentence, not the full hook)
- Content type: Educational / Story / List / Myth-bust / Response / Poll

Rules:
- Vary the content type — don't repeat the same type two days in a row
- One "vulnerable/personal" piece per week
- One "highly shareable/informational" piece per week
- One "direct CTA to follow or save" piece per week
- Topics should feel like a natural progression, not random

Brand pillars: [from brand bible]
Voice: [from brand bible]
Audience: [from brand bible]

Input: Week number + any specific topics to include
Output: Clean 7-day table. Day | Platform | Pillar | Topic | Hook Concept | Type
```

**Prompt Claude Code:**

```
Build scripts/calendar-generator.js

Usage:
node scripts/calendar-generator.js --week 1 --include "brain fog,identity after kids"

Reads prompt from scripts/prompts/calendar-generator.md
Calls API (temperature: 0.8 for creative variety)
Prints calendar as formatted table.
Saves to content/calendars/week_{N}_{timestamp}.md
```

**Run it:**

```bash
node scripts/calendar-generator.js --week 1
```

Review the calendar together. Have her:
1. Remove any topic she hates
2. Swap any pillar that's unbalanced
3. Flag which 2-3 she's most excited to make

---

## Phase 7 — Day 2 Close (5 min)

**What she built today:**
- `scripts/hook-generator.js`
- `scripts/script-writer.js`
- `scripts/caption-engine.js`
- `scripts/calendar-generator.js`
- Prompt files for each

**The pipeline in one command sequence:**

```bash
node scripts/calendar-generator.js --week 1
# Pick a topic from the calendar
node scripts/hook-generator.js "topic"
# Pick best hook
node scripts/script-writer.js "hook" "topic"
# Edit the script
node scripts/caption-engine.js content/scripts/script_[timestamp].md
# Done. Record it.
```

**Cost check:**

> "How much did all of that cost? Open .env and look at your API key on console.anthropic.com under 'Usage.' It should be pennies. That's the whole week of content generation — pennies."

**Update CLAUDE.md.**

**Tomorrow:**

> "Tomorrow we make your first actual piece of content. Not a draft. A finished, post-ready video. We'll set up the faceless video tools and you'll produce something you could put live today."

---

## Failure Modes

**Scripts feel generic despite brand voice in prompt**
The brand voice section of the prompt is probably too vague. Open hook-generator.md and add 3 specific example phrases she actually uses. Specific examples beat vague descriptors every time. "Warm and direct" is vague. "Talks like she's texting her best friend who happens to be a hormone specialist" is useful.

**She wants to rewrite the whole script herself**
Perfect. That's the goal. Redirect: "The AI gave you a first draft in 30 seconds. You're now making it yours. That's exactly how this is supposed to work."

**Calendar topics feel repetitive**
Add more specificity to the pillar descriptions in the prompt. Instead of "hormonal health," write "specific symptoms women don't connect to hormones: rage, forgetfulness, insomnia, itchy skin."

**Student is overwhelmed by the number of scripts**
Remind her: she doesn't need to use everything. The machine generates options. She picks what resonates. "Think of it like a buffet — you don't eat everything, you pick what looks good."
