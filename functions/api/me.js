// GET /api/me → { email, isAdmin, courses }. The client uses this to know who it's
// talking to (admin? which courses?) and to detect an expired Access session. Safe for
// anonymous callers — it returns { email:'', isAdmin:false, courses:[] }, so the
// default-deny middleware lets it through.
//
// ?debug=1 → also returns a _debug block describing what identity material actually
// reached the Function (Access forwards identity to Pages as the CF_Authorization JWT
// cookie, not always as the Cf-Access-* header). Shows names/presence, not secret values.

import { getIdentity } from '../_access.js'

export async function onRequestGet({ request, env }) {
  const identity = await getIdentity(request, env)
  const url = new URL(request.url)
  let body = identity
  if (url.searchParams.get('debug') === '1') {
    const h = request.headers
    const cookieHeader = h.get('cookie') || ''
    const cookieNames = cookieHeader.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean)
    // Decode (NOT verify) the assertion payload just to surface aud/iss/email for config
    // sanity — verification for real identity happens in getIdentity above.
    let claims = null
    const token = h.get('cf-access-jwt-assertion') || ''
    try {
      const p = token.split('.')[1]
      if (p) {
        const b64 = p.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(p.length / 4) * 4, '=')
        const c = JSON.parse(atob(b64))
        claims = { email: c.email || c.identity || null, aud: c.aud, iss: c.iss, exp: c.exp }
      }
    } catch { claims = 'decode-failed' }
    body = {
      ...identity,
      _debug: {
        verifiedEmail: identity.email || null, // non-empty ⇒ JWT verification succeeded
        emailHeader: h.get('cf-access-authenticated-user-email') || null,
        jwtAssertionHeaderPresent: Boolean(token),
        cfAuthorizationCookiePresent: cookieNames.includes('CF_Authorization'),
        tokenClaims: claims,
        cookieNames,
        cfHeaderNames: [...h.keys()].filter((k) => k.startsWith('cf-')),
      },
    }
  }
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
