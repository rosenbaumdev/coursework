// GET /<studentSlug>/api/session/viewer-status  ->  { ready: boolean, status: number }
// Readiness probe for the workshop's app viewer. The learner's app is served at the
// droplet tunnel root (APP_VIEWER_URL); it only exists once Claude Code writes the
// file(s) and something serves them — before that the origin 404s (empty app dir) or
// the tunnel errors (origin down). The browser can't tell "ready" from "error" across
// origins (iframe onload fires for both, and cross-origin content is unreadable), but
// the CF edge CAN fetch it directly and read the status. So the viewer polls THIS and
// auto-loads the moment the app is genuinely reachable — no "hit reload and hope".
//
// Deliberately env-only: no session/student state is touched. It's a pure liveness
// check over the deployment's viewer URL, so it stays a trivial read.

import { jsonResponse } from '../../../_shared.js'
import { DEFAULT_VM_URL, isDirListing } from '../../../_session.js'

export async function onRequestGet({ env }) {
  // Same default as injectLiveSurfaces: an unbound APP_VIEWER_URL must NOT read as
  // "no app" — it falls back to the stable named-tunnel origin, so the probe checks
  // the real URL the viewer will load.
  const url = env?.APP_VIEWER_URL || DEFAULT_VM_URL
  if (!url) return jsonResponse({ ready: false, status: 0, reason: 'no-url' })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    // GET (not HEAD): some static servers don't implement HEAD, and we want the real
    // status a browser would get. redirect:manual so a login/interstitial redirect
    // reads as not-ready rather than silently following somewhere unexpected.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'coursework-viewer-probe' },
    })
    if (res.status !== 200) return jsonResponse({ ready: false, status: res.status })
    // 200 alone isn't "ready" — an empty workspace serves a directory listing at 200.
    const body = await res.text()
    return jsonResponse({ ready: !isDirListing(body), status: 200 })
  } catch {
    // Timeout / origin down / tunnel not connected — all "not ready yet".
    return jsonResponse({ ready: false, status: 0, reason: 'unreachable' })
  } finally {
    clearTimeout(timer)
  }
}
