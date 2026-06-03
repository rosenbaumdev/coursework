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
    name: 'Content Creator',
    courses: [
      {
        slug: 'main',
        title: 'Content Creator',
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
