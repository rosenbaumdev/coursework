// Hostname-branching front door (runs ahead of routing for every request):
//  - play.kitbord.com  → serve a shipped game snapshot from R2 (PUBLIC; this host is
//    outside Cloudflare Access by design, so a friend's share link just works).
//  - jordan-sports-betting.kitbord.com → 301 to the canonical coursework.kitbord.com/jordan.
//  - everything else → normal app routing.

import { PLAY_HOST } from './_session.js'
import { getIdentity } from './_access.js'

// Default-deny authorization (Phase II). Runs only when AUTHZ_ENFORCE is set, so the
// code can ship DARK (deployed, no behavior change), be verified via /api/me, have grants
// populated, and only THEN be switched on — right before the CF Access policy is widened.
// Gates data APIs; the SPA shell + static assets pass (all sensitive data is behind /api).
function denied(status) {
  return new Response(JSON.stringify({ error: status === 401 ? 'Not signed in' : 'Not authorized' }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
async function enforceAuthz(request, env, url) {
  const path = url.pathname
  const isApi = path.startsWith('/api/') || /^\/[^/]+\/api\//.test(path)
  if (!isApi) return null // HTML / assets — harmless shell; data is gated below
  if (path === '/api/me') return null // identity probe, safe for anon (returns empty identity)
  const id = await getIdentity(request, env) // verifies the Access JWT
  if (!id.email) return denied(401) // gated route + no verified identity → fail closed
  if (path.startsWith('/api/admin')) return id.isAdmin ? null : denied(403)
  const m = path.match(/^\/([^/]+)\/api\//) // learner API: /<slug>/api/...
  if (m) return (id.isAdmin || id.courses.includes(m[1])) ? null : denied(403)
  return null // any other authenticated /api/* call
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url)

  // Shipped-game host: /<student>/<course>/day-<id> → R2 key ships/<same>.html.
  if (url.hostname === PLAY_HOST) {
    const rel = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
    if (!rel || rel.includes('..')) {
      return new Response('Nothing shipped here yet.', { status: 404, headers: { 'content-type': 'text/plain' } })
    }
    const object = await env.STORAGE.get(`ships/${rel}.html`)
    if (!object) {
      return new Response('This game link is empty or has expired.', { status: 404, headers: { 'content-type': 'text/plain' } })
    }
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('content-type', 'text/html; charset=utf-8')
    headers.set('cache-control', 'public, max-age=60')
    return new Response(object.body, { headers })
  }

  if (url.hostname === 'jordan-sports-betting.kitbord.com') {
    const dest = new URL(url)
    dest.hostname = 'coursework.kitbord.com'
    dest.pathname = '/jordan' + url.pathname
    return Response.redirect(dest.toString(), 301)
  }

  // App-side authorization — dark until AUTHZ_ENFORCE is set (see enforceAuthz above).
  if (env.AUTHZ_ENFORCE) {
    const blocked = await enforceAuthz(request, env, url)
    if (blocked) return blocked
  }
  return next()
}
