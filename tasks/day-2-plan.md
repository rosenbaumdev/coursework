# Day 2 — "The Keys to the Kingdom"
*From punch cards to you: 80 years of computing, and the doors open.*
*Student: Zachary · Course: Noob to AI Entrepreneur · Draft: authored overnight*

---

## The idea in one line
For 80 years, making software was a priesthood — you had to learn arcane tongues to
speak to machines. That barrier just fell. Today Zachary walks the whole history,
arrives at the moment *he's standing in*, gets handed the keys (his in-platform IDE
with an instructor riding shotgun), and builds his first real thing: a mini-golf game
that's as big, small, silly, or serious as he wants.

**Emotional arc:** awe (look how far this came) → recognition (the magic was gated) →
empowerment (the gate is open, for *you*, right now) → agency (go make something).

**Design guardrails (from the Day-1 incident):** doing-first, *light* required gates,
generous graceful exit, celebrate the moment it works. Nobody gets trapped. The build
is explicitly "as fun or boring as you want" — no rubric on creativity.

---

## Movement 1 — The history (the narrative deck, Director-guided)
The Director walks these beats as a deck on the canvas; chat carries the story, slides
carry the punch. Keep it fast and vivid — this is a story, not a lecture. React with
him at 2–3 points ("where do you think *you* sit in this?").

1. **Mechanical dawn** — binary before electricity. The Jacquard loom + Babbage:
   a machine that follows punched instructions. The whole language is on/off.
2. **Vacuum-tube giants** — ENIAC, room-sized, rewired by hand. The first programmers
   were women patching cables. "Computer" was a *job title* first.
3. **Punch cards** — a program was physically punched holes. Drop the deck, and your
   program is shuffled. Coding as manual labor.
4. **The transistor** — the miracle of shrinking. Moore's Law starts: compute doubles
   and doubles and doubles.
5. **Terminals & mainframes** — time-sharing. You *queued* for the machine's attention.
6. **The PC age — first ubiquity** — Apple, the IBM PC; the computer enters the home.
   But note the gap: *using* a computer ≠ *creating* with it.
7. **Machine code & arcane languages** — to *make* software you learned cryptic tongues
   (assembly, C). This is the barrier that built the priesthood.
8. **Rise of the software engineer** — the magic only they could do. Speak to machines,
   gain outsized power. A whole class of wealth and capability, gated by syntax.
9. **The internet** — everything connects; software becomes distribution and reach.
10. **Cloud, storage, infinite compute** — you stop owning the machine. Unlimited
    compute on tap, rentable by the minute.
11. **AI arrives** — machines that write the arcane languages *for* you. The priest's
    tongue becomes something anyone can command in plain English.
12. **The democratization — THE MOMENT** — the barrier falls. A 17-year-old with an idea
    can build what used to take a team and a CS degree. *This is you, Zachary. Today.*
13. **Where it goes from here** — robots (software gets a body), quantum (a new kind of
    compute entirely), agents that build *for* you. The frontier is wide open exactly as
    you walk in.

## Movement 2 — Why this, why now (vibe coding + Claude Code)
14. **Vibe coding** — the new way: describe what you want in plain words, the machine
    writes the code, you play/tweak/repeat. The loop, named.
15. **What makes Claude Code different** — it's not a chatbot that hands you snippets.
    It's an *agent* that works in your real files and real terminal, does real
    engineering (reads, edits, runs, debugs across a whole project), is transparent
    about what it's doing, and is extensible. It doesn't just *tell* you — it *does*,
    with you.

## Movement 3 — Your workshop (intro the IDE)
16. **The multipane IDE** — introduce his workshop:
    - **Chat (left):** the instructor, on board the whole time — explains anything,
      suggests, unblocks, never leaves.
    - **Terminal (top-right):** where he commands the machine — this is *the real thing*
      real engineers use, running on his own always-on machine.
    - **Viewer (bottom-right):** his creation, live, updating as he builds.
    - "Anytime you're confused, ask. Anytime you're stuck, ask. I'm right here."

