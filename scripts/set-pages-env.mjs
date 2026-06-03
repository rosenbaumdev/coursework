#!/usr/bin/env node
// Sets production env vars + R2 binding on a Pages project. Run after
// `wrangler pages deploy`, which resets non-wrangler.toml env vars.
//
// Usage: node scripts/set-pages-env.mjs <project> <path-prefix> <r2-bucket>
// Example: node scripts/set-pages-env.mjs coursework jordan-sports-betting/ coursework-assets

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const [, , project, pathPrefix, r2Bucket] = process.argv
if (!project || pathPrefix === undefined || !r2Bucket) {
  console.error('Usage: set-pages-env.mjs <project> <path-prefix> <r2-bucket>')
  process.exit(1)
}

const token =
  process.env.CLOUDFLARE_API_TOKEN ||
  readFileSync(`${homedir()}/.coursework-cf-token`, 'utf8').trim()

const accountId = 'ef36825392bf2b3d80b73989f1158dce'

const body = {
  deployment_configs: {
    production: {
      env_vars: {
        GITHUB_PATH_PREFIX: { type: 'plain_text', value: pathPrefix },
      },
      r2_buckets: {
        STORAGE: { name: r2Bucket },
      },
    },
  },
}

const r = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${project}`,
  {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  },
)
const json = await r.json()
if (!json.success) {
  console.error('Failed:', JSON.stringify(json.errors, null, 2))
  process.exit(1)
}
const env = json.result.deployment_configs.production.env_vars || {}
console.log(`✓ ${project}: GITHUB_PATH_PREFIX=${env.GITHUB_PATH_PREFIX?.value || '(unset)'}, STORAGE→${r2Bucket}`)
