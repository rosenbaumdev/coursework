// GET /<studentSlug>/files/* — stream R2 object by key.
// URL `/jordan/files/day-0/podcast/foo.m4a` → R2 key `${course.r2Prefix}day-0/podcast/foo.m4a`.

import { errorResponse } from '../../_shared.js'
import { getCourse } from '../../_students.js'

export async function onRequestGet({ params, env, request }) {
  const { studentSlug } = params
  const course = getCourse(studentSlug)
  if (!course) return errorResponse('Unknown student', 404)

  const segments = params.path
  if (!Array.isArray(segments) || segments.length === 0) {
    return errorResponse('Not found', 404)
  }
  const rel = segments.map(decodeURIComponent).join('/')
  if (rel.includes('..')) return errorResponse('Invalid path')

  const key = `${course.r2Prefix}${rel}`
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
