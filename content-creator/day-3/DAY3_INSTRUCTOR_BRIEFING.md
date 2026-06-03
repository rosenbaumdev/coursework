# Day 3 — Instructor Briefing
## Content Business — First Content Made + Faceless Video Setup

---

## Session Goal

Student produces her first 3 finished, post-ready pieces of content using AI-generated scripts and free faceless video tools. By end of session she has real content she could post today.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Faceless Video Toolkit | Tools chosen, installed/accessed |
| 2 | Brand Visuals | Colors, fonts, and visual identity created in Canva |
| 3 | First Script → Video | One complete video produced |
| 4 | Content Batch | Two more videos produced |
| 5 | Quality Review | All three reviewed against brand standards |
| 6 | Day 3 Close | CLAUDE.md updated |

---

## Phase 1 — Faceless Video Toolkit (15 min)

**The faceless video stack (all free to start):**

| Tool | Purpose | Cost |
|------|---------|------|
| CapCut (web or desktop) | Video editing, text overlays, auto-captions | Free / $10/mo Pro |
| Canva | Thumbnails, static graphics, templates | Free / $15/mo Pro |
| Pexels / Pixabay | Free stock video footage (B-roll) | Free |
| ElevenLabs | AI voiceover | Free (10k chars/mo) → $5/mo |
| TikTok's own text-to-speech | Built-in, free, no setup | Free |

**Start with free tier everything:**

> "We don't spend money until the content is working. Today we use TikTok's native text-to-speech or your own voice (no face required — just audio). We use free stock footage for visuals. We use Canva free for any graphics. This keeps us at $0 until we know what's working."

**Install/access:**

1. CapCut — capcut.com → sign up free
2. Canva — canva.com → sign up free (use school email for free Pro)
3. Pexels — pexels.com (no account needed for downloads)
4. ElevenLabs — elevenlabs.io → sign up free (get voice ID set up)

**ElevenLabs voice setup:**

> "ElevenLabs lets you clone a voice or pick from pre-made voices. For faceless content, pick a voice that matches your brand — warm, clear, confident. You're not cloning your own voice yet, just picking a style. Later if you want YOUR voice without showing your face, you can clone it."

Have her listen to 3-4 ElevenLabs voices and pick one. Write the voice ID in CLAUDE.md.

---

## Phase 2 — Brand Visuals in Canva (15 min)

**She needs visual consistency before she makes any content:**

> "Before you make a single video, you need your brand colors and fonts locked. Consistent visuals = recognizable brand. Someone who sees your video 6 months from now should instantly know it's you without reading the name."

**In Canva:**

1. Create a Brand Kit (free on Canva):
   - 2 primary colors (pull from the feeling of her brand — warm/earthy? clean/clinical? bold/energetic?)
   - 1 accent color
   - 2 fonts: one for headers (bold, readable), one for body text

2. Create a video template:
   - 1080 x 1920px (TikTok/Reels vertical)
   - Brand color background or gradient
   - Text overlay positions marked
   - Lower third for her handle

3. Create a thumbnail template:
   - Same dimensions
   - Hook text in large font
   - Consistent placement

**Ask her:**

> "When you look at your brand colors, does it feel like the woman you're serving? Or does it feel like what you think a wellness brand 'should' look like? Those are different things. Pick what feels like her."

Common palette directions for this niche:
- Warm terracotta + cream + dusty sage = earthy, grounded
- Deep plum + blush + gold = feminine but serious
- Clean navy + white + warm coral = modern, medical-adjacent but approachable

---

## Phase 3 — First Script → Video (20 min)

**Choose the best script from yesterday's pipeline. If none were generated, run one now:**

```bash
node scripts/hook-generator.js "[her top topic from the calendar]"
# pick best hook
node scripts/script-writer.js "[hook]" "[topic]"
```

**The faceless video workflow:**

**Step 1: Voiceover**

Option A (ElevenLabs):
- Open ElevenLabs → paste script → generate audio → download MP3

Option B (Her own voice, no face):
- Phone voice memo app → read script → AirDrop to laptop
- This is actually the better option for authenticity — voice builds connection even without face

