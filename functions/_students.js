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

export function getStudent(slug) {
  return STUDENTS[slug] || null
}

// Resolves a (studentSlug → course) for the current single-course-per-student
// model. Future multi-course support adds a second URL segment.
export function getCourse(studentSlug) {
  const student = getStudent(studentSlug)
  if (!student) return null
  return student.courses[0]
}
