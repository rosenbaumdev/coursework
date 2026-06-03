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
      },
    ],
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
