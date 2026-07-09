#!/usr/bin/env node
// Provisioning daemon (Phase II-4b). Runs as ROOT on the droplet, polls the R2 queue the
// app writes (admin/provision-queue/<slug>.json), performs the isolated-account action, and
// writes a status object back (admin/provision-status/<slug>.json). PULL model: the app
// never reaches into the VM; the VM only reads a queue it trusts. No inbound privileged
// endpoint.
//
// Actions: create (provision-user.sh), suspend (stop+disable services, keep data), resume
// (enable+start), deprovision (stop+disable, userdel [-r if wipe], drop route).
//
// Config — /etc/coursework/provisioner.env (root, 600):
//   R2_ACCOUNT_ID=...            # Cloudflare account id
//   R2_ACCESS_KEY_ID=...         # R2 API token (scoped to coursework-interview, read+write)
//   R2_SECRET_ACCESS_KEY=...
//   R2_BUCKET=coursework-interview
//   PROVISION_SCRIPT=/opt/coursework/provision-user.sh
//   AUTH_SOURCE=coder            # --copy-auth-from for create (shared Claude login)
//   POLL_MS=5000
//
// Install: see workshop/README.md ("Provisioning daemon").
import { AwsClient } from 'aws4fetch'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const env = process.env
const ACCOUNT = env.R2_ACCOUNT_ID
const BUCKET = env.R2_BUCKET || 'coursework-interview'
const SCRIPT = env.PROVISION_SCRIPT || '/opt/coursework/provision-user.sh'
const AUTH_SOURCE = env.AUTH_SOURCE || 'coder'
const ROUTES = env.ROUTES_FILE || '/opt/coursework/routes.json'
const POLL_MS = Number(env.POLL_MS || 5000)
const QUEUE_PREFIX = 'admin/provision-queue/'
const STATUS_PREFIX = 'admin/provision-status/'

const VM_USER_RE = /^[a-z][a-z0-9-]{2,20}$/
const APP_PORT_RANGE = [8081, 8099]
const BRIDGE_PORT_RANGE = [7691, 7699]

if (!ACCOUNT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
  console.error('[provisioner] missing R2 config in /etc/coursework/provisioner.env')
  process.exit(1)
}

const aws = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: 's3',
  region: 'auto',
})
const base = `https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}`

async function r2List(prefix) {
  const res = await aws.fetch(`${base}?list-type=2&prefix=${encodeURIComponent(prefix)}`)
  if (!res.ok) throw new Error(`list ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1])
}
async function r2GetJSON(key) {
  const res = await aws.fetch(`${base}/${key}`)
  if (!res.ok) return null
  return res.json()
}
async function r2PutJSON(key, obj) {
  const res = await aws.fetch(`${base}/${key}`, {
    method: 'PUT',
    body: JSON.stringify(obj, null, 2),
    headers: { 'content-type': 'application/json' },
  })
  if (!res.ok) throw new Error(`put ${res.status}`)
}
async function r2Delete(key) {
  await aws.fetch(`${base}/${key}`, { method: 'DELETE' })
}

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' }).toString()

function readRoutes() {
  try { return JSON.parse(sh('cat', [ROUTES])) } catch { return {} }
}
function freePorts() {
  const routes = readRoutes()
  const usedApp = new Set(Object.values(routes).map((r) => r.appPort))
  const usedBridge = new Set(Object.values(routes).map((r) => r.bridgePort))
  let appPort, bridgePort
  for (let p = APP_PORT_RANGE[0]; p <= APP_PORT_RANGE[1]; p++) if (!usedApp.has(p)) { appPort = p; break }
  for (let p = BRIDGE_PORT_RANGE[0]; p <= BRIDGE_PORT_RANGE[1]; p++) if (!usedBridge.has(p)) { bridgePort = p; break }
  if (!appPort || !bridgePort) throw new Error('no free ports (VM at capacity)')
  return { appPort, bridgePort }
}

function handle(req) {
  const { action, user } = req
  if (!VM_USER_RE.test(user || '')) throw new Error(`invalid user "${user}"`)
  switch (action) {
    case 'create': {
      const { appPort, bridgePort } = freePorts()
      const out = sh('bash', [SCRIPT, user, String(appPort), String(bridgePort), '--copy-auth-from', AUTH_SOURCE])
      return { state: 'done', detail: `created (app:${appPort} bridge:${bridgePort})`, tail: out.slice(-400) }
    }
    case 'suspend':
      sh('systemctl', ['disable', '--now', `coursework-bridge@${user}`, `coursework-app@${user}`])
      return { state: 'done', detail: 'suspended (services stopped, data kept)' }
    case 'resume':
      sh('systemctl', ['enable', '--now', `coursework-bridge@${user}`, `coursework-app@${user}`])
      return { state: 'done', detail: 'resumed' }
    case 'deprovision': {
      try { sh('systemctl', ['disable', '--now', `coursework-bridge@${user}`, `coursework-app@${user}`]) } catch {}
      // Drop the route so the proxy stops forwarding, then reload it.
      try {
        const routes = readRoutes()
        delete routes[user]
        writeFileSync(ROUTES, JSON.stringify(routes, null, 2) + '\n')
        sh('systemctl', ['reload', 'coursework-proxy'])
      } catch (e) {
        console.error('[provisioner] route cleanup failed:', e.message)
      }
      sh('userdel', req.wipe ? ['-r', '-f', user] : ['-f', user])
      return { state: 'done', detail: req.wipe ? 'deprovisioned + home wiped' : 'deprovisioned (home kept)' }
    }
    default:
      throw new Error(`unknown action "${action}"`)
  }
}

async function tick() {
  let keys
  try { keys = await r2List(QUEUE_PREFIX) } catch (e) { console.error('[provisioner] list failed:', e.message); return }
  for (const key of keys) {
    const slug = key.slice(QUEUE_PREFIX.length).replace(/\.json$/, '')
    const req = await r2GetJSON(key)
    if (!req) { await r2Delete(key); continue }
    console.log(`[provisioner] ${slug}: ${req.action} ${req.user}`)
    let status
    try {
      status = { slug, action: req.action, user: req.user, ...handle(req), at: new Date().toISOString() }
    } catch (e) {
      status = { slug, action: req.action, user: req.user, state: 'error', detail: String(e.message), at: new Date().toISOString() }
      console.error(`[provisioner] ${slug} error:`, e.message)
    }
    try {
      await r2PutJSON(`${STATUS_PREFIX}${slug}.json`, status)
      await r2Delete(key) // handled — remove from the queue (re-trigger from the admin UI on error)
    } catch (e) {
      console.error(`[provisioner] ${slug} status write failed:`, e.message)
    }
  }
}

console.log('[provisioner] up — polling', `${base}/${QUEUE_PREFIX}`, `every ${POLL_MS}ms`)
for (;;) {
  await tick()
  await new Promise((r) => setTimeout(r, POLL_MS))
}
