// PTY <-> WebSocket bridge. Runs as an UNPRIVILEGED per-workshop unix user (one
// systemd instance per user, `coursework-bridge@<user>`), binds localhost only,
// token-gated. Each user's bridge sees only that user's home, files, tmux, and
// ~/.claude — the isolation boundary is the unix account, enforced by systemd
// `User=%i`; this process never elevates.
//
// The PTY attaches to a PERSISTENT tmux session ("course") via attach-or-create,
// so a dropped or idle socket re-attaches to the SAME shell — a running `claude`,
// the cwd, and scrollback all survive — instead of spawning a fresh login shell.
// Killing this PTY on disconnect only detaches the tmux client; the tmux server
// and session keep running (even across bridge restarts), so the next connection
// resumes exactly where the last one left off. A server-side ping heartbeat keeps
// the cloudflared tunnel socket from idling out mid-session.
//
// Per-user config comes from /etc/coursework/<user>.env (EnvironmentFile):
//   PORT           this user's bridge port (unique per user)
//   TERM_TOKEN     this user's token (unique per user; matched by the app's
//                  TERMINAL_TOKEN_<USER> secret)
//   WORKSPACE_DIR  /home/<user>/app
//   TMUX_SESSION   "course" (per-user namespace — different unix user = different
//                  tmux server, so the shared name is fine and independent)
import { WebSocketServer } from 'ws'
import ptyMod from '@lydell/node-pty'
import crypto from 'node:crypto'
const pty = ptyMod.default || ptyMod
const PORT = Number(process.env.PORT || 7681)
// Auth accepts EITHER a legacy per-user static token (TERM_TOKEN, being retired) OR a
// signed short-lived token (Phase I): HMAC-SHA256 over the payload with the shared
// WORKSHOP_SIGNING_SECRET, whose `u` claim must equal THIS bridge's WORKSHOP_USER and
// which must not be expired. Accepting both = zero-downtime cutover.
const STATIC_TOKEN = process.env.TERM_TOKEN || ''
const SIGNING_SECRET = process.env.WORKSHOP_SIGNING_SECRET || ''
const WORKSHOP_USER = process.env.WORKSHOP_USER || ''
if (!STATIC_TOKEN && !(SIGNING_SECRET && WORKSHOP_USER)) {
  console.error('refusing to start: need TERM_TOKEN (legacy) or WORKSHOP_SIGNING_SECRET + WORKSHOP_USER (signed)')
  process.exit(1)
}
const SESSION = process.env.TMUX_SESSION || 'course'

// Must stay byte-compatible with functions/_workshopToken.js (proven by interop test).
function verifySignedToken(token) {
  if (!SIGNING_SECRET || !WORKSHOP_USER || !token) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const payloadB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payloadB64).digest()
  let given
  try { given = Buffer.from(sigB64, 'base64url') } catch { return false }
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false
  let payload
  try { payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) } catch { return false }
  return payload.u === WORKSHOP_USER && typeof payload.exp === 'number' && payload.exp >= Math.floor(Date.now() / 1000)
}
function tokenAccepted(token) {
  if (STATIC_TOKEN && token === STATIC_TOKEN) return true // legacy static (transition)
  return verifySignedToken(token) // signed, user-claim-bound, short-lived
}

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT })
console.log(`[bridge] 127.0.0.1:${PORT} user="${WORKSHOP_USER || '(legacy)'}" auth=${[STATIC_TOKEN && 'static', SIGNING_SECRET && 'signed'].filter(Boolean).join('+')} tmux="${SESSION}"`)

wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://x').searchParams.get('token')
  if (!tokenAccepted(token)) { ws.close(4001, 'bad token'); return }

  // Attach-or-create the persistent session inside a login shell so PATH/env match
  // an interactive login (claude, node, etc. resolve). `exec` replaces the login
  // bash with tmux so there's no stray parent process. Runs as this systemd
  // instance's unix user, in that user's WORKSPACE_DIR, with that user's HOME
  // (systemd sets $HOME from the account) — so `claude` reads /home/<user>/.claude.
  const term = pty.spawn('bash', ['-lc', `exec tmux new-session -A -s ${SESSION}`], {
    name: 'xterm-256color', cols: 80, rows: 24, cwd: process.env.WORKSPACE_DIR || process.env.HOME, env: process.env,
  })
  term.onData((d) => { try { ws.send(d) } catch {} })
  term.onExit(({ exitCode }) => { try { ws.close(1000, `exit ${exitCode}`) } catch {} })

  ws.on('message', (raw) => {
    const s = raw.toString()
    if (s.startsWith('{')) { try { const m = JSON.parse(s); if (m.type === 'resize') return term.resize(m.cols, m.rows) } catch {} }
    term.write(s)
  })

  // Heartbeat: periodic ping keeps the tunnel socket alive through idle periods and
  // reaps a truly dead connection (no pong) so it doesn't linger.
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })
  const hb = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return
    if (ws.isAlive === false) { try { ws.terminate() } catch {} ; return }
    ws.isAlive = false
    try { ws.ping() } catch {}
  }, 25000)

  // Detach (kill the client PTY) on disconnect — the tmux session lives on.
  ws.on('close', () => { clearInterval(hb); try { term.kill() } catch {} })
})
