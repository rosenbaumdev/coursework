// One-shot: rebuild public/coursework.md from JORDAN_COURSEWORK.md.
//
// JORDAN_COURSEWORK.md uses `## Day N — Title` section headers. We extract each
// section's body, derive the week from the day number, and re-emit the file in
// the parser's frontmatter format. Descriptions come from the existing
// public/coursework.md so we don't lose the curated one-liners.
//
// Run from repo root: `node scripts/build-coursework.mjs`

import { readFileSync, writeFileSync } from 'node:fs'
import { parseCourseWork } from '../src/data/parseCourseWork.js'

const SOURCE = 'JORDAN_COURSEWORK.md'
const TARGET = 'public/coursework.md'

const weekFor = (id) => (id <= 6 ? 1 : id <= 13 ? 2 : 3)

const existing = parseCourseWork(readFileSync(TARGET, 'utf8'))
const descriptionById = Object.fromEntries(existing.map((d) => [d.id, d.description]))

const source = readFileSync(SOURCE, 'utf8')
const lines = source.split('\n')

// Find each "## Day N — Title" header with its line index.
const headerRegex = /^##\s+Day\s+(\d+)\s+[—-]\s+(.+?)\s*$/
const sections = []
lines.forEach((line, i) => {
  const m = line.match(headerRegex)
  if (m) sections.push({ id: Number(m[1]), title: m[2].trim(), start: i })
})

// Body for each section runs from the line after its header to the line before
// the next section's header (or EOF for the last one).
sections.forEach((s, idx) => {
  const end = idx + 1 < sections.length ? sections[idx + 1].start : lines.length
  // Strip the trailing `---` separator that JORDAN_COURSEWORK.md uses between days.
  s.body = lines.slice(s.start + 1, end).join('\n').replace(/\n*---\s*\n*$/, '').trim()
})

const out = sections
  .sort((a, b) => a.id - b.id)
  .map((s) => {
    const description = descriptionById[s.id] || ''
    return `---
day: ${s.id}
week: ${weekFor(s.id)}
title: ${s.title}
description: ${description}
---

${s.body}
`
  })
  .join('\n')

writeFileSync(TARGET, out)
console.log(`Wrote ${sections.length} days to ${TARGET}`)
