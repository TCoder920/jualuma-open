#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const frontendDir = path.resolve(path.dirname(__filename), '..')
const rootDir = path.resolve(frontendDir, '..')
const rootEnvPath = path.join(rootDir, '.env')
const artifactsDir = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'cleanup')
const resultPath = path.join(artifactsDir, 'result.json')
const accountsLedgerPath = path.join(rootDir, '.codex-artifacts', 'ios-e2e', 'accounts.ndjson')

let apiBaseUrl = ''
const nativeOriginForKeyCheck = process.env.IOS_NATIVE_ORIGIN || 'capacitor://localhost'
const gcpProjectForNativeKey = process.env.IOS_GCP_PROJECT_ID || 'jualuma-dev'
const nativeKeyDisplayNameRegex =
  process.env.IOS_NATIVE_IDENTITY_KEY_REGEX ||
  '(ios|android).*(e2e|identitytoolkit)|identitytoolkit.*(ios|android)'

function loadEnvFallback(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    if (process.env[key]) continue
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function run(command, args, cwd = rootDir) {
  return execFileSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function hasCommand(command) {
  try {
    run('which', [command])
    return true
  } catch {
    return false
  }
}

async function verifyProvidedApiKeyForOrigin(apiKey, origin) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: origin,
    },
    body: JSON.stringify({
      email: 'invalid',
      password: 'x',
      returnSecureToken: true,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  const message = String(payload?.error?.message || '')
  if (message === 'INVALID_EMAIL') return
  if (message.includes('API key expired') || message.includes('Requests from referer')) {
    throw new Error(`Provided API key is not valid for origin '${origin}': ${message}`)
  }
  throw new Error(`Provided API key did not pass origin verification '${origin}': ${message || response.status}`)
}

function listCandidateNativeApiKeys(projectId, displayRegex) {
  if (!hasCommand('gcloud')) {
    throw new Error('gcloud CLI is required to auto-discover iOS native auth API keys.')
  }
  const raw = run(
    'gcloud',
    [
      'services',
      'api-keys',
      'list',
      '--project',
      projectId,
      '--format=json(name,displayName,restrictions)',
    ],
    rootDir,
  )
  const keys = JSON.parse(raw)
  const nameRegex = new RegExp(displayRegex, 'i')
  const requiredTargets = new Set(['identitytoolkit.googleapis.com', 'securetoken.googleapis.com'])
  return keys
    .filter((key) => nameRegex.test(String(key.displayName || '')))
    .filter((key) => {
      const restrictions = key.restrictions || {}
      const targets = new Set((restrictions.apiTargets || []).map((item) => item.service))
      const hasAllTargets = [...requiredTargets].every((service) => targets.has(service))
      if (!hasAllTargets) return false
      return !(
        restrictions.browserKeyRestrictions ||
        restrictions.serverKeyRestrictions ||
        restrictions.androidKeyRestrictions ||
        restrictions.iosKeyRestrictions
      )
    })
}

function getKeyString(projectId, keyName) {
  return run(
    'gcloud',
    [
      'services',
      'api-keys',
      'get-key-string',
      keyName,
      '--project',
      projectId,
      '--format=value(keyString)',
    ],
    rootDir,
  )
}

async function resolveNativeApiKey() {
  if (process.env.IOS_NATIVE_GCP_API_KEY) {
    await verifyProvidedApiKeyForOrigin(process.env.IOS_NATIVE_GCP_API_KEY, nativeOriginForKeyCheck)
    return process.env.IOS_NATIVE_GCP_API_KEY
  }

  if (process.env.VITE_GCP_API_KEY) {
    try {
      await verifyProvidedApiKeyForOrigin(process.env.VITE_GCP_API_KEY, nativeOriginForKeyCheck)
      return process.env.VITE_GCP_API_KEY
    } catch {
      // fall through to discovery
    }
  }

  const candidates = listCandidateNativeApiKeys(gcpProjectForNativeKey, nativeKeyDisplayNameRegex)
  if (!candidates.length) {
    throw new Error(
      `No native-capable Identity API key candidates found in project '${gcpProjectForNativeKey}'. Set IOS_NATIVE_GCP_API_KEY.`,
    )
  }
  const key = getKeyString(gcpProjectForNativeKey, candidates[0].name)
  await verifyProvidedApiKeyForOrigin(key, nativeOriginForKeyCheck)
  return key
}

function loadLedgerEntries() {
  if (!fs.existsSync(accountsLedgerPath)) return []
  const lines = fs.readFileSync(accountsLedgerPath, 'utf8').split('\n').filter(Boolean)
  const parsed = []
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line))
    } catch {
      // ignore malformed lines
    }
  }
  return parsed
}

