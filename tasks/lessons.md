# Lessons — Pattern-Level Rules from Past Mistakes

Format: each entry is a rule, then **Why** (the incident or reasoning), then **How to apply** (when this kicks in).

---

## `wrangler r2 object get/put/delete` default to LOCAL state — use `--remote` for prod
**Why:** Debugging a prod 500 on the interview, I "deleted" the offending prod session ~5 times; each said "Delete complete" but the Function kept reading it. I chased a phantom "split store" (jurisdiction? two buckets?) for ~an hour. Root cause: `wrangler r2 object *` operates on the LOCAL `.wrangler/state` R2 by default; the deployed Function reads REAL prod R2. My deletes never touched prod. `--remote` immediately showed the real object (the Function's session, history included).
**How to apply:** Any time you inspect/mutate the data a *deployed* Worker/Pages Function sees, pass `--remote` (and the CF token). Local-vs-remote is the FIRST hypothesis when CLI and a deployed Function disagree about R2/KV/D1 contents — before jurisdiction or duplicate-bucket theories. Retrieve Zachary's profile with `wrangler r2 object get coursework-interview/profiles/zachary/<course>-profile.md --remote`.

## Old-schema persisted sessions crash new inventory code — guard on load, don't trust the store
**Why:** First prod run of the redesigned interview 500'd: a leftover session from the original 7-section machine (no `inventoryState`) hit the resume branch, and `requiredCounts`/`progressInfo` did `state[o.id]` on `undefined`. Local never saw it because local R2 had no such ghost.
**How to apply:** When a persisted object's schema changes, validate shape on load (`loaded?.inventoryState && typeof … === 'object'`) and treat a mismatch as "start fresh / overwrite," not as a resumable/completed session. A schema guard is cheaper and safer than trying to purge every stale record.

## Never `rm -rf` local R2 state to "get a clean test session"
**Why:** During Phase S.1 I wiped `.wrangler/state/v3/r2` on several dev restarts to force a fresh interview. That local R2 also holds the *saved interview transcripts* from every test walk — including Jonathan's. Wiping it destroys the exact data we need to diagnose interview behavior (drift, tag firing, pacing). Nearly lost his drift-test transcript; caught it only by inspecting before the next wipe.
**How to apply:** To reset ONE student's interview, delete just that session key, never the whole bucket. Better: leave sessions in place and read them (`find .wrangler/state/v3/r2/coursework-interview/blobs` → the blob is the raw session JSON). Treat local R2 interview data as real user data, because for diagnosis it is.

## Interview instrument: "feel heard" vs "work the 7 sections in order" is a live prompt conflict
**Why:** Haiku, given both "make him feel heard / follow every thread / NEVER rush [SECTION_COMPLETE]" and "cover sections in order, advance when done," obeys the first and ignores the second — froze at Section 1 for 4 turns while mining Section 4 content, never emitting the advance tag. Progress pointer is server-authoritative off that tag, so it stalls.
**How to apply:** Any section-gated LLM instrument needs (a) a crisp per-section exit criterion, (b) explicit "later-section topics are OFF-LIMITS until you get there," (c) advance-vs-linger *balanced* (over-staying is failure too, not just rushing), and ideally (d) a server-side pacing safety net so a stuck tag can't freeze the whole flow. Don't rely on a lone "emit the tag when done" instruction.

## Haiku 4.5 won't reliably emit backend control tags mid-conversation; Sonnet 5 + adaptive thinking does
**Why:** Phase S.2 rebuilt the interview as a granular objective inventory with `[TICK:]`/`[TABLE:]` tags. On Haiku 4.5 the identical prompt+walk emitted **0 ticks across 13 turns** — it ran a warm, high-quality interview but flatly ignored the control-tag emission, so nothing advanced. Same walk on **`claude-sonnet-5` + `thinking:{type:'adaptive'}` (effort medium)** ticked all 11 required boxes, tabled a deepening thread correctly, and completed. The per-turn reasoning pass is what makes the model stop and decide "does this turn cover a box → tick / table / drift." Haiku has no adaptive-thinking/effort mode at all (the param errors on it).
**How to apply:** When an agent must emit machine-read control tokens *while* doing an intelligence-heavy conversational task, don't put that on Haiku — the tokens get dropped. Use a model with adaptive thinking so the bookkeeping decision gets an explicit reasoning step. Also: a per-turn "cap N ticks" rush-guard tuned for a weak model becomes pure lag on an honest strong one — prefer a completion turn-floor + a "no hollow ticks" instruction + a mandatory synthesis box over throttling legit progress.
