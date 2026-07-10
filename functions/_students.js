// Mirror of src/students.js for Pages Functions runtime. Keep in sync.

// --- Learner address: name + pronouns ---------------------------------------
// Nothing may assume a specific learner's name or gender. The name a course
// addresses the learner by is EITHER their account name OR a nickname they've
// set (admin-settable today; a learner-facing "persona instructions" surface is
// Phase III). Pronouns default to NEUTRAL singular they — we never assume gender
// and never prompt a learner to declare one; a pronoun set is used only when it
// is genuinely known (admin-settable). Verb forms (be/have) keep singular "they"
// grammatical alongside he/she in the prompt templates that read these.
export const PRONOUN_SETS = {
  they: { subject: 'they', object: 'them', possessive: 'their', possessivePronoun: 'theirs', reflexive: 'themselves', be: 'are', have: 'have' },
  he: { subject: 'he', object: 'him', possessive: 'his', possessivePronoun: 'his', reflexive: 'himself', be: 'is', have: 'has' },
  she: { subject: 'she', object: 'her', possessive: 'her', possessivePronoun: 'hers', reflexive: 'herself', be: 'is', have: 'has' },
}

// The name a course should address the learner by: their chosen nickname if set,
// else their account name, else the slug as a last resort.
export function displayNameOf(student) {
  return (student?.nickname || student?.name || '').trim() || 'there'
}

// Resolve a learner's pronoun set. Unknown/unset → neutral they. Accepts a key
// ('he'|'she'|'they') stored on the student; anything else falls back to neutral.
export function resolvePronouns(student) {
  const key = String(student?.pronouns || '').trim().toLowerCase()
  return PRONOUN_SETS[key] || PRONOUN_SETS.they
}

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

// Find an existing code-seed course with this slug — the source of truth for a course's
// content config (mdFile, defaultArc, title). An invited learner replicates a course by slug,
// so they inherit its content file while keeping their OWN per-slug r2Prefix (isolated data).
function findCourseTemplate(courseSlug) {
  for (const s of Object.values(STUDENTS)) {
    const c = s.courses?.find((c) => c.slug === courseSlug)
    if (c) return c
  }
  return null
}

// A registry entry { name, email, courseSlug, courseTitle?, mdFile?, r2Prefix?,
// mirrorPrefix?, defaultArc?, workshop?, status?, nickname?, pronouns? } → the
// STUDENTS shape. nickname/pronouns are how a course ADDRESSES the learner
// (see displayNameOf/resolvePronouns) — never assumed, only used when set. Content fields
// (mdFile/defaultArc/title) fall back to the replicated course's template so a new learner
// gets real, loadable content without the invite having to carry them.
function registryToStudent(slug, e) {
  const tmpl = findCourseTemplate(e.courseSlug) || {}
  const defaultArc = e.defaultArc ?? tmpl.defaultArc
  return {
    name: e.name || slug,
    email: e.email || null,
    status: e.status || 'active',
    ...(e.nickname ? { nickname: e.nickname } : {}),
    ...(e.pronouns ? { pronouns: e.pronouns } : {}),
    courses: [
      {
        slug: e.courseSlug,
        title: e.courseTitle || tmpl.title || e.courseSlug,
        mdFile: e.mdFile || tmpl.mdFile || `${e.courseSlug}.md`,
        r2Prefix: e.r2Prefix ?? `${slug}/`,
        mirrorPrefix: e.mirrorPrefix ?? `${slug}/`,
        ...(defaultArc ? { defaultArc } : {}),
      },
    ],
    ...(e.workshop ? { workshop: e.workshop } : {}),
    ...(e.dev ? { dev: true } : {}),
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
  if (reg.nickname) out.nickname = reg.nickname
  if (reg.pronouns) out.pronouns = reg.pronouns
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
