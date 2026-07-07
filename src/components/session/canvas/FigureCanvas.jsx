import { Fragment, useEffect, useRef, useState } from 'react'

// Declarative staged-reveal figures (Fable review #3, §2). payload:
// { kind, spec, step } — `step` arrives RESOLVED (an index; the server maps
// step ids). The reveal mechanic is generic, not per-kind: spec.steps is an
// ordered list of step ids, any element may carry `step: <stepId>` meaning
// visible-from; elements without `step` are always visible. Step advances
// re-render in place (same directive.id → no remount), so newly-visible
// elements animate in via .fig-enter. New kinds register in KINDS below and
// inherit the reveal layer for free.

const ACCENT = '#1a3a5c'
const INK = '#111111'
const MUTED = '#6b7280'
const RULE = '#e5e7eb'
const SANS = '"DM Sans", system-ui, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

// Small built-in glyph library (24×24 stroke shapes, drawn inline — no icon
// dependency). Used by `iconrow` figures and by deck split rows via <Glyph>.
// Names are validated server-side: ICON_GLYPHS in _sessionPacks.js mirrors this
// map — grow both together.
export const GLYPHS = {
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a13 13 0 0 0 0 18M3.5 9.5a13 13 0 0 0 17 0M3.5 14.5a13 13 0 0 1 17 0" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1" /><circle cx="15" cy="15" r="1" /><circle cx="15" cy="9" r="1" /><circle cx="9" cy="15" r="1" />
    </>
  ),
  'circle-dollar': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5v11" />
      <path d="M14.8 8.8c-.6-.9-1.6-1.3-2.8-1.3-1.7 0-3 .8-3 2.2s1.3 1.9 3 2.3 3 .9 3 2.3-1.3 2.2-3 2.2c-1.2 0-2.2-.4-2.8-1.3" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M2.5 3.5h3l2.5 11.9a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.2l1.7-7.5H6.8" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M15.5 5.6a3.5 3.5 0 0 1 0 5.8" />
      <path d="M18 14.6c2 .9 3.2 2.9 3.2 5.4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8.5 17v-4.5" />
      <path d="M12.5 17V9.5" />
      <path d="M16.5 17V6.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.4 2" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="M15.5 10.5l6-3.5v10l-6-3.5" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  mask: (
    <>
      <path d="M4 4c2.7 1 5.3 1.5 8 1.5S17.3 5 20 4v7.5c0 5-3.6 9-8 9s-8-4-8-9z" />
      <path d="M8 10.5c.7-.8 1.8-.8 2.5 0" />
      <path d="M13.5 10.5c.7-.8 1.8-.8 2.5 0" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2.5 12.5v-10h10l8.1 8.1a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </>
  ),
  spark: <path d="M13 2.5L4 14h7l-1 7.5L19 10h-7l1-7.5z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M12 3.5v17" />
      <path d="M3.5 12h17" />
    </>
  ),
}

// Standalone glyph (HTML contexts — deck split rows). Inherits currentColor.
export function Glyph({ name, size = 20, className }) {
  const g = GLYPHS[name]
  if (!g) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {g}
    </svg>
  )
}

