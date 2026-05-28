# Day 8 — Instructor Briefing
## Sports Betting AI — Prompt Engineering + Pick Quality

---

## Session Goal

Jordan systematically improves pick quality through structured prompt engineering. By end of session he has a measurably better analysis prompt and understands the A/B testing methodology for prompts.

---

## Session Map

| Phase | Name | Output |
|-------|------|--------|
| 1 | Quality Audit | Review all picks generated so far |
| 2 | Prompt Failure Analysis | Identify specific weaknesses |
| 3 | Prompt v2 | Improved picks-analysis prompt |
| 4 | A/B Test Framework | Compare v1 vs v2 on same data |
| 5 | Sport-Specific Tuning | Prompt variations per sport |
| 6 | Day 8 Close | CLAUDE.md updated |

---

## Phase 1 — Quality Audit (15 min)

**Review all picks files in intelligence/outputs/ together:**

> "Read every pick the system has generated so far. For each one, ask: would a sharp bettor actually use this? Is the reasoning specific or generic? Does it cite actual numbers? Is the edge clearly named or vague?"

**Create a quality rubric:**

```
For each pick, score 1-5:
□ Specificity: does it reference actual line numbers, injury status, book names?
□ Edge clarity: can you state the edge in one sentence?
□ Reasoning depth: does it explain WHY the edge exists, not just WHAT?
□ Confidence calibration: does the confidence rating feel right?
□ Actionability: could you place this bet right now based on this output?
```

**Common quality issues Jordan will likely find:**

- Reasoning is generic sports analysis instead of betting market analysis
- Confidence is too high (9/10 on thin data)
- Edge type says "MODEL_DISAGREEMENT" but doesn't explain what models disagree
- Line shopping section populated with placeholder values
- "Watch for" section is too vague

Write down every specific complaint. These become the prompt improvements.

---

## Phase 2 — Prompt Failure Analysis (10 min)

**For each quality issue, identify the root cause:**

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Generic reasoning | Prompt doesn't require citing specific numbers | Add "Reference specific odds values and player names from the data" |
| Overconfident ratings | No calibration guidance | Add explicit examples of what each confidence level looks like |
| Vague edge type | Edge type categories are too broad | Add examples for each category |
| Bad line shopping | Data isn't being used correctly | Add explicit instruction to extract from bookmakers array |

> "Notice we're diagnosing before fixing. Every prompt edit should address a specific diagnosed problem. Random prompt edits that aren't responding to a real issue will make things worse. Be surgical."

---

## Phase 3 — Prompt v2 (20 min)

**Have Jordan actually write the improvements himself** — not just watch you do it:

> "Open picks-analysis.md. Find the reasoning section. Rewrite it based on what we just diagnosed. Tell me what you want to change."

**Key improvements to guide toward:**

**1. Force specific citations:**
```
Add to reasoning instructions:
"Cite specific numbers: exact odds prices, specific player names 
and their injury status/impact score, specific line movement amounts.
Never write 'the line has moved' — write 'the line moved from -3 to -5.5'.
Never write 'key player is injured' — write 'Patrick Mahomes (QB, 
impact score 6.2) is listed Questionable.'"
```

**2. Calibrate confidence with examples:**
```
Add to confidence scale:
Confidence 8-10 example: "High-impact QB injury (impact score 6+) 
  reported AFTER significant line move in WRONG direction.
  5+ books showing line variance >15. Strong sharp action signal."
Confidence 5-6 example: "Moderate injury concern, line moved 
  in expected direction, 1-2 interesting factors but no confluence."
Confidence 3-4 example: "Single data point of interest. 
  Insufficient corroborating signals. Lean only."
```

**3. Sharpen edge type definitions:**
```
Add specific criteria for each edge type:
- INJURY_MARKET_LAG: use only if injury impact score > 3.0 AND 
  line hasn't moved in direction injury suggests
- PUBLIC_FADE: use only if sharp action signals contradict public betting %
- LINE_SHOPPING: use only if best/worst price spread > 15 cents
```

**After writing v2:**

