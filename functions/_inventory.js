// Per-course INTERVIEW PACKS.
//
// A pack is everything course-SPECIFIC the generic engine needs:
//   - inventoryMd   : the objective inventory, authored as a markdown checklist
//   - framing       : what this course is + who reads the summary (base-prompt
//                     content, not methodology)
//   - profileSchema : the shape of the synthesized profile document
//
// The engine (_interview.js) is content-agnostic: envelope, tick/table state
// machine, drift gate, streaming, pacing, persistence, and synthesis all read
// their course specifics from the pack. A NEW COURSE = add one pack entry here;
// zero engine changes.
//
// Inventory line grammar under a `## Section` header:
//   - [ ] <R|B> <id> — <what "captured" means>
// R = required (blocks completion). B = bonus (captured if it comes up; never
// forces the interview to drag). `id` is stable and used by [TICK:]/[TABLE:].

const NOOB_TO_AI_ENTREPRENEUR = {
  inventoryMd: `
## 1. Orientation & Permission
- [ ] R orient.ready — He gets that this is not a test, knows Dad sees a summary (not a transcript), and has said "go."

## 2. Technical Baseline
- [ ] R know.handson — His real hands-on build experience: what he's actually made, tools he's touched.
- [ ] R know.map — Rough grasp of the systems map (front/back end, client/server, database, auth, cloud vs local, hardware vs software, UX/UI), each as understood / partial / not-yet. Accept guesses neutrally.

## 3. Worldview Right Now
- [ ] R world.ai — How he sees AI and why it matters (or doesn't), in his own words.
- [ ] B world.college — How he sees college / his near-term path.

## 4. What He's Actually Into (Interests → Arc)
- [ ] R care.energy — The 2-3 things he genuinely loses time to / can't shut up about, in his exact words. Real energy, not polite "hobbies." This is where his arc will come from — get real ones.
- [ ] R care.depth — Go DEEP on the strongest one: how he actually engages with it, what he'd love to MAKE or FIX in that world, WHO ELSE is into it (the audience), and what annoys him or feels missing. Deep enough that a product could plausibly live here. Don't accept a one-liner.
- [ ] R care.why — The "why" under the top one: what a real win actually looks like to him.

## 5. How He Works
- [ ] R work.stuck — What he actually does when he gets stuck.
- [ ] R work.completion — Finisher vs starter — does he close things out?
- [ ] R work.structure — Whether external structure (deadlines, milestones, check-ins) helps him keep going, or feels stifling. His preference, captured as input (he doesn't set the cadence).
- [ ] R work.feedback — How he takes feedback/criticism: does being told something isn't working shut him down, roll off him, or spur him? Probe this SEPARATELY — don't infer it from the structure question.
- [ ] B work.anxiety — A named anxiety about the next 6 weeks, if he has one.

## 6. Logistics
- [ ] R log.time — Hours per day he can give, and any known time conflicts across the 6 weeks.
- [ ] R log.capital — Starting capital he can risk + whether he has any way to take payment.

## 7. Direction & Reflection
- [ ] R arc.lean — He's heard 2-3 concrete product/service arcs built from his OWN interests ("weightlifting → an AI form-check coach" / "a lifting-program generator" / "a gym-meme brand"), and said which one actually pulls him. Captured as a provisional lead arc + the runner-up. This is provisional — reassure him Day 1 isn't a prison.
- [ ] R reflect.playback — He's heard a synthesis of himself in his own language and gotten to correct it.
- [ ] B reflect.unsaid — He's been asked what he didn't get to say.
`.trim(),

  framing: {
    // Course-specific "what this is." Names the course + its stakes.
    context: `They are a high school student about to begin a 6-week course that will have them build real AI-powered tools and attempt to launch an actual small business or product before their senior year — with the explicit goal of at least one real, working revenue attempt by the time school starts, resume-worthy material for college applications, and a genuine foundation in AI/agentic systems literacy and entrepreneurial thinking.`,
    // Who reads the synthesized profile afterward (a summary, not a transcript).
    reviewer: 'His father (Jonathan)',
    // The authority / power dynamic for THIS course (course-specific — a different
    // course could declare a very different one). Woven into the base prompt's role
    // section. Written with generic "the student / the person running the program"
    // so no name interpolation is needed.
    dynamic: `This is DIRECTED, paid work: the person running the program (Jonathan) sets the course's cadence and structure, and the student is doing the work under that direction — he is here at the program's direction, not designing his own class or deciding how it runs. His thoughts and preferences are genuinely welcome and noted, but he is NOT the authority on how the course works. So when you ask how he works (structure vs open space, deadlines, check-ins), gather his PREFERENCE as INPUT to help tune the course FOR him — never as him choosing or approving how it's built. Frame it as understanding HIM ("what tends to keep you going when something gets boring — a tight schedule with deadlines, or more room to roam?"), NEVER "would you rather the course be X or Y" or "should the course be…" — nothing that casts him as the one deciding.`,
  },

  // The body of the profile document (below the auto-generated header). Course-
  // specific: a different course ships a different schema.
  profileSchema: `
---
## What He Knows / Doesn't Know
### Hands-On Build Experience
### Systems Literacy Map
(Front end/back end, client/server, database, auth, cloud vs local, hardware vs software, UX/UI — each with understood/partial/not-yet + specifics)
Overall calibration:

---
## His Worldview, In His Own Terms

---
## What He Actually Cares About (Energy Map)

---
## Verbatim Language Bank
(8-12 direct quotes with context, if the transcript supports it)

---
## Provisional Lead Arc
(The product/service direction that actually pulled him — plus the runner-up. Tie each to the specific interest it grew from and quote his reaction. This is the spine the coursework personalizes around; mark it provisional.)

---
## Candidate Venture Directions
(2-4 including the lead above, each with rationale tied to something specific he said)

---
## How He Works
(Stuck-point behavior, completion tendency, feedback sensitivity, structure preference, named anxiety)

---
## Proctor Calibration Notes

---
## Logistics
(Hours/day, time conflicts, starting capital, payment infra status)

---
## What He Said At The End

---
## Flags for Jonathan

---
## Instrument Retro (pilot notes — separate from student data)
(Your honest notes on how the interview instrument itself performed)
`.trim(),
}

