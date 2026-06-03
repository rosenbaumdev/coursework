// 301 the deprecated jordan-sports-betting.kitbord.com hostname to the
// canonical coursework.kitbord.com/jordan/<path>. Runs ahead of routing for
// every request so static assets, SPA routes, and API endpoints all redirect.

export async function onRequest({ request, next }) {
  const url = new URL(request.url)
  if (url.hostname === 'jordan-sports-betting.kitbord.com') {
    const dest = new URL(url)
    dest.hostname = 'coursework.kitbord.com'
    dest.pathname = '/jordan' + url.pathname
    return Response.redirect(dest.toString(), 301)
  }
  return next()
}
