// Snapshot prod R2 → local miniflare R2, so `npm run dev:full` (jserver:8788) can be tested
// against REAL learner data in isolation — your writes while testing never touch prod.
//
//   npm run sync:dev              # sessions/lessons/profiles/glances (INTERVIEW bucket)
//   npm run sync:dev -- --assets  # ALSO course files + uploaded media (STORAGE bucket)
//
// HOW (and why not getPlatformProxy remote): wrangler's getPlatformProxy remote bindings need a
// Workers *edge-preview* permission this project's token lacks — it silently falls back to STALE
// LOCAL data (that shipped a no-op "sync"). So we read prod through the Cloudflare REST R2 API
// (list + object GET, authed by the R2-scoped CLOUDFLARE_API_TOKEN / ~/.coursework-cf-token) and
// write into the local .wrangler/state store via getPlatformProxy LOCAL (no remote perms needed).
// Each bucket is PURGED locally then repopulated, so dev mirrors prod exactly (not additive).
import { getPlatformProxy } from 'wrangler'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'

const TOKEN =
  process.env.CLOUDFLARE_API_TOKEN ||
  (() => {
    try {
      return readFileSync(join(homedir(), '.coursework-cf-token'), 'utf8').trim()
    } catch {
      console.error('Set CLOUDFLARE_API_TOKEN (or place a token at ~/.coursework-cf-token).')
      process.exit(1)
    }
  })()
const ACCT = process.env.CF_ACCOUNT_ID || 'ef36825392bf2b3d80b73989f1158dce'
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/r2/buckets`
const auth = { Authorization: `Bearer ${TOKEN}` }

const BUCKETS = [
  { binding: 'INTERVIEW', name: 'coursework-interview' }, // sessions, lessons, profiles, glances, admin state
  { binding: 'STORAGE', name: 'coursework-assets' }, // course files + uploaded media
]
const withAssets = process.argv.includes('--assets')
const selected = BUCKETS.filter((b) => b.binding === 'INTERVIEW' || withAssets)

async function listKeys(bucket) {
  let cursor
  const keys = []
  do {
    const u = new URL(`${API}/${bucket}/objects`)
    u.searchParams.set('per_page', '1000')
    if (cursor) u.searchParams.set('cursor', cursor)
    const j = await (await fetch(u, { headers: auth })).json()
    if (!j.success) throw new Error(`list ${bucket}: ${JSON.stringify(j.errors)}`)
    keys.push(...j.result.map((o) => o.key))
    cursor = j.result_info && j.result_info.is_truncated ? j.result_info.cursor : undefined
  } while (cursor)
  return keys
}

async function getObject(bucket, key) {
  const r = await fetch(`${API}/${bucket}/objects/${encodeURIComponent(key)}`, { headers: auth })
  if (!r.ok) throw new Error(`get ${key}: ${r.status}`)
  return { body: await r.arrayBuffer(), contentType: r.headers.get('content-type') || undefined }
}

// Local write proxy — plain (local) bindings, so no remote/Workers permission is needed. Persists
// to ./.wrangler/state, the same store `wrangler pages dev` reads. Run from the project root.
const dir = mkdtempSync(join(tmpdir(), 'r2sync-'))
const cfg = join(dir, 'local.toml')
writeFileSync(
  cfg,
  'name="r2sync"\ncompatibility_date="2025-12-01"\n' +
    selected.map((b) => `[[r2_buckets]]\nbinding="${b.binding}"\nbucket_name="${b.name}"\n`).join(''),
)
const local = await getPlatformProxy({ configPath: cfg })

let grand = 0
try {
  for (const b of selected) {
    const dst = local.env[b.binding]

    // Purge local so dev mirrors prod exactly (drop stale keys prod no longer has).
    let purged = 0
    let lcur
    do {
      const page = await dst.list({ cursor: lcur, limit: 1000 })
      for (const o of page.objects) {
        await dst.delete(o.key)
        purged += 1
      }
      lcur = page.truncated ? page.cursor : undefined
    } while (lcur)

    const keys = await listKeys(b.name)
    let n = 0
    let bytes = 0
    for (const key of keys) {
      const { body, contentType } = await getObject(b.name, key)
      await dst.put(key, body, contentType ? { httpMetadata: { contentType } } : undefined)
      n += 1
      bytes += body.byteLength
      if (n % 10 === 0) process.stdout.write(`\r  ${b.binding}: ${n}/${keys.length}…`)
    }
    process.stdout.write(`\r  ${b.binding}: ${n} objects, ${(bytes / 1e6).toFixed(1)} MB (purged ${purged} stale)\n`)
    grand += n
  }
  console.log(`✓ synced ${grand} objects prod → local. Restart dev:full if :8788 shows stale data.`)
} finally {
  await local.dispose()
}
