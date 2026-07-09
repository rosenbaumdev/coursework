// Marquee text extraction for LIVE terminals.
//
// The "◲ Point" marquee grabs the text under the selection via DOM caret probing
// (document.caretRangeFromPoint). That works for text panes (reading/deck/artifact)
// but returns NOTHING for a live terminal: xterm.js paints to a <canvas>, so there
// are no text nodes to probe. The Director then only heard "a region of the workshop"
// with no content (reported bug: the marquee selection "doesn't reach the Director").
//
// So each mounted LiveTerminal registers an extractor here; the marquee, when DOM
// probing comes back empty, asks the registry for the text under its screen rect and
// the terminal reads it straight out of xterm's buffer.
const extractors = new Set()

// LiveTerminal calls this once mounted; the returned fn deregisters on unmount.
export function registerTerminalExtractor(fn) {
  extractors.add(fn)
  return () => extractors.delete(fn)
}

// Given a screen-space rect ({left, top, width, height} in client coords), return the
// terminal text under it — the first non-empty hit across all live terminals.
export function extractTerminalText(rect) {
  for (const fn of extractors) {
    try {
      const text = fn(rect)
      if (text) return text
    } catch {
      /* a dead/disposed terminal — skip it */
    }
  }
  return ''
}

// Read the buffer lines an on-screen rect covers, out of a live xterm Terminal.
// `host` is the element term.open()'d into (it contains xterm's .xterm-screen).
export function terminalTextInScreenRect(term, host, rect) {
  if (!term || !host || !rect) return ''
  const screen = host.querySelector('.xterm-screen') || host
  const sr = screen.getBoundingClientRect()
  if (!sr.height || !term.rows) return ''
  const top = Math.max(rect.top, sr.top)
  const bottom = Math.min(rect.top + rect.height, sr.bottom)
  if (bottom - top < 4) return '' // selection didn't meaningfully overlap the terminal
  const rowH = sr.height / term.rows
  let startRow = Math.max(0, Math.floor((top - sr.top) / rowH))
  let endRow = Math.min(term.rows, Math.ceil((bottom - sr.top) / rowH))
  const buf = term.buffer?.active
  if (!buf) return ''
  const base = buf.viewportY // absolute buffer line at the top of the viewport
  const lines = []
  for (let i = startRow; i < endRow; i++) {
    const line = buf.getLine(base + i)
    if (line) lines.push(line.translateToString(true)) // true = trim trailing blanks
  }
  return lines.join('\n').replace(/\n{2,}/g, '\n').trim().slice(0, 800)
}
