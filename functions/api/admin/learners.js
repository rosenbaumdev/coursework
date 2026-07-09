// GET /api/admin/learners → roster of every learner (code seeds + registry). Admin only.
// POST /api/admin/learners → invite/create a learner (registry entry + access grant + enqueue
// VM provisioning) → returns the invite link. Admin only.
import { requireAdmin, loadGrants, saveGrants } from '../../_access.js'
import { jsonResponse, errorResponse } from '../../_shared.js'
import { STUDENTS, getStudent, getCourse, loadRegistry, saveRegistry } from '../../_students.js'
import { enqueueProvision, SLUG_RE, VM_USER_RE } from '../../_provision.js'

export async function onRequestGet({ request, env }) {
  const blocked = await requireAdmin(request, env)
  if (blocked) return blocked

  const registry = await loadRegistry(env)
  const slugs = [...new Set([...Object.keys(STUDENTS), ...Object.keys(registry)])]
  const learners = slugs
    .map((slug) => {
      const student = getStudent(slug) // middleware primed the merged view
      if (!student) return null
      const course = getCourse(slug)
      return {
        slug,
        name: student.name,
        email: student.email || null,
        courseSlug: course?.slug || null,
        courseTitle: course?.title || null,
        workshopUser: student.workshop?.user || null,
        status: student.status || 'active',
        fromRegistry: Boolean(student.fromRegistry),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug))

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

  registry[slug] = {
    name,
    email: email || null,
    courseSlug,
    courseTitle: (body.courseTitle || '').trim() || courseSlug,
    workshop: { user: vmUser },
    status: 'provisioning',
    createdAt: new Date().toISOString(),
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

  return jsonResponse({ slug, vmUser, inviteUrl: `/${slug}`, status: 'provisioning' }, 201)
}
