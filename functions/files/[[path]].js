// GET /files/* — stream R2 object by key.
// URL: /files/day-<id>/<category>/<filename>  →  R2 key: day-<id>/<category>/<filename>

import { errorResponse } from '../_shared.js'

export async function onRequestGet({ params, env, request }) {
  const segments = params.path
  if (!Array.isArray(segments) || segments.length === 0) {
    return errorResponse('Not found', 404)
  }
  const key = segments.map(decodeURIComponent).join('/')
  if (key.includes('..')) return errorResponse('Invalid path')

  const object = await env.STORAGE.get(key)
  if (!object) return errorResponse('Not found', 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=300')

  if (request.method === 'HEAD') {
    return new Response(null, { headers })
  }

  return new Response(object.body, { headers })
}

export async function onRequestHead(ctx) {
  return onRequestGet(ctx)
}