## Movement 4 — The mandate (build!)
17. **Build a mini-golf game.** The framing, verbatim in spirit:
    - As **big or small** as you want. As **fun or boring** as *you* decide — this is
      yours, there's no grade on creativity.
    - It has **physics** (a rolling ball, a slingshot aim) and infinite room to riff.
    - Make it **replayable** — you'll want to hit "again."
    - **Have fun with it.** This is your first act of creation with the keys in hand.
    - Instructor offers a starter prompt when he's ready, an upgrade menu when the first
      hole works (obstacles, a 2nd hole, scoring, "juice," a theme), and debugs with him.

---

## Objectives (light — Day-1 lessons applied)
```
## 1. The story
- [ ] R discuss history.walk — He's walked the arc from mechanical machines to the
      democratization moment and reacted to where HE sits in the story.
- [ ] R discuss claude.why — He gets what vibe coding is and what makes Claude Code
      different from a chatbot (agentic, real files/terminal, does the work with him).

## 2. The workshop
- [ ] R discuss ide.intro — He's seen his workshop (chat / terminal / viewer) and knows
      the instructor is on board to explain and unblock ANY time.

## 3. Build (the fun)
- [ ] R check build.first — Mini-golf is running in his workshop: a ball he can hit into
      a cup at least once.
- [ ] R check build.mine — He's made at least one change that was HIS idea and seen it
      show up in the game.
- [ ] B check build.juice — He's added juice (win screen, sound, celebration, title,
      theme) — the stuff that makes it feel like a real game.
- [ ] B check build.hole2 — More than one hole, or a real obstacle to get around.

## 4. Ship + reflect
- [ ] R check ship.replayable — The game is replayable and he's had fun making it his.
- [ ] B discuss wrap.next — He's banked one thing he'd want to build or add next.
```

---

## Execution substrate — how it actually runs tomorrow

**Movements 1–3 (the lesson):** run in the existing coached-session platform — proven,
in production. Low risk. This is a Director masterPrompt + a history deck (canvasProgram)
+ the objectives above.

**Movement 4 (the build):** this is where the IDE comes in. Two possible substrates:
- **A — In-platform IDE (the vision):** live terminal on his droplet (proven tonight)
  + app-viewer pane. Requires: (1) terminal productionized (systemd + stable named
  tunnel so it survives to morning + reboots), (2) the `workshop` 3-pane canvas built,
  (3) the droplet serving the game on a port with its own tunnel route for the viewer.
- **B — claude.ai fallback (safety net):** he builds mini-golf in a claude.ai artifact
  (zero setup, instant preview). The lesson still *introduces* the IDE; the build happens
  in claude.ai this once. Guarantees he's never stranded (the Day-1 non-negotiable).

**Recommendation:** author the lesson tonight (ships regardless). Productionize the
terminal + build the `workshop` canvas toward substrate A. Keep substrate B wired as the
guaranteed fallback so tomorrow morning is safe *even if* A isn't 100% battle-tested by
then. Promote A the moment it's proven solid.

---

## The IDE architecture (the 3-pane workshop)
- New canvas type `workshop`: outer chat|canvas split unchanged; the canvas hosts an
  internal vertical split — `LiveTerminal` (top) + `BrowserCanvas`/viewer (bottom).
- Viewer points at the droplet-served app URL (its own tunnel route).
- Observability: the terminal already feeds `onLiveState → describeCanvas →
  canvasLiveState → Director` (proven tonight). The viewer can report its URL/state the
  same way. So the Director *sees* both the commands and the running app.
- Later: 4th pane = file navigator (read the tree the droplet exposes).

## Open decisions for the morning
- Substrate A vs. B for tomorrow's build (recommendation above).
- Cadence reconcile: Grok framework says 6 weeks; CLAUDE.md says 3. (Jonathan's call.)
- Whose Claude account on the droplet: Jonathan's for now (confirmed), Zachary's own later.
```
