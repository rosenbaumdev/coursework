// Coached-session data contracts. These are the two seams that let the v1 mock
// and the future real engine share the exact same UI shell.
//
// SEAM 1 — DriverState: SessionView depends ONLY on this. v1 fills it from a
//   scripted array (useScriptedSessionDriver); v2 fills it from the SSE stream
//   (a copy of InterviewView's send() loop). Same shape → SessionView unchanged.
//
// SEAM 2 — CanvasDirective: what the session tells the canvas to show. v1 carries
//   a full inline directive per scripted turn; v2 emits a [SHOW: <target>] control
//   tag (parsed like the existing [TICK:]/[TABLE:]/[SUGGESTED_REPLIES:] tags) that
//   a resolveShowTarget(target) registry maps to this SAME shape. Canvas layer is
//   reused untouched.

/**
 * @typedef {'reading'|'deck'|'video'|'image'|'browser'|'terminal'|'artifact'} CanvasType
 */

/**
 * @typedef {Object} CanvasDirective
 * @property {CanvasType} type
 * @property {string} id       Stable id → used as the React key so the canvas
 *                             remounts (and re-animates) when the directive changes.
 * @property {string} [title]  Shown in the canvas header strip.
 * @property {Object} payload   Shape depends on `type` — see the per-type table in
 *                              the plan / each *Canvas.jsx renderer.
 */

/**
 * @typedef {Object} SessionTurn
 * @property {string} assistant             Assistant markdown (rendered in a Bubble).
 * @property {string[]} chips               Suggested replies for THIS turn.
 * @property {CanvasDirective|null} canvas  Directive applied on reaching this turn
 *                                          (null = leave the canvas as-is).
 * @property {number} [tick]                Objectives ticked on this turn (progress).
 */

/**
 * @typedef {Object} DriverState
 * @property {'active'|'done'} phase
 * @property {{role:'user'|'assistant', content:string}[]} messages
 * @property {string[]} suggestions
 * @property {CanvasDirective|null} canvas
 * @property {{ticked:number, totalRequired:number, focus:string}} progress
 * @property {boolean} sending
 * @property {(text:string)=>void} send
 */

export {}
