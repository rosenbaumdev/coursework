// GET /api/me → { email, isAdmin, courses }. The client uses this to know who it's
// talking to (admin? which courses?) and to detect an expired Access session. Safe for
// anonymous callers — it just returns { email:'', isAdmin:false, courses:[] }, so the
// default-deny middleware lets it through.

import { getIdentity } from '../_access.js'

export async function onRequestGet({ request, env }) {
  const identity = await getIdentity(request, env)
  return new Response(JSON.stringify(identity), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
