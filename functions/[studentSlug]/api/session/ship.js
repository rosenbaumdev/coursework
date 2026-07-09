// POST /<studentSlug>/api/session/ship   body: { day?: "2" }
// Ship the learner's game: snapshot the live, self-contained index.html served at the
// VM origin into R2, and return a PERMANENT, PUBLIC share URL on play.kitbord.com.
// play.* is a distinct host OUTSIDE Cloudflare Access, so a friend can open the link
// without hitting the Google login — and it's a real snapshot, so it survives the next
// build and the droplet/tunnel going down (unlike the dev workspace URL). Re-shipping
// overwrites the same key (latest version wins). The pack enforces a single
// self-contained index.html, so one HTML snapshot IS the whole app.

import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent, getCourse } from '../../../_students.js'
import { DEFAULT_VM_URL, PLAY_HOST, shipKey, loadLesson, saveLesson, isDirListing } from '../../../_session.js'

export async function onRequestPost({ params, env, request }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  const course = getCourse(studentSlug)
  if (!student || !course) return errorResponse('Unknown student', 404)

  let body = {}
  try { body = await request.json() } catch { /* empty body ok */ }
  const dayId = String(body?.day ?? '1')

  // Pull the live app HTML from the VM origin (edge → tunnel; no CORS server-side).
  const origin = env?.APP_VIEWER_URL || DEFAULT_VM_URL
  let html
  try {
    const res = await fetch(origin, { headers: { 'user-agent': 'coursework-ship' } })
    if (res.status !== 200) {
      return errorResponse(`Your app isn't running yet (status ${res.status}). Start it, then ship.`, 409)
    }
    html = await res.text()
  } catch {
    return errorResponse("Couldn't reach your app to ship it — make sure it's running in the viewer.", 502)
  }
  if (!html || !/<\s*html|<!doctype/i.test(html)) {
    return errorResponse("That doesn't look like a running web app yet — build it first, then ship.", 409)
  }
  if (isDirListing(html)) {
    return errorResponse("I only see an empty project folder — there's no game to ship yet. Build it first.", 409)
  }

  const key = shipKey(studentSlug, course.slug, dayId)
  await env.STORAGE.put(key, html, { httpMetadata: { contentType: 'text/html; charset=utf-8' } })

  const url = `https://${PLAY_HOST}/${studentSlug}/${course.slug}/day-${dayId}`

  // Record the ship on the session so the gate + /signoff can trust it (best-effort:
  // the snapshot is already saved, so a missing/older session must not fail the ship).
  const session = await loadLesson(env, studentSlug, course.slug, dayId)
  if (session && session.v === 2) {
    session.shipped = true
    session.shippedUrl = url
    await saveLesson(env, session)
  }

  return jsonResponse({ url, key })
}
