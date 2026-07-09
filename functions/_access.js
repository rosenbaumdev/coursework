// App-side authorization (Phase II). Cloudflare Access authenticates WHO you are — it
// verifies identity at the edge and injects a signed `Cf-Access-Authenticated-User-Email`
// header. THIS layer decides WHAT that identity may reach. Default-deny.
//
// Overlaid sources, most-authoritative first:
//   - BOOTSTRAP_ADMINS env (comma-separated emails) — full access, cannot be locked out
//     even if the grants file is empty/corrupt. Set as a Pages secret, never committed.
//   - grants store in R2 (private INTERVIEW bucket) at admin/access.json:
//       { "admins": ["a@x.com"], "grants": { "learner@x.com": ["zachary"] } }
//
// Identity comes ONLY from the Access header (never client-supplied / query / body). No
// header → anonymous → denied on any gated route. Public paths (the shipped-game host)
// are handled upstream in _middleware BEFORE authz runs, so they stay open.

const ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email'
const GRANTS_KEY = 'admin/access.json'
const GRANTS_TTL_MS = 15_000

export function getEmail(request) {
  return (request.headers.get(ACCESS_EMAIL_HEADER) || '').trim().toLowerCase()
}

function bootstrapAdmins(env) {
  return (env?.BOOTSTRAP_ADMINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

// Best-effort per-isolate cache so a gated request doesn't hit R2 every time.
let _cache = null
let _cacheAt = 0
export async function loadGrants(env, { fresh = false } = {}) {
  const now = Date.now()
  if (!fresh && _cache && now - _cacheAt < GRANTS_TTL_MS) return _cache
  let data = null
  try {
    const obj = await env.INTERVIEW.get(GRANTS_KEY)
    data = obj ? await obj.json() : null
  } catch {
    data = null
  }
  _cache = data && typeof data === 'object' ? data : { admins: [], grants: {} }
  _cache.admins ||= []
  _cache.grants ||= {}
  _cacheAt = now
  return _cache
}

export async function saveGrants(env, grants) {
  const clean = { admins: grants.admins || [], grants: grants.grants || {} }
  await env.INTERVIEW.put(GRANTS_KEY, JSON.stringify(clean, null, 2))
  _cache = clean
  _cacheAt = Date.now()
  return clean
}

// { email, isAdmin, courses } — courses is ['*'] for an admin, else the granted slugs.
export async function getIdentity(request, env) {
  const email = getEmail(request)
  if (!email) return { email: '', isAdmin: false, courses: [] }
  const grants = await loadGrants(env)
  const admins = new Set([...bootstrapAdmins(env), ...grants.admins.map((s) => String(s).toLowerCase())])
  if (admins.has(email)) return { email, isAdmin: true, courses: ['*'] }
  const courses = (grants.grants[email] || []).map(String)
  return { email, isAdmin: false, courses }
}

export async function canAccess(request, env, slug) {
  const id = await getIdentity(request, env)
  if (!id.email) return false
  return id.isAdmin || id.courses.includes(slug)
}

export async function isAdmin(request, env) {
  return (await getIdentity(request, env)).isAdmin
}
