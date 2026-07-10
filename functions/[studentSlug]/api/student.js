// GET /<studentSlug>/api/student → a learner's public-ish config (name + course) so the SPA
// can resolve registry-invited learners that aren't in the static client bundle (src/students.js
// only carries the code seeds). The middleware primes the registry overlay before this runs, so
// getStudent() sees invited learners. Behind CF Access; when AUTHZ_ENFORCE is on the middleware
// gates /<slug>/api/* to that learner + admins.
import { jsonResponse, errorResponse } from '../../_shared.js'
import { getStudent, displayNameOf } from '../../_students.js'

export async function onRequestGet({ params }) {
  const student = getStudent(params.studentSlug)
  if (!student) return errorResponse('Unknown learner', 404)
  return jsonResponse({
    name: student.name,
    nickname: student.nickname || null,
    // How the course addresses them: nickname if set, else account name.
    displayName: displayNameOf(student),
    status: student.status || 'active',
    courses: student.courses,
  })
}