function writeLedgerEntries(entries) {
  fs.mkdirSync(path.dirname(accountsLedgerPath), { recursive: true })
  const body = entries.map((entry) => JSON.stringify(entry)).join('\n')
  fs.writeFileSync(accountsLedgerPath, body ? `${body}\n` : '')
}

async function signInIdentity(email, password, apiKey) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.idToken) {
    const message = String(payload?.error?.message || '')
    return { ok: false, message }
  }
  return { ok: true, idToken: String(payload.idToken) }
}

async function deleteBackendAccount(idToken) {
  const response = await fetch(`${apiBaseUrl}/api/users/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (response.status === 204) {
    return { ok: true }
  }
  if (response.status === 401 || response.status === 404) {
    return { ok: true, alreadyMissing: true }
  }
  const body = await response.text().catch(() => '')
  return { ok: false, status: response.status, body }
}

async function main() {
  loadEnvFallback(rootEnvPath)
  fs.mkdirSync(artifactsDir, { recursive: true })
  apiBaseUrl = (process.env.IOS_API_BASE_URL || process.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

  if (!apiBaseUrl || !apiBaseUrl.startsWith('http')) {
    throw new Error('VITE_API_BASE_URL (or IOS_API_BASE_URL) must be set to an absolute backend URL.')
  }

  const apiKey = await resolveNativeApiKey()
  const entries = loadLedgerEntries()
  const candidates = entries.filter((entry) => String(entry?.source || '').startsWith('ios-method-e2e-'))

  const seen = new Set()
  const targets = []
  for (let idx = candidates.length - 1; idx >= 0; idx -= 1) {
    const candidate = candidates[idx]
    const email = String(candidate?.email || '').toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    targets.push(candidate)
  }

  const result = {
    startedAt: new Date().toISOString(),
    status: 'passed',
    apiBaseUrl,
    attempted: targets.length,
    deleted: [],
    skipped: [],
    failed: [],
  }

  for (const account of targets) {
    const email = String(account.email || '')
    const password = String(account.password || '')
    if (!email || !password) {
      result.skipped.push({ email, reason: 'missing_credentials' })
      continue
    }

    const signIn = await signInIdentity(email, password, apiKey)
    if (!signIn.ok) {
      if (signIn.message.includes('EMAIL_NOT_FOUND') || signIn.message.includes('INVALID_LOGIN_CREDENTIALS')) {
        result.skipped.push({ email, reason: signIn.message || 'identity_not_found' })
        continue
      }
      result.failed.push({ email, step: 'identity_signin', error: signIn.message || 'unknown_signin_error' })
      continue
    }

    const deleted = await deleteBackendAccount(signIn.idToken)
    if (deleted.ok) {
      result.deleted.push({ email, alreadyMissing: Boolean(deleted.alreadyMissing) })
      continue
    }
    result.failed.push({
      email,
      step: 'backend_delete',
      error: `status=${deleted.status} body=${deleted.body || ''}`.trim(),
    })
  }

  const deletedEmails = new Set(result.deleted.map((item) => item.email.toLowerCase()))
  const skippedEmails = new Set(result.skipped.map((item) => String(item.email || '').toLowerCase()))
  const remainingEntries = entries.filter((entry) => {
    const email = String(entry?.email || '').toLowerCase()
    if (!email) return true
    if (deletedEmails.has(email)) return false
    if (skippedEmails.has(email)) return false
    return true
  })
  writeLedgerEntries(remainingEntries)

  if (result.failed.length) {
    result.status = 'failed'
  }
  result.finishedAt = new Date().toISOString()
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`)

  if (result.failed.length) {
    throw new Error(`cleanup failed for ${result.failed.length} account(s)`)
  }

  process.stdout.write(
    `ios cleanup passed: attempted=${result.attempted} deleted=${result.deleted.length} skipped=${result.skipped.length}\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`ios cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