const PACKS = {
  'noob-to-ai-entrepreneur': NOOB_TO_AI_ENTREPRENEUR,
}

const LINE_RE = /^- \[ \]\s+([RB])\s+(\S+)\s+—\s+(.+)$/

function parseInventory(md, title) {
  const sections = []
  let cur = null
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      cur = { name: line.slice(3).trim(), objectives: [] }
      sections.push(cur)
      continue
    }
    const m = line.match(LINE_RE)
    if (m && cur) {
      cur.objectives.push({
        id: m[2],
        required: m[1] === 'R',
        need: m[3].trim(),
        section: cur.name,
      })
    }
  }
  return { title, sections, objectives: sections.flatMap((s) => s.objectives) }
}

const CACHE = {}

// Resolve a course's interview pack: parsed inventory + framing + profileSchema.
// Null if the course has no interview configured.
export function getPack(courseSlug, courseTitle) {
  const pack = PACKS[courseSlug]
  if (!pack) return null
  if (!CACHE[courseSlug]) {
    const parsed = parseInventory(pack.inventoryMd, `Interview Inventory — ${courseTitle}`)
    CACHE[courseSlug] = {
      ...parsed,
      framing: pack.framing,
      profileSchema: pack.profileSchema,
    }
  }
  return CACHE[courseSlug]
}

// --- inventory helpers (operate on any object with .sections / .objectives) ---

export function newInventoryState(inv) {
  const state = {}
  for (const o of inv.objectives) state[o.id] = { ticked: false, tickedAtTurn: null }
  return state
}

export function isKnownObjective(inv, id) {
  return inv.objectives.some((o) => o.id === id)
}

// The next required, un-ticked objective in document order — the current focus.
// Null when every required box is ticked (→ wrap-up).
export function focusObjective(inv, state) {
  return inv.objectives.find((o) => o.required && !state[o.id]?.ticked) || null
}

export function requiredCounts(inv, state) {
  const req = inv.objectives.filter((o) => o.required)
  const ticked = req.filter((o) => state[o.id]?.ticked).length
  return { ticked, total: req.length }
}

export function isComplete(inv, state) {
  return inv.objectives.filter((o) => o.required).every((o) => state[o.id]?.ticked)
}

// UI-facing progress: required ticked/total + a human label for the current area.
export function progressInfo(inv, state) {
  const { ticked, total } = requiredCounts(inv, state)
  const f = focusObjective(inv, state)
  return { ticked, totalRequired: total, focus: f ? f.section : 'Wrapping up' }
}

// Render the inventory as a live markdown checklist for the envelope.
export function renderInventory(inv, state, focusId) {
  const lines = [`# ${inv.title}`]
  for (const s of inv.sections) {
    lines.push('', `## ${s.name}`)
    for (const o of s.objectives) {
      const box = state[o.id]?.ticked ? '[x]' : '[ ]'
      const tag = o.required ? 'R' : 'B'
      const focus = o.id === focusId ? '   ← FOCUS NOW' : ''
      lines.push(`- ${box} ${tag} ${o.id} — ${o.need}${focus}`)
    }
  }
  return lines.join('\n')
}
