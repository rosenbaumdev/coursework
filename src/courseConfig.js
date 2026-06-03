// Per-course config read from Vite build-time env vars. Each Pages project
// sets its own values in the dashboard; defaults below are sensible fallbacks.
//
// Set in Cloudflare Pages → Settings → Environment variables (Production):
//   VITE_COURSE_SLUG     — file slug for the MD source (e.g. "jordan-sports-betting")
//   VITE_STUDENT_NAME    — first name used in UI labels (e.g. "Jordan")
//   VITE_COURSE_TITLE    — short course label (e.g. "Sports Betting AI")

const env = import.meta.env

export const COURSE_SLUG = env.VITE_COURSE_SLUG || 'jordan-sports-betting'
export const STUDENT_NAME = env.VITE_STUDENT_NAME || 'Student'
export const COURSE_TITLE = env.VITE_COURSE_TITLE || 'Builder Coursework'
