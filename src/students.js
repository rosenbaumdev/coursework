// Students + courses config. Drives both the URL routing in the React app and
// the Functions runtime (which has a parallel functions/_students.js). Keep
// both files in sync when adding a student.
//
// URL: coursework.kitbord.com/<studentSlug>  → student's single course view
//      coursework.kitbord.com/<studentSlug>/dad     → dad's view
//      coursework.kitbord.com/<studentSlug>/dad/files → files CMS

export const STUDENTS = {
  jordan: {
    name: 'Jordan',
    courses: [
      {
        slug: 'sports-betting-ai',
        title: 'Sports Betting AI',
        // File served from /public, fetched as `/<mdFile>` (paths are root-relative)
        mdFile: 'jordan-sports-betting.md',
        // R2 key prefix. Empty = flat (Jordan's existing keys live at day-N/...)
        r2Prefix: '',
        // GitHub mirror path prefix inside rosenbaumdev/coursework
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
        // No arc-selection day on this course; defaultArc is the framing.
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
  },
}

export function getStudent(slug) {
  return STUDENTS[slug] || null
}
