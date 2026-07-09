// Turn the current canvas directive (+ any live state the renderer reports) into a
// compact text description the chat model can reason about — so the assistant knows
// what the learner is looking at. `liveState` is an optional string a renderer
// reports (e.g. terminal cwd+output, current browser URL, edited artifact content).
export function describeCanvas(directive, liveState) {
  if (!directive) return 'The canvas is currently empty (no material is being shown).'
  const title = directive.title ? ` titled "${directive.title}"` : ''
  const p = directive.payload || {}
  const clip = (s, n = 900) => {
    const v = (s || '').trim()
    return v.length > n ? v.slice(0, n) + '…' : v
  }

  switch (directive.type) {
    case 'reading':
      return `A READING pane${title}. The full text the learner is seeing:\n"""\n${clip(p.markdown)}\n"""`
    case 'deck': {
      // Per-kind summaries so the Director knows what each slide SHOWS (not just
      // its text) — the deck is visual; the summary mirrors that.
      const one = (f) => {
        switch (f.kind) {
          case 'image':
            return `[image] ${f.caption || ''}`
          case 'statement':
            return `[statement] ${f.kicker ? f.kicker + ': ' : ''}"${f.text}"${f.sub ? ' — ' + f.sub : ''}`
          case 'stat':
            return `[stat] ${f.value} — ${f.label}${f.note ? ` (${f.note})` : ''}`
          case 'split': {
            const v = f.visual || {}
            const vis =
              v.type === 'image'
                ? `image: ${v.alt || v.src || ''}`
                : (v.items || []).map((it) => it.title + (it.text ? ` — ${it.text}` : '')).join('; ')
            return `[split] ${f.heading || ''}${f.text ? ` — ${clip(f.text, 160)}` : ''} | visual: ${vis}`
          }
          case 'columns': {
            const cols = (f.columns || [])
              .map((c) => `${c.title}${c.example ? ` [${c.example}]` : ''}`)
              .join(' | ')
            return `[columns] ${f.heading || ''} — ${cols}`
          }
          case 'figure': {
            const spec = f.spec || {}
            const labels =
              f.figureKind === 'concentric'
                ? (spec.rings || []).map((r) => r.label).join(' ⊃ ')
                : (spec.quadrants || []).map((q) => q.label).join(' / ')
            return `[figure:${f.figureKind}] ${labels}${f.step !== undefined ? ` (at step ${f.step})` : ''}`
          }
          default:
            return clip(f.markdown, 200)
        }
      }
      const frames = (p.frames || []).map((f, i) => `(${i + 1}) ${one(f)}`).join('\n')
      return `A SLIDE DECK${title} with ${(p.frames || []).length} slides:\n${frames}`
    }
    case 'video':
      return `A VIDEO${title}: "${p.label || ''}"${p.durationLabel ? ` (${p.durationLabel})` : ''}.${liveState ? ' ' + liveState : ''}`
    case 'image':
      return `An IMAGE${title}.${p.caption ? ` Caption: ${p.caption}.` : ''}${p.alt ? ` (alt text: ${p.alt})` : ''}`
    case 'browser':
      return `A BROWSER pane. ${liveState || `Currently pointed at ${p.url || 'a page'}.`}`
    case 'terminal':
      return p.mode === 'live'
        ? `A LIVE TERMINAL — a real shell on the learner's own machine (droplet), where they run real commands and Claude Code. ${liveState || 'No commands run yet.'}`
        : `A TERMINAL — a simulated bash sandbox the learner can type commands into. ${liveState || 'No commands run yet.'}`
    case 'workshop':
      // Never assert the app is "showing" just because a URL is configured — the app
      // only appears once it's genuinely serving, and the viewer loads it itself then.
      // The truthful terminal + VIEWER status arrives via liveState; defer to it.
      return `The WORKSHOP — the learner's IDE: a LIVE terminal on their own machine (top) plus an app viewer (bottom) that loads their app automatically the moment it's actually serving. This is where they build. ${liveState || 'No commands run in the terminal yet, and nothing is serving in the viewer.'}`
    case 'figure': {
      const spec = p.spec || {}
      const steps = spec.steps || []
      // FigureCanvas lets the learner freely browse back/forward within the
      // server-resolved frontier (prev/next, dots, swipe) without a round trip —
      // liveState (an object here, unlike the plain-string liveState other
      // canvas types report) carries that ACTUAL displayed step so the Director
      // describes what's really on screen, not just the last [SHOW:] frontier.
      const liveIdx = liveState && typeof liveState === 'object' ? liveState.figStep : undefined
      const idx = typeof liveIdx === 'number' ? liveIdx : p.step ?? 0
      const stepName = steps[idx] ?? String(idx)
      const shown = (el) => el.step === undefined || steps.indexOf(el.step) <= idx
      let parts = []
      if (p.kind === 'concentric') {
        parts = (spec.rings || [])
          .filter(shown)
          .map((r) => `${r.label}${r.sublabel ? ` (${r.sublabel})` : ''}${r.value != null ? ` = ${r.value}` : ''}`)
      } else if (p.kind === 'quadrant') {
        parts = (spec.quadrants || [])
          .filter(shown)
          .map((q) => `${q.label}: ${(q.items || []).filter(shown).map((it) => it.text).join('; ') || '(empty)'}`)
      }
      const notes = (spec.callouts || []).filter(shown).map((c) => c.text)
      return `A FIGURE${title} (${p.kind}), building up in steps — currently at step "${stepName}" (${idx + 1}/${steps.length || 1}). Visible now: ${
        [...parts, ...notes].join(' · ') || '(base frame only — nothing revealed yet)'
      }`
    }
    case 'compare': {
      // Sides are full CanvasDirective objects (Phase T.4f Tier 2) — recurse.
      // No live-state passthrough for sides in this v1 (each side's own
      // server-resolved state is enough for the Director to reason about it).
      const a = describeCanvas(p.a, null)
      const b = describeCanvas(p.b, null)
      return `A COMPARE view${title}, two panes side by side:\nA) ${a}\nB) ${b}`
    }
    case 'artifact':
      return `An editable ${p.format || 'markdown'} ARTIFACT${title}. ${
        liveState
          ? `Its current (possibly edited) content:\n"""\n${clip(liveState)}\n"""`
          : `Content:\n"""\n${clip(p.content)}\n"""`
      }`
    default:
      return `A ${directive.type} pane${title}.`
  }
}