> "Here's a truth: your own voice, even faceless, builds a stronger audience than AI voice. If you're comfortable recording audio-only, do it. You don't need to show your face. You need to show your personality."

**Step 2: B-roll footage**

Go to pexels.com and search terms related to the content:
- Perimenopause content: search "woman thinking," "morning routine," "doctor appointment," "woman nature"
- Identity content: search "woman freedom," "journaling," "coffee morning," "woman confident"

Download 4-6 clips. They don't need to be perfect — they need to be aesthetically consistent.

**Step 3: Assemble in CapCut**

```
New project → import voiceover → add B-roll clips
→ add text overlays (key phrases from script)
→ add captions (CapCut auto-caption feature)
→ add your brand template lower third
→ export as MP4
```

**CapCut auto-caption is essential:**

> "85% of TikTok is watched without sound. Captions are not optional. CapCut generates them automatically — review them for accuracy, especially on medical/technical terms."

---

## Phase 4 — Content Batch (15 min)

**Make two more videos in the same session:**

> "Batching is how real creators stay consistent. You're already in the creative headspace. You have the tools open. Make 2 more while you're here."

Pick two more topics from Week 1 calendar. Run them through the pipeline. Assemble quickly — these don't need to be as polished as the first. Speed and consistency beat perfection.

**The quality floor vs. ceiling:**

> "Quality floor: captions are correct, audio is clear, text is readable. Quality ceiling: beautiful, cinematic, perfect. On TikTok and Reels, the floor is what matters for growth. A 7/10 video posted consistently beats a 10/10 video posted sporadically. Always."

---

## Phase 5 — Quality Review (5 min)

**Watch all three together:**

For each:
- Does the hook land in the first 2 seconds visually?
- Is the audio clear?
- Can you read the text on screen?
- Does it sound like the brand voice?
- Would YOU follow this account based on this video?

**The follower test:**

> "Imagine you're a woman in your target audience who has never seen this account. You stumble on this video. Do you hit follow? Why or why not? Be honest."

---

## Phase 6 — Day 3 Close (5 min)

**What she has:**
- 3 finished videos ready to post
- Brand visual templates in Canva
- A video production workflow she can repeat

**Decision: when to post:**

> "You have three videos. Do NOT post them all today. Spread them out: post one today, one tomorrow, one the day after. Accounts that post consistently every day grow faster than accounts that post in bursts. Start the cadence now."

**Set accounts up if not done:**
- Create TikTok account with brand name
- Create Instagram account with brand name
- Write bio: "[What you do] for [who you serve]. [What they'll get]. [Handle]"

**Update CLAUDE.md:**

```markdown
### Day 3 — [date]
Built: video production workflow, brand visuals in Canva
Created: 3 videos (topics: X, Y, Z)
Posted: [which one posted today]
ElevenLabs voice: [voice name/ID]
Canva brand kit: [color codes]
Next: Day 4 — research pipeline and trend monitoring
```

---

## Failure Modes

**CapCut is confusing**
It's genuinely complex for beginners. Stay in the simplified workflow: import audio → import video → add text → add captions → export. Don't try every feature on Day 3.

**Student hates how she sounds on audio**
Universal feeling. > "Every podcaster and voice-over artist said the same thing the first time they heard themselves. Your audience won't have the same reaction you do — they don't have a reference point for how you 'should' sound. Record it, use it, move on."

**ElevenLabs free tier runs out**
10,000 characters is roughly 7-8 scripts. For now, switch to TikTok's built-in TTS or her own voice. Upgrade to $5/mo when content is getting traction.

**Videos look low quality**
Usually lighting on B-roll doesn't match, or text font is too small. Fix: pick B-roll with similar color temperature, increase font size to at least 48pt on mobile.

**She wants to film herself instead of going faceless**
Support it. > "Then put your phone on a tripod, frame it from the chest up, and film. Faced content is not harder — it just feels more exposed. If you're ready for it, it's usually better." Adjust the workflow accordingly.