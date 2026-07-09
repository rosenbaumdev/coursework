// Terminal Sentinel (Phase 1 of proactive Director turns, #2/#4/#5).
//
// Watches the terminal for a CLOSED set of salient events and emits at most one event
// per detection, deduped by content hash and throttled per class. It is DETECTION ONLY —
// the firing POLICY (global rate limits, suppress-while-composing, read-time quiet) lives
// in SessionView. Everything brittle about scraping Claude Code's TUI is quarantined here
// so it's the one place to fix when the tool's wording changes, and it's pure/testable.
//
// The single worst failure mode this guards against: Claude Code is a TUI that REDRAWS,
// so the same permission prompt re-enters the output buffer on every repaint. Content-hash
// dedupe within a window is what stops the Director from firing on it forever.

function djb2(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// Distinctive Claude Code prompt patterns. Broad enough to survive minor wording drift,
// narrow enough not to fire on ordinary output.
const PERMISSION_RE =
  /(do you want to (proceed|allow|run|make this edit|create|continue)|❯\s*1\.\s*yes|yes,\s*(and\s*)?(allow|proceed|don'?t ask again)|\b1\.\s*yes\b.*\b2\.\s*)/i
const TRUST_RE = /do you trust the files in this folder/i

// Obvious shell commands are NOT prompts worth critiquing (#4 is about prompts to Claude
// Code, not `cd`/`ls`). A learner-typed line must clear this to count as a prompt.
const SHELL_CMD_RE =
  /^(cd|ls|ll|cat|npm|npx|node|git|claude|clear|pwd|mkdir|rmdir|rm|cp|mv|echo|export|touch|vim|vi|nano|code|python|python3|pip|pip3|curl|wget|sudo|chmod|open|which|man|less|tail|head|grep|exit|yes|y|n)\b/i

const DEDUP_WINDOW_MS = 60000
const CLASS_COOLDOWN_MS = {
  'permission-prompt': 0, // time-critical — must beat the learner's Enter; hash-dedupe only
  'trust-prompt': 0,
  'learner-prompt': 8000,
}

// Pull a window around the match so the Director sees the actual question + choices.
function region(tail, re) {
  const idx = tail.search(re)
  if (idx < 0) return tail.slice(-500).trim()
  return tail.slice(Math.max(0, idx - 160), idx + 540).trim()
}

export function createTerminalSentinel() {
  const lastHashAt = new Map() // contentHash -> ts (repaint dedupe)
  const lastClassAt = new Map() // type -> ts (per-class cooldown)

  function gate(type, excerpt, now) {
    const hash = djb2(type + '|' + excerpt)
    const hAt = lastHashAt.get(hash)
    if (hAt && now - hAt < DEDUP_WINDOW_MS) return null // same content just fired (TUI repaint)
    const cAt = lastClassAt.get(type)
    if (cAt && now - cAt < (CLASS_COOLDOWN_MS[type] ?? 10000)) return null
    lastHashAt.set(hash, now)
    lastClassAt.set(type, now)
    if (lastHashAt.size > 60) {
      for (const [k, t] of lastHashAt) if (now - t > DEDUP_WINDOW_MS) lastHashAt.delete(k)
    }
    return { type, excerpt, hash }
  }

  return {
    // Fed the ANSI-stripped terminal tail (LiveTerminal.report already cleans it).
    onOutput(text, now = Date.now()) {
      if (!text) return null
      const tail = text.slice(-1400)
      if (TRUST_RE.test(tail)) return gate('trust-prompt', region(tail, TRUST_RE), now)
      if (PERMISSION_RE.test(tail)) return gate('permission-prompt', region(tail, PERMISSION_RE), now)
      return null
    },
    // Fed the exact line the learner submitted to Claude Code (from LiveTerminal's onData
    // line buffer). Skips shell commands and trivially short lines. This is need #4.
    onLearnerPrompt(text, now = Date.now()) {
      const t = (text || '').trim()
      if (t.length < 15 || !t.includes(' ') || SHELL_CMD_RE.test(t)) return null
      return gate('learner-prompt', t.slice(0, 800), now)
    },
  }
}