// Greedy word-wrap for SVG <text> (no native wrapping). Returns line strings.
function wrap(text, maxChars) {
  const words = String(text || '').split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur)
      cur = w
    } else {
      cur = cur ? cur + ' ' + w : w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// A live [FIG:] value may carry a short embedded assumption in parens — e.g.
// `~30M (4.2M/cohort × 7)` — authored/injected as ONE string server-side (never
// parsed there). The client splits it purely for rendering: the number gets the
// visual weight, the parenthetical rides along smaller/muted right under it.
function splitAssumption(value) {
  const s = String(value ?? '')
  const m = s.match(/^(.*?)\s*\(([^()]*)\)\s*$/)
  return m ? { main: m[1], paren: m[2] } : { main: s, paren: null }
}

// Value-arrival pop: keying a wrapper on `${id}:${value}` makes React remount
// it the instant the value changes (a fresh number landing on the figure), which
// retriggers the `.value-pop` CSS animation for free — no manual prev-value
// diffing/timers needed, same trick `.fig-enter` relies on at the figure level.
// `as` picks the host element — SVG kinds use the default 'g'; the HTML-based
// matrix kind passes 'div' (`.value-pop`/`.fig-enter` are tag-agnostic CSS).
function ValueGroup({ id, value, as: Tag = 'g', children }) {
  return (
    <Tag key={`${id}:${value}`} className="value-pop">
      {children}
    </Tag>
  )
}

// Concentric rings (TAM/SAM/SOM shape): rings ordered OUTERMOST → INNERMOST,
// bottom-tangent nesting with EQUAL radial spacing (a concept diagram, not a
// chart — real values differ by 10³ and proportional circles are unreadable).
// Callouts stack in a right-hand column with dashed leader lines to their ring.
function ConcentricFigure({ spec, visible, entering }) {
  const rings = (spec.rings || []).filter(visible)
  const callouts = (spec.callouts || []).filter(visible)
  const all = spec.rings || []
  const N = Math.max(all.length, 1)
  const CX = 285
  const BASE_Y = 488
  const R_MAX = 210
  const radius = (i) => (R_MAX * (N - i)) / N // index in the FULL ring list

  return (
    <svg viewBox="0 0 800 520" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img">
      {all.map((ring, i) => {
        if (!visible(ring)) return null
        const r = radius(i)
        const cy = BASE_Y - r
        const topY = BASE_Y - 2 * r
        return (
          <g key={ring.id} className={entering(ring) ? 'fig-enter' : undefined}>
            <circle cx={CX} cy={cy} r={r} fill={ACCENT} fillOpacity={0.05 + i * 0.07} stroke={ACCENT} strokeOpacity={0.55} strokeWidth={1.5} />
            <text x={CX} y={topY + 30} textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="17" fill={ACCENT}>
              {ring.label}
            </text>
            {ring.sublabel && (
              <text x={CX} y={topY + 48} textAnchor="middle" fontFamily={SANS} fontSize="11.5" fill={MUTED}>
                {ring.sublabel}
              </text>
            )}
            {ring.value != null &&
              (() => {
                const { main, paren } = splitAssumption(ring.value)
                return (
                  <ValueGroup id={ring.id} value={ring.value}>
                    <text x={CX} y={topY + 67} textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="14" fill={INK}>
                      {main}
                    </text>
                    {paren && (
                      <text x={CX} y={topY + 81} textAnchor="middle" fontFamily={SANS} fontSize="10.5" fill={MUTED}>
                        ({paren})
                      </text>
                    )}
                  </ValueGroup>
                )
              })()}
          </g>
        )
      })}

      {callouts.map((c, ci) => {
        const ringIdx = all.findIndex((r) => r.id === c.ringId)
        if (ringIdx === -1 || !visible(all[ringIdx])) return null
        const r = radius(ringIdx)
        // Anchor on the ring's upper-right arc so leader lines don't overlap.
        const ax = CX + r * 0.94
        const ay = BASE_Y - r - r * 0.34
        const lines = wrap(c.text, 34)
        const ty = 110 + ci * 78
        return (
          <g key={c.id} className={entering(c) ? 'fig-enter' : undefined}>
            <line x1={ax} y1={ay} x2={550} y2={ty - 4} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
            <circle cx={ax} cy={ay} r={3} fill={ACCENT} />
            {lines.map((ln, li) => (
              <text key={li} x={558} y={ty + li * 16} fontFamily={SANS} fontSize="12.5" fill={INK}>
                {ln}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// 2×2 quadrant grid (SWOT shape): exactly four quadrants in TL,TR,BL,BR order,
// optional row/col axis labels, wrapped bullet items, callouts rendered as an
// accent note inside their quadrant.
function QuadrantFigure({ spec, visible, entering }) {
  const quads = spec.quadrants || []
  const X0 = 112
  const Y0 = 66
  const W = 668
  const H = 442
  const cw = W / 2
  const ch = H / 2

  return (
    <svg viewBox="0 0 800 520" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img">
      {(spec.cols || []).map((c, i) => (
        <text key={c} x={X0 + cw * i + cw / 2} y={Y0 - 16} textAnchor="middle" fontFamily={MONO} fontSize="11" letterSpacing="0.12em" fill={MUTED}>
          {c.toUpperCase()}
        </text>
      ))}
      {(spec.rows || []).map((rLabel, i) => {
        const cy = Y0 + ch * i + ch / 2
        return (
          <text key={rLabel} x={X0 - 18} y={cy} textAnchor="middle" fontFamily={MONO} fontSize="11" letterSpacing="0.12em" fill={MUTED} transform={`rotate(-90 ${X0 - 18} ${cy})`}>
            {rLabel.toUpperCase()}
          </text>
        )
      })}

      {quads.slice(0, 4).map((q, i) => {
        if (!visible(q)) return null
        const qx = X0 + cw * (i % 2)
        const qy = Y0 + ch * Math.floor(i / 2)
        const items = (q.items || []).filter(visible)
        const notes = (spec.callouts || []).filter((c) => c.quadrantId === q.id && visible(c))
        let lineY = qy + 58
        return (
          <g key={q.id} className={entering(q) ? 'fig-enter' : undefined}>
            <rect x={qx} y={qy} width={cw} height={ch} fill="#ffffff" stroke={RULE} strokeWidth={1} />
            <text x={qx + 16} y={qy + 30} fontFamily={SANS} fontWeight="700" fontSize="15" fill={ACCENT}>
              {q.label}
            </text>
            {items.map((it) => {
              const lines = wrap(it.text, 44)
              const startY = lineY
              lineY += lines.length * 15 + 8
              return (
                <g key={it.id} className={entering(it) ? 'fig-enter' : undefined}>
                  <circle cx={qx + 20} cy={startY - 4} r={2.2} fill={ACCENT} />
                  {lines.map((ln, li) => (
                    <text key={li} x={qx + 30} y={startY + li * 15} fontFamily={SANS} fontSize="12" fill={INK}>
                      {ln}
                    </text>
                  ))}
                </g>
              )
            })}
            {notes.map((c) => {
              const lines = wrap(`→ ${c.text}`, 46)
              const startY = lineY
              lineY += lines.length * 14 + 6
              return (
                <g key={c.id} className={entering(c) ? 'fig-enter' : undefined}>
                  {lines.map((ln, li) => (
                    <text key={li} x={qx + 16} y={startY + li * 14} fontFamily={SANS} fontStyle="italic" fontSize="11.5" fill={ACCENT}>
                      {ln}
                    </text>
                  ))}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// Optional figure heading (spec.title) — shared by the row/cascade kinds so a
// deck slide can carry its own heading inside the shape.
function FigureTitle({ title }) {
  if (!title) return null
  return (
    <text x={400} y={38} textAnchor="middle" fontFamily={SANS} fontWeight="600" fontSize="18" fill={INK}>
      {title}
    </text>
  )
}

// Tapering funnel (magnitude-cascade shape): 3-5 bands ordered TOP → BOTTOM,
// each visibly narrower than the last — the taper IS the message (TAM → SAM →
// SOM style cascades). Label + mono value centered in each band, optional sub
// carrying the assumption math.
function FunnelFigure({ spec, visible, entering }) {
  const all = spec.bands || []
  const N = Math.max(all.length, 1)
  const CX = 400
  const TOP_W = 620
  const BOT_W = 180
  const Y0 = spec.title ? 68 : 46
  const H = 520 - Y0 - 28
  const GAP = 10
  const bandH = (H - GAP * (N - 1)) / N
  const widthAt = (i) => TOP_W - ((TOP_W - BOT_W) * i) / N // edge i of N+1 edges

  return (
    <svg viewBox="0 0 800 520" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img">
      <FigureTitle title={spec.title} />
      {all.map((band, i) => {
        if (!visible(band)) return null
        const tw = widthAt(i)
        const bw = widthAt(i + 1)
        const y = Y0 + i * (bandH + GAP)
        const yc = y + bandH / 2
        return (
          <g key={band.id} className={entering(band) ? 'fig-enter' : undefined}>
            <path
              d={`M ${CX - tw / 2} ${y} L ${CX + tw / 2} ${y} L ${CX + bw / 2} ${y + bandH} L ${CX - bw / 2} ${y + bandH} Z`}
              fill={ACCENT}
              fillOpacity={0.08 + i * 0.09}
              stroke={ACCENT}
              strokeOpacity={0.55}
              strokeWidth={1.5}
            />
            <text x={CX} y={yc - 12} textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="17" fill={ACCENT}>
              {band.label}
            </text>
            {band.value != null &&
              (() => {
                const { main, paren } = splitAssumption(band.value)
                return (
                  <ValueGroup id={band.id} value={band.value}>
                    <text x={CX} y={yc + 10} textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="15" fill={INK}>
                      {main}
                    </text>
                    {paren && (
                      <text x={CX} y={yc + 25} textAnchor="middle" fontFamily={SANS} fontSize="10.5" fill={MUTED}>
                        ({paren})
                      </text>
                    )}
                  </ValueGroup>
                )
              })()}
            {band.sub && (
              <text x={CX} y={band.value != null && splitAssumption(band.value).paren ? yc + 42 : yc + 30} textAnchor="middle" fontFamily={SANS} fontSize="11.5" fill={MUTED}>
                {band.sub}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// Row of circled glyph badges (overview shape): 3-6 items, each a GLYPHS glyph
// in an accent-tinted circle with a label and optional sub. The row IS the
// content — "here are the N things" slides, not decoration.
function IconRowFigure({ spec, visible, entering }) {
  const all = spec.items || []
  const N = Math.max(all.length, 1)
  const CY = spec.title ? 218 : 200
  const R = N > 4 ? 42 : 48
  const slot = 800 / N
  const wrapChars = N > 4 ? 14 : 22

  return (
    <svg viewBox="0 0 800 520" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img">
      <FigureTitle title={spec.title} />
      {all.map((it, i) => {
        if (!visible(it)) return null
        const cx = slot * i + slot / 2
        const gs = R * 0.96 // glyph box size
        const labelLines = wrap(it.label, wrapChars)
        const subLines = it.sub ? wrap(it.sub, wrapChars + 6) : []
        const labelY = CY + R + 32
        return (
          <g key={it.id} className={entering(it) ? 'fig-enter' : undefined}>
            <circle cx={cx} cy={CY} r={R} fill={ACCENT} fillOpacity={0.06} stroke={ACCENT} strokeOpacity={0.55} strokeWidth={1.5} />
            <svg
              x={cx - gs / 2}
              y={CY - gs / 2}
              width={gs}
              height={gs}
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {GLYPHS[it.glyph] || null}
            </svg>
            {labelLines.map((ln, li) => (
              <text key={li} x={cx} y={labelY + li * 19} textAnchor="middle" fontFamily={SANS} fontWeight="600" fontSize="15" fill={INK}>
                {ln}
              </text>
            ))}
            {subLines.map((ln, li) => (
              <text key={li} x={cx} y={labelY + labelLines.length * 19 + 6 + li * 15} textAnchor="middle" fontFamily={SANS} fontSize="11.5" fill={MUTED}>
                {ln}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// Horizontal bars (comparison shape): 2-6 bars, label above, width ∝ ratio
// (0–1 of the widest), mono value pinned at the bar's end. A muted track shows
// the full scale so relative magnitude reads at a glance.
function BarsFigure({ spec, visible, entering }) {
  const all = spec.bars || []
  const N = Math.max(all.length, 1)
  const X0 = 70
  const MAX_W = 540
  const topPad = spec.title ? 76 : 52
  const rowH = Math.min(96, (520 - topPad - 32) / N)
  const startY = topPad + ((520 - topPad - 32) - rowH * N) / 2

  return (
    <svg viewBox="0 0 800 520" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img">
      <FigureTitle title={spec.title} />
      {all.map((bar, i) => {
        if (!visible(bar)) return null
        const y = startY + i * rowH
        const w = Math.max(MAX_W * Math.min(Math.max(bar.ratio ?? 0, 0), 1), 8)
        const barY = y + 24
        return (
          <g key={bar.id} className={entering(bar) ? 'fig-enter' : undefined}>
            <text x={X0} y={y + 14} fontFamily={SANS} fontWeight="600" fontSize="14" fill={INK}>
              {bar.label}
            </text>
            <rect x={X0} y={barY} width={MAX_W} height={26} rx={3} fill={RULE} fillOpacity={0.45} />
            <rect x={X0} y={barY} width={w} height={26} rx={3} fill={ACCENT} fillOpacity={0.85} />
            {(() => {
              const { main, paren } = splitAssumption(bar.value)
              return (
                <ValueGroup id={bar.id} value={bar.value}>
                  <text x={X0 + w + 12} y={barY + 18} fontFamily={MONO} fontWeight="700" fontSize="13" fill={INK}>
                    {main}
                  </text>
                  {paren && (
                    <text x={X0 + w + 12} y={barY + 40} fontFamily={SANS} fontSize="10.5" fill={MUTED}>
                      ({paren})
                    </text>
                  )}
                </ValueGroup>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}

// Side-by-side SCOREBOARD (comparison shape): 2-4 columns (e.g. competing
// arcs) with 1-8 labeled rows (metrics) filled beneath each — an HTML grid
// rather than SVG (real DOM text reads far better than wrapped SVG <text> for
// this much prose, per pattern). Unfilled cells show a subtle em-dash until a
// value lands via a live [FIG: key :: colId.rowId=value]; columns may carry
// `step` for staged reveal (rows are structural — always visible, the grid's
// shape itself doesn't build up, only its column set can).
function MatrixFigure({ spec, visible, entering }) {
  const cols = (spec.cols || []).filter(visible)
  const rows = spec.rows || []
  const cells = spec.cells || {}
  const gridTemplateColumns = `minmax(96px, auto) repeat(${Math.max(cols.length, 1)}, minmax(112px, 1fr))`

  return (
    <div className="w-full h-full overflow-auto flex flex-col items-center justify-center px-4 py-4">
      {spec.title && <p className="font-sans font-semibold text-[15px] text-ink mb-4 text-center px-2">{spec.title}</p>}
      <div className="w-full" style={{ maxWidth: 720 }}>
        <div className="grid" style={{ gridTemplateColumns }}>
          <div />
          {cols.map((c) => (
            <div key={c.id} className={`px-2 pb-3 text-center border-b-2 border-accent ${entering(c) ? 'fig-enter' : ''}`}>
              <div className="font-sans font-semibold text-[13px] text-accent leading-tight">{c.label}</div>
              {c.sub && <div className="font-sans text-[10.5px] text-muted mt-1 leading-snug">{c.sub}</div>}
            </div>
          ))}
          {rows.map((r) => (
            <Fragment key={r.id}>
              <div className="pr-2 py-2.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted border-t border-rule flex items-center">
                {r.label}
              </div>
              {cols.map((c) => {
                const cellKey = `${c.id}.${r.id}`
                const raw = cells[cellKey]
                const filled = raw != null && raw !== ''
                const { main, paren } = filled ? splitAssumption(raw) : { main: null, paren: null }
                return (
                  <div key={cellKey} className="px-2 py-2.5 text-center border-t border-rule flex items-center justify-center">
                    {filled ? (
                      <ValueGroup id={cellKey} value={raw} as="div">
                        <div className="font-mono font-semibold text-[13px] text-ink">{main}</div>
                        {paren && <div className="font-sans text-[10px] text-muted mt-0.5">({paren})</div>}
                      </ValueGroup>
                    ) : (
                      <span className="font-mono text-[13px] text-muted opacity-40">—</span>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

const KINDS = {
  concentric: ConcentricFigure,
  quadrant: QuadrantFigure,
  funnel: FunnelFigure,
  iconrow: IconRowFigure,
  bars: BarsFigure,
  matrix: MatrixFigure,
}

// Shared with DeckCanvas: a `figure` deck frame embeds one of these renderers
// frozen at a fixed step (a slide shows one build state; live step-advance stays
// a `figure` canvas-type concern). New kinds land in KINDS and both paths get them.
export const FIGURE_KIND_RENDERERS = KINDS

// `step` in payload is the SERVER-resolved frontier — it only moves via a
// Director [SHOW: key@step]. The learner may freely browse BACKWARD/FORWARD
// within [0, frontier] (prev/next, dots, swipe) without a round trip; going
// past the frontier would spoil material the conversation hasn't reached yet,
// so Next caps there (mirrors DeckCanvas's maxVisited-frontier pulse, but the
// frontier itself is server-driven here instead of learner-driven).
export default function FigureCanvas({ payload, onLiveState }) {
  const { kind, spec = {}, step: frontier = 0 } = payload
  const steps = spec.steps || []

  // Local, learner-navigable position. Synced to the server frontier only when
  // the frontier itself actually MOVES (a real Director advance) — a live
  // [FIG:] value update that leaves the frontier unchanged must never yank the
  // learner back to a step they've navigated away from.
  const [localStep, setLocalStep] = useState(frontier)
  const [localMaxVisited, setLocalMaxVisited] = useState(frontier)
  const lastFrontierRef = useRef(frontier)
  const dirRef = useRef('advance')
  const prevLocalRef = useRef(frontier)

  useEffect(() => {
    if (frontier !== lastFrontierRef.current) {
      dirRef.current = frontier > lastFrontierRef.current ? 'advance' : 'retreat'
      lastFrontierRef.current = frontier
      setLocalStep(frontier)
      setLocalMaxVisited((m) => Math.max(m, frontier))
    }
  }, [frontier])

  useEffect(() => {
    prevLocalRef.current = localStep
    onLiveState?.({ figStep: localStep, stepId: steps[localStep] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStep])

  const prev = prevLocalRef.current
  const idxOf = (s) => (s === undefined ? -1 : steps.indexOf(s))
  const visible = (el) => idxOf(el.step) <= localStep
  const entering = (el) => {
    const i = idxOf(el.step)
    return i > prev && i <= localStep
  }

  const go = (d) => {
    setLocalStep((s) => {
      const n = Math.max(0, Math.min(frontier, s + d))
      dirRef.current = d > 0 ? 'advance' : 'retreat'
      setLocalMaxVisited((m) => Math.max(m, n))
      return n
    })
  }
  const goTo = (i) => {
    if (i > frontier) return // not yet unlocked by the conversation
    dirRef.current = i > localStep ? 'advance' : 'retreat'
    setLocalStep(i)
    setLocalMaxVisited((m) => Math.max(m, i))
  }
  const pulseNext = localStep === localMaxVisited && localStep < frontier

  // Swipe to advance/retreat (touch + pen + mouse-drag), same 48px horizontal-
  // dominant threshold as DeckCanvas. A plain object here would be discarded on
  // every re-render (streaming deltas re-render this a lot); a ref survives.
  const swipeRef = useRef({ x: 0, y: 0, id: null })
  function swipeStart(e) {
    swipeRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  function swipeEnd(e) {
    const s = swipeRef.current
    if (s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
    swipeRef.current = { x: 0, y: 0, id: null }
  }

  const Kind = KINDS[kind]
  if (!Kind) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className="font-mono text-[12px] text-muted">Unknown figure kind: {kind}</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex items-center justify-center px-4 py-3"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={swipeStart}
        onPointerUp={swipeEnd}
      >
        <div
          key={`step-${localStep}`}
          className={`w-full h-full flex items-center justify-center ${dirRef.current === 'retreat' ? 'step-enter-retreat' : 'step-enter-advance'}`}
        >
          <Kind spec={spec} visible={visible} entering={entering} />
        </div>
      </div>
      {steps.length > 1 && (
        <div className="shrink-0 border-t border-rule bg-white flex items-center justify-between px-4 py-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={localStep === 0}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent disabled:opacity-30"
          >
            ← Prev
          </button>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {steps[localStep] ?? localStep}
            </span>
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={i > frontier}
                  aria-label={`Step ${i + 1}`}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === localStep ? 'bg-accent' : i <= frontier ? 'bg-rule hover:bg-accent/40' : 'bg-rule opacity-40'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {localStep + 1}/{steps.length}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={localStep >= frontier}
              className={`font-mono text-[11px] uppercase tracking-[0.14em] disabled:opacity-30 rounded-md px-2.5 py-1 transition ${
                pulseNext ? 'text-white bg-accent pulse-cue' : 'text-accent'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
