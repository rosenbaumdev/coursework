// GET /<studentSlug>/api/session/workshop-token → { token }
//
// Mints a fresh, short-lived, HMAC-signed workshop token for this student's droplet
// user (Phase I). The client fetches this right before opening the terminal WebSocket
// AND on every reconnect, so a token never lapses mid-use and rotation is transparent.
// The `user` claim is derived server-side from the student's config (workshop.user) —
// never client-supplied. Returns { token: '' } when the student has no per-user bridge
// or signing isn't configured; the client then falls back to the injected token.
//
// NOTE: this returns shell-access material; it inherits the same gate as the rest of
// the session API (Cloudflare Access at the edge). The app-side default-deny authz
// layer (Phase II) will additionally scope it to canAccess(email, slug).
import { errorResponse, jsonResponse } from '../../../_shared.js'
import { getStudent } from '../../../_students.js'
import { signWorkshopToken } from '../../../_workshopToken.js'

export async function onRequestGet({ params, env }) {
  const { studentSlug } = params
  const student = getStudent(studentSlug)
  if (!student) return errorResponse('Unknown student', 404)

  const user = student.workshop?.user
  const secret = env?.WORKSHOP_SIGNING_SECRET
  if (!user || !secret) return jsonResponse({ token: '' }) // no per-user bridge / signing → client falls back

  const token = await signWorkshopToken(user, secret)
  return jsonResponse({ token })
}
