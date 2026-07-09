// Hostname-branching front door (runs ahead of routing for every request):
//  - play.kitbord.com  → serve a shipped game snapshot from R2 (PUBLIC; this host is
//    outside Cloudflare Access by design, so a friend's share link just works).
//  - jordan-sports-betting.kitbord.com → 301 to the canonical coursework.kitbord.com/jordan.
//  - everything else → normal app routing.

import { PLAY_HOST } from './_session.js'

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
  return next()
}
