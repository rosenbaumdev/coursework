// Hostname-branching front door (runs ahead of routing for every request):
//  - play.kitbord.com  → serve a shipped game snapshot from R2 (PUBLIC; this host is
//    outside Cloudflare Access by design, so a friend's share link just works).
//  - jordan-sports-betting.kitbord.com → 301 to the canonical coursework.kitbord.com/jordan.
//  - everything else → normal app routing.

import { PLAY_HOST } from './_session.js'
import { getIdentity } from './_access.js'
import { primeStudents, getStudent } from './_students.js'

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
// Which paths carry learner/platform DATA and must pass the gate. Per-learner data lives
// at /<slug>/api/* (session, interview, assets, workshop token) AND /<slug>/files/*
// (course materials streamed from R2); platform data lives at /api/*. Everything else
// (SPA shell + static assets) carries no data — the shell renders nothing without a gated API.
function isGatedPath(path) {
  return /^\/[^/]+\/(?:api|files)\//.test(path) || path.startsWith('/api/')
}

// The owning learner when the FIRST path segment names a known learner. Covers BOTH their
// HTML routes (/<slug>, /<slug>/session, /<slug>/interview) and their data (/<slug>/api|files/*).
// The SPA renders a learner's course shell from a static client bundle + the public course md
// with NO gated API call, so the HTML route itself must be gated — not just the data behind it.
function learnerScope(path) {
  const seg = path.split('/')[1] || ''
  return seg && getStudent(seg) ? seg : null
}

// Pure default-deny decision for a DATA path (api/files/admin). null=ALLOW, 401/403=DENY.
// Exported for tests. Only call for isGatedPath other than /api/me.
export function authzDecision(path, id) {
  if (!id.email) return 401 // gated route + no verified identity → fail closed
  if (path.startsWith('/api/admin')) return id.isAdmin ? null : 403
  const learner = path.match(/^\/([^/]+)\/(?:api|files)\//) // captures the owning slug
  if (learner) return (id.isAdmin || id.courses.includes(learner[1])) ? null : 403
  return null // top-level /api/* that isn't admin (only /api/me + /api/admin exist today)
}

// Pure access decision over a resolved identity. Returns null (ALLOW), {status} (deny DATA
// with JSON 401/403), or {redirect:true} (an HTML learner route the identity can't see — the
// caller redirects them to their OWN course so no one ever loads another learner's shell).
// `slug` = learnerScope(path); `dataPath` = isGatedPath(path). Exported for tests.
export function accessAction(path, id, slug, dataPath) {
  if (path === '/api/me') return null // identity probe, safe for anon
  if (!slug && !dataPath) return null // no learner scope, not an API — shell/assets pass
  if (dataPath) {
    const status = authzDecision(path, id)
    return status ? { status } : null
  }
  // Learner HTML route: owner + admins pass; everyone else is redirected away.
  if (!id.email) return { status: 401 } // only reachable via the no-Access pages.dev alias
  if (id.isAdmin || id.courses.includes(slug)) return null
  return { redirect: true }
}

async function enforceAuthz(request, env, url) {
  const path = url.pathname
  const slug = learnerScope(path)
  const dataPath = isGatedPath(path)
  if (path === '/api/me' || (!slug && !dataPath)) return null // fast path — no identity needed
  const id = await getIdentity(request, env) // verifies the Access JWT (only when scoped/gated)
  const action = accessAction(path, id, slug, dataPath)
  if (!action) return null
  if (action.status) return denied(action.status)
  // redirect an unauthorized learner to their own course (or the splash if they have none)
  const own = id.courses.find((c) => c && c !== '*')
  return Response.redirect(new URL(own ? `/${own}` : '/', url).toString(), 302)
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

  // Refresh the code-seed + registry merged view so registry-created learners resolve
  // (getStudent stays sync everywhere). Cheap: 15s module cache, never throws.
  await primeStudents(env)

  // App-side authorization — dark until AUTHZ_ENFORCE is set (see enforceAuthz above).
  if (env.AUTHZ_ENFORCE) {
    const blocked = await enforceAuthz(request, env, url)
    if (blocked) return blocked
  }

  const res = await next()

  // Never let a SHARED/edge cache store a learner-scoped response. Cloudflare caches cacheable
  // GETs keyed by URL (not by identity), so a cached response gets served to OTHER identities
  // WITHOUT re-running the gate above — observed live: CF served a stale /<slug>/api/student 200
  // past the gate. This applies to BOTH the data APIs (/api/*, /<slug>/api/*) AND the learner
  // HTML routes (/<slug>, /<slug>/session) — a cached shell would let another learner load it
  // without the redirect firing. Force no-store on all of them so every request re-runs the gate.
  // (Files use `private` at their route — browser-cacheable, never shared. Non-learner HTML +
  // static assets stay cacheable: they carry no learner data and every user gets the same bytes.)
  if (isApiPath(url.pathname) || learnerScope(url.pathname)) {
    const headers = new Headers(res.headers)
    headers.set('cache-control', 'no-store')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  }
  return res
}

// API surface (platform + per-learner): never shared-cacheable. Broader than the auth gate's
// isGatedPath only in intent — same api paths, minus /files (handled at the files route).
function isApiPath(path) {
  return path.startsWith('/api/') || /^\/[^/]+\/api\//.test(path)
}
