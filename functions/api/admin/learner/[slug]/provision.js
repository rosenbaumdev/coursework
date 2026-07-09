// POST /api/admin/learner/:slug/provision  { action: 'suspend'|'resume'|'deprovision'|'create', wipe? }
//   → enqueue a VM provisioning action for the droplet daemon + reflect intended status.
// GET  /api/admin/learner/:slug/provision → current { queued, status } provisioning state.
// Admin only.
import { requireAdmin } from '../../../../_access.js'
import { jsonResponse, errorResponse } from '../../../../_shared.js'
import { getStudent, loadRegistry, saveRegistry } from '../../../../_students.js'
import { enqueueProvision, provisionState, PROVISION_ACTIONS, VM_USER_RE } from '../../../../_provision.js'

const STATUS_BY_ACTION = {
  create: 'provisioning',
  resume: 'active',
  suspend: 'suspended',
  deprovision: 'deprovisioned',
}

export async function onRequestPost({ request, env, params }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked
  const slug = params.slug
  const student = getStudent(slug)
  if (!student) return errorResponse('Unknown learner', 404)

  const body = await request.json().catch(() => ({}))
  const action = (body.action || '').trim()
  if (!PROVISION_ACTIONS.includes(action)) {
    return errorResponse(`action must be one of ${PROVISION_ACTIONS.join(', ')}`, 400)
  }
  const user = student.workshop?.user
  if (!user || !VM_USER_RE.test(user)) return errorResponse('learner has no valid VM user', 400)

  await enqueueProvision(env, slug, action, {
    user,
    ...(action === 'deprovision' && body.wipe ? { wipe: true } : {}),
  })

  // Reflect intended status in the registry (an override, so it works for code seeds too).
  const registry = await loadRegistry(env)
  registry[slug] = { ...(registry[slug] || {}), status: STATUS_BY_ACTION[action] }
  await saveRegistry(env, registry)

  return jsonResponse({ ok: true, slug, action, status: STATUS_BY_ACTION[action], provision: await provisionState(env, slug) })
}

export async function onRequestGet({ request, env, params }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked
  return jsonResponse(await provisionState(env, params.slug))
}
