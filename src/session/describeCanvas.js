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
      const frames = (p.frames || [])
        .map((f, i) => `(${i + 1}) ${f.kind === 'image' ? '[image] ' + (f.caption || '') : clip(f.markdown, 200)}`)
        .join('\n')
      return `A SLIDE DECK${title} with ${(p.frames || []).length} slides:\n${frames}`
    }
    case 'video':
      return `A VIDEO${title}: "${p.label || ''}"${p.durationLabel ? ` (${p.durationLabel})` : ''}.${liveState ? ' ' + liveState : ''}`
    case 'image':
      return `An IMAGE${title}.${p.caption ? ` Caption: ${p.caption}.` : ''}${p.alt ? ` (alt text: ${p.alt})` : ''}`
    case 'browser':
      return `A BROWSER pane. ${liveState || `Currently pointed at ${p.url || 'a page'}.`}`
    case 'terminal':
      return `A TERMINAL — a simulated bash sandbox the learner can type commands into. ${
        liveState || 'No commands run yet.'
      }`
    case 'figure': {
      const spec = p.spec || {}
      const steps = spec.steps || []
      const idx = p.step ?? 0
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