```bash
cp intelligence/prompts/picks-analysis.md intelligence/prompts/picks-analysis-v1.md
# v2 is now the live version in picks-analysis.md
```

---

## Phase 4 — A/B Test Framework (15 min)

**Introduce prompt A/B testing:**

> "We can't know if v2 is better than v1 by feeling. We need to run both on the same input and compare. That's an A/B test."

**Prompt Claude Code:**

```
Build scripts/prompt-ab-test.js

Given a game context file, run picks-engine against TWO different 
prompt versions and output a side-by-side comparison.

Usage:
node scripts/prompt-ab-test.js --game "Chiefs vs Raiders" 
  --prompt-a intelligence/prompts/picks-analysis-v1.md
  --prompt-b intelligence/prompts/picks-analysis.md

Output:
1. Both full responses saved to intelligence/outputs/ab_test_{timestamp}.json
2. Console comparison:
   
   PROMPT A (v1)                    | PROMPT B (v2)
   ─────────────────────────────────┼─────────────────────────────────
   Recommendation: Chiefs -3.5      | Recommendation: Chiefs -3.5
   Confidence: 7                    | Confidence: 6
   Edge: INJURY_MARKET_LAG          | Edge: INJURY_MARKET_LAG
   Specificity score: [auto-calc]   | Specificity score: [auto-calc]
   
   [Full reasoning A]               | [Full reasoning B]

Specificity score (auto-calculated):
Count occurrences of: numbers, team names, book names, 
player names, specific odds values in the reasoning field.
Higher = more specific. Simple heuristic but useful signal.

Cost: 2x normal (runs analysis twice) — log this clearly.
```

**Run it on any game with data:**

```bash
node scripts/prompt-ab-test.js --game "[game name]" --prompt-a intelligence/prompts/picks-analysis-v1.md --prompt-b intelligence/prompts/picks-analysis.md
```

**Review together:**

> "Which reasoning is more useful? Which confidence rating feels more calibrated? If v2 costs the same and produces more specific output — it wins. Keep it."

---

## Phase 5 — Sport-Specific Tuning (10 min)

**If Jordan chose NFL:**

> "NFL betting has some quirks that generic sports betting analysis doesn't capture well. Weather matters more for outdoor stadiums. The short week matters (Thursday Night Football). Home/away splits are more predictive. Let's add NFL-specific context to the prompt."

```bash
cp intelligence/prompts/picks-analysis.md intelligence/prompts/picks-analysis-nfl.md
```

Add a sport-specific section to picks-analysis-nfl.md:

```markdown
## NFL-Specific Analysis Factors
When analyzing NFL games, additionally consider:

WEATHER (outdoor stadiums only):
- Wind > 20mph: significant impact on passing game and totals
  Rule: wind > 20mph → lean under on totals, penalize spread for 
  passing-dependent teams
- Precipitation: affects ball security, kicking game
- Temperature < 20°F: additional 2-3 point under lean

SHORT WEEK (Thursday Night Football):
- Teams on short rest (3 days) since previous game
- Historically: away teams on short rest cover at lower rate
- Road + short rest = red flag for spread pick

HOME FIELD:
- Historically worth 2.5-3 points in NFL
- Altitude (Denver): additional 1-2 point home advantage
- If line doesn't reflect expected home advantage — note the discrepancy

QB TIER MATCHUPS:
- Elite QB vs. elite defense = lower total lean
- Backup QB = treat as 4-6 point line adjustment
```

Update CLAUDE.md to note that NFL-specific prompt is available.

---

## Phase 6 — Day 8 Close (5 min)

**What Jordan built today:**
- Systematic quality audit methodology
- `picks-analysis-v2` (improved prompt)
- `scripts/prompt-ab-test.js` — A/B testing framework
- Sport-specific prompt variant

**The meta-lesson:**

> "You just did real prompt engineering — not 'playing with prompts,' but systematic diagnosis, targeted fixes, and measurable comparison. This skill applies to every AI product you'll ever build. The outputs are only as good as your prompts, and your prompts get better through iteration, not inspiration."

**Update CLAUDE.md. Tomorrow:** caching.
