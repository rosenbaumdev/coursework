// GET /api/admin/learners → roster of every learner (code seeds + registry). Admin only.
// POST /api/admin/learners → invite/create a learner (registry entry + access grant + enqueue
// VM provisioning) → returns the invite link. Admin only.
import { requireAdmin, loadGrants, saveGrants } from '../../_access.js'
import { jsonResponse, errorResponse } from '../../_shared.js'
import { STUDENTS, getStudent, getCourse, loadRegistry, saveRegistry } from '../../_students.js'
import { enqueueProvision, provisionState, reconcileStatus, isTerminalStatus, SLUG_RE, VM_USER_RE } from '../../_provision.js'

export async function onRequestGet({ request, env }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked

  const registry = await loadRegistry(env)
  const slugs = [...new Set([...Object.keys(STUDENTS), ...Object.keys(registry)])]
  let registryDirty = false
  const learners = []
  for (const slug of slugs) {
    const student = getStudent(slug) // middleware primed the merged view
    if (!student) continue
    const course = getCourse(slug)
    let status = student.status || 'active'
    // Only pending learners need a reconcile — read the daemon's per-slug result and self-heal.
    if (status === 'provisioning') {
      const provision = await provisionState(env, slug)
      const reconciled = reconcileStatus(student, provision.status, provision.queued)
      if (isTerminalStatus(reconciled) && reconciled !== status && registry[slug]) {
        registry[slug] = { ...registry[slug], status: reconciled }
        registryDirty = true
      }
      status = reconciled
    }
    learners.push({
      slug,
      name: student.name,
      nickname: student.nickname || null,
      pronouns: student.pronouns || null,
      email: student.email || null,
      courseSlug: course?.slug || null,
      courseTitle: course?.title || null,
      workshopUser: student.workshop?.user || null,
      status,
      fromRegistry: Boolean(student.fromRegistry),
      dev: Boolean(student.dev),
    })
  }
  if (registryDirty) await saveRegistry(env, registry)
  learners.sort((a, b) => a.slug.localeCompare(b.slug))

  return jsonResponse({ learners })
}

export async function onRequestPost({ request, env }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked

  const body = await request.json().catch(() => ({}))
  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const courseSlug = (body.courseSlug || '').trim()
  const slug = (body.slug || '').trim().toLowerCase()
  const vmUser = ((body.vmUser || '').trim() || slug).toLowerCase()

  if (!name || !courseSlug || !slug) return errorResponse('name, slug, and courseSlug are required', 400)
  if (!SLUG_RE.test(slug)) return errorResponse('slug must match ^[a-z][a-z0-9-]{2,30}$', 400)
  if (!VM_USER_RE.test(vmUser)) return errorResponse('vmUser must match ^[a-z][a-z0-9-]{2,20}$', 400)
  if (STUDENTS[slug]) return errorResponse('slug clashes with a built-in learner', 409)
  const registry = await loadRegistry(env)
  if (registry[slug]) return errorResponse('a learner with that slug already exists', 409)

  const courseTitle = (body.courseTitle || '').trim()
  const nickname = (body.nickname || '').trim()
  const pronouns = (body.pronouns || '').trim().toLowerCase()
  if (pronouns && !['he', 'she', 'they'].includes(pronouns)) {
    return errorResponse('pronouns must be one of: he, she, they', 400)
  }
  registry[slug] = {
    name,
    email: email || null,
    courseSlug,
    ...(courseTitle ? { courseTitle } : {}), // else registryToStudent uses the template course title
    ...(nickname ? { nickname } : {}), // how the course addresses them (else account name)
    ...(pronouns ? { pronouns } : {}), // omitted → neutral 'they' at runtime
    workshop: { user: vmUser },
    status: 'provisioning',
    createdAt: new Date().toISOString(),
    ...(body.dev ? { dev: true } : {}),
  }
  await saveRegistry(env, registry)

  // Grant email → slug so the learner can reach their course once CF Access is widened.
  if (email) {
    const grants = await loadGrants(env, { fresh: true })
    const set = new Set(grants.grants[email] || [])
    set.add(slug)
    grants.grants[email] = [...set]
    await saveGrants(env, grants)
  }

  // Ask the droplet daemon to create the isolated unix account.
  await enqueueProvision(env, slug, 'create', { user: vmUser })

  return jsonResponse({ slug, vmUser, inviteUrl: `/${slug}`, status: 'provisioning', dev: Boolean(body.dev) }, 201)
}
