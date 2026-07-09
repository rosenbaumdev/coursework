// Mirror of src/students.js for Pages Functions runtime. Keep in sync.

export const STUDENTS = {
  jordan: {
    name: 'Jordan',
    courses: [
      {
        slug: 'sports-betting-ai',
        title: 'Sports Betting AI',
        mdFile: 'jordan-sports-betting.md',
        r2Prefix: '',
        mirrorPrefix: 'jordan-sports-betting/',
      },
    ],
  },
  contentcreator: {
    name: 'Content Creator', // placeholder — update once you have a real student name
    courses: [
      {
        slug: 'main',
        title: 'Creator Business',
        mdFile: 'content-creator.md',
        r2Prefix: 'content-creator/',
        mirrorPrefix: 'content-creator/',
        defaultArc: 'Perimenopause + Women’s Wellness',
      },
    ],
  },
  zachary: {
    name: 'Zachary',
    courses: [
      {
        slug: 'noob-to-ai-entrepreneur',
        title: 'Noob to AI Entrepreneur',
        // Course content is generated from the ingestion interview's profile;
        // placeholder until then. Zachary's entry point is /zachary/interview.
        mdFile: 'zachary-noob-to-ai-entrepreneur.md',
        r2Prefix: 'zachary/',
        mirrorPrefix: 'zachary/',
      },
    ],
    // Droplet workshop user (Day-2 live surface) → isolated /u/zachary backend.
    workshop: { user: 'zachary' },
  },
  // Test clone of Zachary's world (seeded with his history) — for Jonathan to test
  // days as him without touching Zachary's real data. Same display name on purpose.
  'zachary-test': {
    name: 'Zachary',
    courses: [
      {
        slug: 'noob-to-ai-entrepreneur',
        title: 'Noob to AI Entrepreneur',
        mdFile: 'zachary-noob-to-ai-entrepreneur.md',
        r2Prefix: 'zachary-test/',
        mirrorPrefix: 'zachary-test/',
      },
    ],
    // Jonathan's dev/QA workshop → isolated /u/jonathan backend, so testing as
    // Zachary never lands in Zachary's real shell.
    workshop: { user: 'jonathan' },
  },
}

// --- Runtime learner registry (Phase II-2) ---
// Invited learners live in data (R2 admin/registry.json), overlaid on the code seeds
// above so a new learner needs NO redeploy. Code seeds are authoritative on a slug clash
// (jordan/zachary/zachary-test stay in code); the registry only ADDS slugs. getStudent
// stays synchronous — primeStudents() (called once per request in _middleware) refreshes a
// module-scoped merged map, so no caller has to become async.
const REGISTRY_KEY = 'admin/registry.json'
const REGISTRY_TTL_MS = 15_000

let _merged = null
let _mergedAt = 0

// A registry entry { name, email, courseSlug, courseTitle?, mdFile?, r2Prefix?,
// mirrorPrefix?, defaultArc?, workshop?, status? } → the STUDENTS shape.
function registryToStudent(slug, e) {
  return {
    name: e.name || slug,
    email: e.email || null,
    status: e.status || 'active',
    courses: [
      {
        slug: e.courseSlug,
        title: e.courseTitle || e.courseSlug,
        mdFile: e.mdFile || `${e.courseSlug}.md`,
        r2Prefix: e.r2Prefix ?? `${slug}/`,
        mirrorPrefix: e.mirrorPrefix ?? `${slug}/`,
        ...(e.defaultArc ? { defaultArc: e.defaultArc } : {}),
      },
    ],
    ...(e.workshop ? { workshop: e.workshop } : {}),
    fromRegistry: true,
  }
}

export async function loadRegistry(env, { fresh = false } = {}) {
  try {
    const obj = await env?.INTERVIEW?.get(REGISTRY_KEY)
    const data = obj ? await obj.json() : null
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export async function saveRegistry(env, registry) {
  await env.INTERVIEW.put(REGISTRY_KEY, JSON.stringify(registry, null, 2))
  _merged = null // force a refresh on next prime
  return registry
}

// Refresh the merged (code seeds + registry) view. Cheap: cached for REGISTRY_TTL_MS and
// only reads R2 on a cache miss. Never throws — a registry read failure just falls back to
// the code seeds. Call once per request (middleware) before any getStudent.
// Registry can override a few MUTABLE fields (admin "user maintenance") even on a code
// seed — without redefining the seed's course/workshop config.
function applyOverrides(student, reg) {
  if (!reg || typeof reg !== 'object') return student
  const out = { ...student }
  if (reg.name) out.name = reg.name
  if (reg.email) out.email = reg.email
  if (reg.status) out.status = reg.status
  return out
}

export async function primeStudents(env) {
  const now = Date.now()
  if (_merged && now - _mergedAt < REGISTRY_TTL_MS) return _merged
  const registry = await loadRegistry(env)
  const merged = {}
  const slugs = new Set([...Object.keys(STUDENTS), ...Object.keys(registry)])
  for (const slug of slugs) {
    const seed = STUDENTS[slug]
    const reg = registry[slug]
    if (seed) merged[slug] = applyOverrides(seed, reg) // code seed provides course/workshop; registry can edit name/email/status
    else if (reg && reg.courseSlug) merged[slug] = registryToStudent(slug, reg)
  }
  _merged = merged
  _mergedAt = now
  return _merged
}

export function getStudent(slug) {
  return (_merged || STUDENTS)[slug] || null
}

// Resolves a (studentSlug → course) for the current single-course-per-student
// model. Future multi-course support adds a second URL segment.
export function getCourse(studentSlug) {
  const student = getStudent(studentSlug)
  if (!student) return null
  return student.courses[0]
}
