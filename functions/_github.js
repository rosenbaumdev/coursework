// GitHub Contents API mirror for claude-prompt files. One-way: R2 is the
// source of truth; GitHub mirror exists so claude.ai's WebFetch (allowlist
// includes raw.githubusercontent.com) can read prompts.

import { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } from './_shared.js'

const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`

function headers(pat) {
  return {
    'authorization': `Bearer ${pat}`,
    'accept': 'application/vnd.github+json',
    'user-agent': 'coursework-pages-functions',
    'x-github-api-version': '2022-11-28',
  }
}

async function getSha(path, pat) {
  const r = await fetch(`${API_BASE}/${path}?ref=${GITHUB_BRANCH}`, {
    headers: headers(pat),
  })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`GitHub GET ${path} → ${r.status}`)
  const data = await r.json()
  return data.sha
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function mirrorPath(course, dayId, filename) {
  return `${course.mirrorPrefix}day-${dayId}/${filename}`
}

export async function syncToGitHub(course, dayId, filename, content, pat) {
  const path = mirrorPath(course, dayId, filename)
  try {
    const sha = await getSha(path, pat)
    const bytes = content instanceof Uint8Array ? content : new Uint8Array(content)
    const body = {
      message: sha ? `update ${path}` : `add ${path}`,
      content: bytesToBase64(bytes),
      branch: GITHUB_BRANCH,
    }
    if (sha) body.sha = sha
    const r = await fetch(`${API_BASE}/${path}`, {
      method: 'PUT',
      headers: { ...headers(pat), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const text = await r.text()
      throw new Error(`GitHub PUT ${r.status}: ${text.slice(0, 200)}`)
    }
    return { ok: true, syncedAt: new Date().toISOString() }
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 500) || 'unknown error' }
  }
}

export async function removeFromGitHub(course, dayId, filename, pat) {
  const path = mirrorPath(course, dayId, filename)
  try {
    const sha = await getSha(path, pat)
    if (!sha) return { ok: true }
    const r = await fetch(`${API_BASE}/${path}`, {
      method: 'DELETE',
      headers: { ...headers(pat), 'content-type': 'application/json' },
      body: JSON.stringify({ message: `remove ${path}`, sha, branch: GITHUB_BRANCH }),
    })
    if (!r.ok) {
      const text = await r.text()
      throw new Error(`GitHub DELETE ${r.status}: ${text.slice(0, 200)}`)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 500) || 'unknown error' }
  }
}
