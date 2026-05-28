// One-way mirror of claude-prompt files to a public GitHub repo.
//
// Why: claude.ai's WebFetch tool has an implicit allowlist of trusted domains.
// raw.githubusercontent.com is on it; coursework.rosenbaum.us is not. So we
// shadow-publish prompts to GitHub so Claude can fetch them. Authoring still
// happens at /dad/files; this just downstream-mirrors.
//
// Constraints baked in:
//   - Local storage is source of truth. Never sync GitHub → local.
//   - Only claude-prompt category is mirrored. Other categories stay local.
//   - Sync failures don't fail uploads. Status is surfaced; user retries by
//     re-uploading.
//   - State persisted in a JSON sidecar so manifest builder can read it.

import { execFile } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

const MIRROR_DIR = join(homedir(), '.coursework-mirror-clone')
const STATE_FILE = join(homedir(), '.coursework-mirror-state.json')
const RAW_BASE = 'https://raw.githubusercontent.com/rosenbaumdev/coursework/main'

let state = loadState()

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveState() {
  const tmp = STATE_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(state, null, 2))
  renameSync(tmp, STATE_FILE)
}

async function git(...args) {
  const { stdout } = await execFileP('git', args, { cwd: MIRROR_DIR, encoding: 'utf8' })
  return stdout.trim()
}

async function hasStagedChanges() {
  try {
    await git('diff', '--cached', '--exit-code', '--quiet')
    return false
  } catch {
    return true
  }
}

export function isReady() {
  return existsSync(MIRROR_DIR) && existsSync(join(MIRROR_DIR, '.git'))
}

export function relPathFor(dayId, filename) {
  return `day-${dayId}/${filename}`
}

export function getMirrorInfo(dayId, filename) {
  const key = relPathFor(dayId, filename)
  const s = state[key]
  if (!s) return null
  return {
    url: `${RAW_BASE}/${key}`,
    status: s.status,
    syncedAt: s.syncedAt,
    error: s.error,
  }
}

export async function syncFile(sourcePath, dayId, filename) {
  const key = relPathFor(dayId, filename)
  if (!isReady()) {
    state[key] = { status: 'skipped', error: 'mirror not initialized', syncedAt: null }
    saveState()
    return state[key]
  }
  try {
    const target = join(MIRROR_DIR, key)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(sourcePath, target)
    await git('add', key)

    if (!(await hasStagedChanges())) {
      // Content identical to last push — no-op, but record as synced if we don't have state yet.
      if (!state[key]) {
        state[key] = { status: 'synced', syncedAt: new Date().toISOString() }
        saveState()
      }
      return state[key]
    }

    await git('commit', '-m', `sync ${key}`)
    await git('push', 'origin', 'main')

    state[key] = { status: 'synced', syncedAt: new Date().toISOString(), error: null }
    saveState()
    return state[key]
  } catch (e) {
    state[key] = {
      status: 'failed',
      syncedAt: state[key]?.syncedAt || null,
      error: e.message?.slice(0, 500) || 'unknown error',
    }
    saveState()
    return state[key]
  }
}

export async function removeFromMirror(dayId, filename) {
  const key = relPathFor(dayId, filename)
  if (!isReady()) return
  try {
    const target = join(MIRROR_DIR, key)
    if (existsSync(target)) {
      rmSync(target)
      await git('add', key)
      if (await hasStagedChanges()) {
        await git('commit', '-m', `remove ${key}`)
        await git('push', 'origin', 'main')
      }
    }
    delete state[key]
    saveState()
  } catch (e) {
    state[key] = {
      status: 'failed',
      syncedAt: state[key]?.syncedAt || null,
      error: `delete failed: ${e.message?.slice(0, 200)}`,
    }
    saveState()
  }
}
