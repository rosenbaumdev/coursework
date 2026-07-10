// Snapshot prod R2 → local miniflare R2, so `npm run dev:full` (jserver:8788) can be tested
// against REAL learner data in isolation — your writes while testing never touch prod.
//
//   npm run sync:dev            # sessions/lessons/profiles (INTERVIEW bucket)
//   npm run sync:dev -- --assets  # ALSO course files + shipped games + media (STORAGE bucket)
//
// How: wrangler's getPlatformProxy gives R2 bindings in plain Node. We open one proxy with
// remote bindings (reads the real buckets, authed by CLOUDFLARE_API_TOKEN / ~/.coursework-cf-token)
// and one local proxy (writes the same .wrangler/state store the dev server reads). No S3 creds,
// no new deps. Additive copy (overwrites matching keys, leaves extra local keys); for a pure
// mirror, `rm -rf .wrangler/state` first.
import { getPlatformProxy } from 'wrangler'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'

// Remote reads authenticate with a Cloudflare API token (Workers R2 Edit). Fall back to the
// project's stored token file if the env var isn't already set.
if (!process.env.CLOUDFLARE_API_TOKEN) {
  try {
    process.env.CLOUDFLARE_API_TOKEN = readFileSync(join(homedir(), '.coursework-cf-token'), 'utf8').trim()
  } catch {
    console.error('Set CLOUDFLARE_API_TOKEN (or place a token at ~/.coursework-cf-token).')
    process.exit(1)
  }
}

const BUCKETS = [
  { binding: 'INTERVIEW', name: 'coursework-interview' }, // sessions, lessons, profiles, admin state
  { binding: 'STORAGE', name: 'coursework-assets' }, // course files, shipped games, uploaded media
]
const withAssets = process.argv.includes('--assets')
const selected = BUCKETS.filter((b) => b.binding === 'INTERVIEW' || withAssets)

// Two generated configs: remote (source, marked experimental_remote) and local (dest, plain).
// The experimental.remoteBindings flag is what actually routes the remote proxy to real R2.
const dir = mkdtempSync(join(tmpdir(), 'r2sync-'))
const toml = (remote) =>
  'name="r2sync"\ncompatibility_date="2025-12-01"\n' +
  selected
    .map((b) => `[[r2_buckets]]\nbinding="${b.binding}"\nbucket_name="${b.name}"${remote ? '\nexperimental_remote=true' : ''}\n`)
    .join('')
const remoteCfg = join(dir, 'remote.toml')
const localCfg = join(dir, 'local.toml')
writeFileSync(remoteCfg, toml(true))
writeFileSync(localCfg, toml(false))

const remote = await getPlatformProxy({ configPath: remoteCfg, experimental: { remoteBindings: true } })
const local = await getPlatformProxy({ configPath: localCfg })

let grand = 0
try {
  for (const b of selected) {
    const src = remote.env[b.binding]
    const dst = local.env[b.binding]
    let cursor
    let n = 0
    let bytes = 0
    do {
      const page = await src.list({ cursor, limit: 1000 })
      for (const o of page.objects) {
        const obj = await src.get(o.key)
        if (!obj) continue
        const body = await obj.arrayBuffer()
        await dst.put(o.key, body, { httpMetadata: obj.httpMetadata, customMetadata: obj.customMetadata })
        n += 1
        bytes += body.byteLength
        if (n % 25 === 0) process.stdout.write(`\r  ${b.binding}: ${n} objects…`)
      }
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    process.stdout.write(`\r  ${b.binding}: ${n} objects, ${(bytes / 1e6).toFixed(1)} MB\n`)
    grand += n
  }
  console.log(`✓ synced ${grand} objects prod → local. Open http://jserver:8788 (restart dev:full if data looks stale).`)
} finally {
  await remote.dispose()
  await local.dispose()
}
