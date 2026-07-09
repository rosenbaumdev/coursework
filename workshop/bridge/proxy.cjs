// Identity-aware reverse proxy for the multi-user workshop droplet.
//
// One stable origin (the cloudflared tunnel) fronts EVERY student's isolated
// backend. Requests are routed by a `/u/<user>/` path prefix to that user's OWN
// app-viewer (HTTP) and PTY bridge (WebSocket upgrade), each running as that
// unix user. This is what replaced the single-tenant splitter that always sent
// everyone to one shared `coder` shell.
//
//   HTTP  /u/zachary/index.html  → 127.0.0.1:<zachary.appPort>/index.html
//   WS    /u/zachary/?token=…    → 127.0.0.1:<zachary.bridgePort>/?token=…
//
// Routing table is /opt/coursework/routes.json:
//   { "default": {"appPort":8080,"bridgePort":7681},
//     "zachary": {"appPort":8081,"bridgePort":7691}, ... }
// - unknown/absent user → 404 (default-deny; a leaked path can't reach a shell
//   that isn't mapped).
// - a request with NO /u/<user>/ prefix falls to the `default` route, which
//   points at the legacy coder backend — so the old single-tenant URL keeps
//   working during cutover, before the app is redeployed to emit /u/<user>/.
// Reloaded on SIGHUP: `systemctl reload coursework-proxy`.
const http = require('http')
const net = require('net')
const fs = require('fs')

const PORT = Number(process.env.PROXY_PORT || 9000)
const ROUTES_FILE = process.env.ROUTES_FILE || '/opt/coursework/routes.json'

let routes = {}
function loadRoutes() {
  try {
    routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'))
    console.log(`[proxy] routes loaded: ${Object.keys(routes).join(', ') || '(none)'}`)
  } catch (e) {
    console.error(`[proxy] could not read ${ROUTES_FILE}: ${e.message} (keeping previous ${Object.keys(routes).length} route(s))`)
  }
}
loadRoutes()
process.on('SIGHUP', () => { console.log('[proxy] SIGHUP — reloading routes'); loadRoutes() })

// "/u/<user>/<rest>?<query>" → { user, rest }, where rest keeps its leading slash
// and the query string so the backend (esp. the bridge's ?token=) is preserved.
// No /u/ prefix → { user: 'default', rest: <original> }.
function resolve(rawUrl) {
  const qi = rawUrl.indexOf('?')
  const path = qi === -1 ? rawUrl : rawUrl.slice(0, qi)
  const query = qi === -1 ? '' : rawUrl.slice(qi)
  const m = path.match(/^\/u\/([A-Za-z0-9_-]+)(\/.*)?$/)
  if (!m) return { user: 'default', rest: rawUrl }
  return { user: m[1], rest: (m[2] || '/') + query }
}

const server = http.createServer((req, res) => {
  const { user, rest } = resolve(req.url)
  const route = routes[user]
  if (!route) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end(`no workshop mapped for "${user}"`); return }
  const up = http.request(
    { host: '127.0.0.1', port: route.appPort, path: rest, method: req.method, headers: req.headers },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res) }
  )
  up.on('error', () => { try { res.writeHead(502); res.end('viewer unavailable') } catch {} })
  req.pipe(up)
})

// Raw-pipe the WebSocket upgrade to the routed bridge (replay the handshake line
// with the PREFIX-STRIPPED url so the bridge sees /?token=… on its own root).
server.on('upgrade', (req, socket, head) => {
  const { user, rest } = resolve(req.url)
  const route = routes[user]
  if (!route) { try { socket.destroy() } catch {}; return }
  const b = net.connect(route.bridgePort, '127.0.0.1', () => {
    let raw = `${req.method} ${rest} HTTP/1.1\r\n`
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`
    raw += '\r\n'
    b.write(raw)
    if (head && head.length) b.write(head)
    socket.pipe(b)
    b.pipe(socket)
  })
  b.on('error', () => { try { socket.destroy() } catch {} })
  socket.on('error', () => { try { b.destroy() } catch {} })
})

server.listen(PORT, '127.0.0.1', () => console.log(`[proxy] 127.0.0.1:${PORT} — path-routed /u/<user>/ → per-user app + bridge`))
