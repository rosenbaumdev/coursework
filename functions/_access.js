// App-side authorization (Phase II). Cloudflare Access authenticates WHO you are — it
// verifies identity at the edge and hands the Function a signed JWT (the
// `Cf-Access-Authenticated-User-Email` header is NOT forwarded to Pages; the JWT is, in
// the `Cf-Access-Jwt-Assertion` header and the `CF_Authorization` cookie). THIS layer
// verifies that JWT against the Access team's public keys and decides WHAT the identity
// may reach. Default-deny.
//
// Why verify (not just decode): the admin boundary gates the whole platform. `Cf-*`
// request headers are stripped from client input by Cloudflare (so the assertion header
// can't be forged), but we still verify the RS256 signature + issuer + expiry against the
// team JWKS so identity is cryptographically sound regardless of transport.
//
// Grant sources (most-authoritative first):
//   - BOOTSTRAP_ADMINS env (comma-separated) — full access, can't be locked out.
//   - R2 admin/access.json (private INTERVIEW bucket):
//       { "admins": ["a@x.com"], "grants": { "learner@x.com": ["zachary"] } }

// Access team + application audience. Public identifiers (from the Access login flow), not
// secrets; env-overridable so a team/app change needs no code edit.
const ACCESS_TEAM_DOMAIN = 'flat-heart-d5af.cloudflareaccess.com'
const ACCESS_AUD = 'd83de7fb3460b6287e2e678cbb077313163c0b761588bd0a5981b06424b67d33'
const GRANTS_KEY = 'admin/access.json'
const GRANTS_TTL_MS = 15_000
const JWKS_TTL_MS = 60 * 60 * 1000

function teamDomain(env) { return env?.ACCESS_TEAM_DOMAIN || ACCESS_TEAM_DOMAIN }
function expectedAud(env) { return env?.ACCESS_AUD || ACCESS_AUD }

// --- base64url helpers ---
function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function b64urlToJson(s) {
  try { return JSON.parse(new TextDecoder().decode(b64urlToBytes(s))) } catch { return null }
}

// --- Access JWT verification ---
let _jwks = null
let _jwksAt = 0
async function getJwks(env, { fresh = false } = {}) {
  const now = Date.now()
  if (!fresh && _jwks && now - _jwksAt < JWKS_TTL_MS) return _jwks
  try {
    const res = await fetch(`https://${teamDomain(env)}/cdn-cgi/access/certs`)
    const data = await res.json()
    _jwks = Array.isArray(data.keys) ? data.keys : []
    _jwksAt = now
  } catch {
    if (!_jwks) _jwks = []
  }
  return _jwks
}

function getAccessToken(request) {
  const header = request.headers.get('cf-access-jwt-assertion')
  if (header) return header.trim()
  const raw = request.headers.get('cookie') || ''
  const m = raw.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

// Verify RS256 signature + aud + iss + exp; return the payload or null.
async function verifyAccessJwt(token, env) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, sig] = parts
  const header = b64urlToJson(h)
  const payload = b64urlToJson(p)
  if (!header || !payload) return null

  if (payload.exp && Date.now() / 1000 > payload.exp) return null
  if (payload.iss && payload.iss !== `https://${teamDomain(env)}`) return null
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!auds.includes(expectedAud(env))) return null

  let keys = await getJwks(env)
  let jwk = keys.find((k) => k.kid === header.kid)
  if (!jwk) { keys = await getJwks(env, { fresh: true }); jwk = keys.find((k) => k.kid === header.kid) }
  if (!jwk) return null
  try {
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    )
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`),
    )
    return ok ? payload : null
  } catch {
    return null
  }
}

export async function getVerifiedEmail(request, env) {
  // LOCAL DEV ONLY: .dev.vars supplies DEV_ADMIN_EMAIL so /admin works at localhost:8788
  // without a real Cloudflare Access JWT. .dev.vars is gitignored and NOT deployed
  // (`wrangler pages deploy` ignores it), so this can never fire in production.
  if (env?.DEV_ADMIN_EMAIL) return String(env.DEV_ADMIN_EMAIL).trim().toLowerCase()

  const token = getAccessToken(request)
  if (!token) return ''
  const payload = await verifyAccessJwt(token, env)
  const email = payload?.email || payload?.identity || ''
  return String(email).trim().toLowerCase()
}

// --- grants store ---
function bootstrapAdmins(env) {
  return (env?.BOOTSTRAP_ADMINS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

let _cache = null
let _cacheAt = 0
export async function loadGrants(env, { fresh = false } = {}) {
  const now = Date.now()
  if (!fresh && _cache && now - _cacheAt < GRANTS_TTL_MS) return _cache
  let data = null
  try {
    const obj = await env.INTERVIEW.get(GRANTS_KEY)
    data = obj ? await obj.json() : null
  } catch { data = null }
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

// --- identity + checks ---
export async function getIdentity(request, env) {
  const email = await getVerifiedEmail(request, env)
  if (!email) return { email: '', isAdmin: false, courses: [] }
  const grants = await loadGrants(env)
  const admins = new Set([...bootstrapAdmins(env), ...grants.admins.map((s) => String(s).toLowerCase())])
  if (admins.has(email)) return { email, isAdmin: true, courses: ['*'] }
  return { email, isAdmin: false, courses: (grants.grants[email] || []).map(String) }
}

export async function canAccess(request, env, slug) {
  const id = await getIdentity(request, env)
  return Boolean(id.email) && (id.isAdmin || id.courses.includes(slug))
}

export async function isAdmin(request, env) {
  return (await getIdentity(request, env)).isAdmin
}

// Self-gate for admin endpoints. These MUST guard themselves (not rely on the middleware
// default-deny, which is dark behind AUTHZ_ENFORCE) — otherwise anyone past CF Access could
// read every learner's data. Returns a 403 Response to short-circuit, or null if admin.
export async function requireAdmin(request, env) {
  if ((await getIdentity(request, env)).isAdmin) return null
  return new Response(JSON.stringify({ error: 'Admin only' }), {
    status: 403,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
