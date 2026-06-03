// Parses a course markdown file (public/<slug>.md) into an ordered array of day objects.
//
// Document shape: frontmatter blocks delimited by `---` lines, with free-form
// markdown body content between them.
//
//   ---
//   day: 0
//   week: 1
//   title: Orientation
//   description: ...
//   ---
//
//   Body markdown for day 0 (may contain its own `---` horizontal rules).
//
//   ---
//   day: 1
//   ...
//
// A `---` line only opens a frontmatter block if its next non-blank line
// matches `key: value`. Otherwise it's body content (e.g. a horizontal rule).

const DASH = /^\s*---\s*$/

function isFrontmatterStart(lines, i) {
  if (!DASH.test(lines[i])) return false
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j]
    if (line.trim() === '') continue
    return /^\s*[A-Za-z_][\w-]*\s*:/.test(line)
  }
  return false
}

function parseFrontmatter(block) {
  const out = {}
  for (const raw of block) {
    const line = raw.trim()
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon === -1) continue
    out[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return out
}

export function parseCourseWork(markdown) {
  const lines = markdown.split('\n')
  const days = []
  let i = 0

  while (i < lines.length) {
    if (!isFrontmatterStart(lines, i)) {
      i++
      continue
    }
    i++ // consume opening ---

    const fmLines = []
    while (i < lines.length && !DASH.test(lines[i])) {
      fmLines.push(lines[i])
      i++
    }
    if (i >= lines.length) break
    i++ // consume closing ---

    const fm = parseFrontmatter(fmLines)

    const bodyLines = []
    while (i < lines.length && !isFrontmatterStart(lines, i)) {
      bodyLines.push(lines[i])
      i++
    }

    if (fm.day === undefined || fm.title === undefined) continue

    const id = String(fm.day).trim()
    const numericId = Number(id)

    days.push({
      id,
      numericId,
      parentId: Number.isInteger(numericId) ? null : String(Math.floor(numericId)),
      week: Number(fm.week),
      title: fm.title,
      description: fm.description || '',
      body: bodyLines.join('\n').replace(/\n*---\s*\n*$/, '').trim(),
    })
  }

  return days.sort((a, b) => a.numericId - b.numericId)
}

// Groups sub-days under their parent: returns top-level days with `children: [...]`.
export function buildDayTree(days) {
  const byId = new Map(days.map((d) => [d.id, { ...d, children: [] }]))
  const roots = []
  for (const day of byId.values()) {
    if (day.parentId && byId.has(day.parentId)) {
      byId.get(day.parentId).children.push(day)
    } else {
      roots.push(day)
    }
  }
  for (const day of byId.values()) {
    day.children.sort((a, b) => a.numericId - b.numericId)
  }
  return roots.sort((a, b) => a.numericId - b.numericId)
}
