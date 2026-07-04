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
