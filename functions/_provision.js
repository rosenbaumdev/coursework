// Provisioning queue (Phase II-4). The app never runs privileged commands on the droplet.
// Instead it writes a request to R2 (private INTERVIEW bucket); a root daemon on the droplet
// (workshop/provision-daemon.mjs) polls the queue, runs workshop/provision-user.sh, and
// writes a status object back. One pending request per slug (latest action wins) — the
// daemon deletes the queue entry once handled and records the outcome in the status object.

const QUEUE_PREFIX = 'admin/provision-queue/'
const STATUS_PREFIX = 'admin/provision-status/'

export const PROVISION_ACTIONS = ['create', 'suspend', 'resume', 'deprovision']
// Droplet unix usernames the daemon will accept — strict, since it feeds provision-user.sh.
export const VM_USER_RE = /^[a-z][a-z0-9-]{2,20}$/
export const SLUG_RE = /^[a-z][a-z0-9-]{2,30}$/

function queueKey(slug) { return `${QUEUE_PREFIX}${slug}.json` }
function statusKey(slug) { return `${STATUS_PREFIX}${slug}.json` }

// Enqueue a provisioning action for <slug>. `payload` carries action-specific fields
// (user, appPort/bridgePort for create, wipe for deprovision, …).
export async function enqueueProvision(env, slug, action, payload = {}) {
  const req = {
    slug,
    action,
    requestedAt: new Date().toISOString(),
    ...payload,
  }
  await env.INTERVIEW.put(queueKey(slug), JSON.stringify(req, null, 2))
  return req
}

export async function loadProvisionStatus(env, slug) {
  try {
    const obj = await env.INTERVIEW.get(statusKey(slug))
    return obj ? await obj.json() : null
  } catch {
    return null
  }
}

// Whether a request is still sitting in the queue (not yet picked up by the daemon).
export async function isQueued(env, slug) {
  const obj = await env.INTERVIEW.head?.(queueKey(slug)).catch(() => null)
  if (obj) return true
  // Fallback for R2 bindings without head(): a get.
  const g = await env.INTERVIEW.get(queueKey(slug)).catch(() => null)
  return Boolean(g)
}

// Combined provisioning view for the admin console: what's queued + last known status.
export async function provisionState(env, slug) {
  const [queued, status] = await Promise.all([isQueued(env, slug), loadProvisionStatus(env, slug)])
  return { queued, status }
}
