import { useEffect, useRef } from 'react'

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
            {ring.value != null && (
              <text x={CX} y={topY + 67} textAnchor="middle" fontFamily={MONO} fontSize="13" fill={INK}>
                {ring.value}
              </text>
            )}
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

const KINDS = { concentric: ConcentricFigure, quadrant: QuadrantFigure }

export default function FigureCanvas({ payload }) {
  const { kind, spec = {}, step = 0 } = payload
  const steps = spec.steps || []
  // Previous step, so only NEWLY-visible elements animate on a step advance
  // (same directive.id keeps this mounted across [SHOW: key@step]).
  const prevRef = useRef(step)
  useEffect(() => {
    prevRef.current = step
  }, [step])
  const prev = prevRef.current

  const idxOf = (s) => (s === undefined ? -1 : steps.indexOf(s))
  const visible = (el) => idxOf(el.step) <= step
  const entering = (el) => {
    const i = idxOf(el.step)
    return i > prev && i <= step
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
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-3">
        <Kind spec={spec} visible={visible} entering={entering} />
      </div>
      {steps.length > 1 && (
        <div className="shrink-0 border-t border-rule bg-white flex items-center justify-between px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {steps[step] ?? step}
          </span>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span key={s} className={`h-1.5 w-1.5 rounded-full ${i <= step ? 'bg-accent' : 'bg-rule'}`} />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {step + 1}/{steps.length}
          </span>
        </div>
      )}
    </div>
  )
}
