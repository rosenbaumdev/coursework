// GET /api/admin/learners → roster of every learner (code seeds + registry). Admin only.
import { requireAdmin } from '../../_access.js'
import { jsonResponse } from '../../_shared.js'
import { STUDENTS, getStudent, getCourse, loadRegistry } from '../../_students.js'

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
